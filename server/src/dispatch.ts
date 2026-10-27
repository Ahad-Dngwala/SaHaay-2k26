/**
 * server/src/dispatch.ts
 * Mission lifecycle: create → search → offer → lock → complete → redispatch.
 * All timer durations are divided by state.demoTimeScale for demo acceleration.
 */

import { randomUUID } from 'crypto';
import { state } from './state';
import { findAvailable, syncGrid } from './matching';
import { auditLog } from './audit';
import { Config } from './config-server';
import { broadcastToAll, broadcastToMission } from './ws';
import type { Mission, MissionStatus } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function scaledMs(seconds: number): number {
  return Math.round((seconds * 1000) / state.demoTimeScale);
}

function now(): number { return Date.now(); }

function updateMission(id: string, updates: Partial<Mission>): Mission {
  const m = state.missions.get(id);
  if (!m) throw new Error(`Mission ${id} not found`);
  const updated = { ...m, ...updates, updatedAt: now() };
  state.missions.set(id, updated);
  return updated;
}

// ── Create & Start Search ─────────────────────────────────────────────────────

export interface CreateMissionParams {
  patientLat: number;
  patientLon: number;
  addrId: number;
  flags: number;
  sosUid: string;
}

export function createMission(params: CreateMissionParams): Mission {
  syncGrid(state.ambulances);

  const id = randomUUID().split('-')[0]; // short ID

  const mission: Mission = {
    id,
    patientLat:     params.patientLat,
    patientLon:     params.patientLon,
    patientLatLive: params.patientLat,
    patientLonLive: params.patientLon,
    addrId:         params.addrId,
    flags:          params.flags,
    sosUid:         params.sosUid,
    status:         'SEARCHING',
    createdAt:      now(),
    updatedAt:      now(),
    currentRadiusM:  Config.SEARCH_RADIUS_M,
    searchStartedAt: now(),
    pendingOffers:  [],
    previousAmbulanceIds: [],
  };

  state.missions.set(id, mission);
  auditLog('MISSION_CREATED', { id, lat: params.patientLat, lon: params.patientLon, flags: params.flags });

  // Kick off first search ring
  _searchRing(id);

  return state.missions.get(id) ?? mission;
}

// ── Search Ring ───────────────────────────────────────────────────────────────

function _searchRing(missionId: string): void {
  const m = state.missions.get(missionId);
  if (!m || !['SEARCHING', 'REDISPATCH'].includes(m.status)) return;

  // Use patient's LIVE position for the search (per U1)
  const candidates = findAvailable(
    state.ambulances,
    m.patientLatLive,
    m.patientLonLive,
    m.currentRadiusM,
  );

  // Exclude previously used ambulances
  const eligible = candidates.filter(c => !m.previousAmbulanceIds.includes(c.id));

  if (eligible.length === 0) {
    // No candidates in this ring — schedule expansion
    _scheduleExpansion(missionId);
    return;
  }

  // Send offers to all eligible candidates in this ring (nearest-first)
  const offerIds = eligible.map(c => c.id);
  updateMission(missionId, {
    status: 'DISPATCHING',
    pendingOffers: offerIds,
    searchStartedAt: now(),
  });

  auditLog('OFFERS_SENT', { missionId, to: offerIds, radiusM: m.currentRadiusM });

  // Notify each candidate driver via WebSocket
  for (const candidate of eligible) {
    const ambu = state.ambulances.get(candidate.id);
    if (!ambu) continue;
    broadcastToAll({
      type: 'DRIVER_OFFER',
      ambulanceId: candidate.id,
      missionId,
      patientLat: m.patientLatLive,
      patientLon: m.patientLonLive,
      distanceM: Math.round(candidate.distM),
      addrId: m.addrId,
    });
  }

  // Notify citizen
  broadcastToMission(missionId, { type: 'MISSION_SEARCHING', missionId, radiusM: m.currentRadiusM });

  // For prototype demo: simulated driver accepts nearest offer after short 1.5s reaction delay
  const winnerCandidateId = eligible[0].id;
  const autoAcceptTimer = setTimeout(() => {
    const cur = state.missions.get(missionId);
    if (cur && cur.status === 'DISPATCHING' && cur.pendingOffers.includes(winnerCandidateId)) {
      acceptMission(missionId, winnerCandidateId);
    }
  }, scaledMs(1.5));
  if (autoAcceptTimer && (autoAcceptTimer as any).unref) (autoAcceptTimer as any).unref();

  // Schedule offer timeout → expansion if no one accepts
  _scheduleExpansion(missionId);
}

export function tryExpandNow(missionId: string): void {
  const timerItem = state.expansionTimers.get(missionId);
  if (timerItem) { clearTimeout(timerItem.timer); state.expansionTimers.delete(missionId); }
  _tryExpand(missionId);
}

function _scheduleExpansion(missionId: string): void {
  // Cancel any existing timer
  const existing = state.expansionTimers.get(missionId);
  if (existing) clearTimeout(existing.timer);

  const nominalDurationS = Config.EXPAND_AFTER_S;
  const delay = scaledMs(nominalDurationS);
  const startedAt = Date.now();

  const timer = setTimeout(() => {
    state.expansionTimers.delete(missionId);
    _tryExpand(missionId);
  }, delay);
  if (timer.unref) timer.unref();

  state.expansionTimers.set(missionId, {
    timer,
    startedAt,
    nominalDurationS,
  });
}



function _tryExpand(missionId: string): void {
  const m = state.missions.get(missionId);
  if (!m || !['SEARCHING', 'DISPATCHING', 'REDISPATCH'].includes(m.status)) return;

  // Cancel any outstanding offers
  const pendingOffers = [...m.pendingOffers];
  updateMission(missionId, { pendingOffers: [], status: 'SEARCHING' });

  for (const aid of pendingOffers) {
    broadcastToAll({ type: 'OFFER_CANCELLED', ambulanceId: aid, missionId });
  }

  const nextRadius = m.currentRadiusM * Config.EXPAND_FACTOR;

  if (nextRadius > Config.MAX_RADIUS_M) {
    updateMission(missionId, { status: 'FAILED' });
    auditLog('MISSION_FAILED', { missionId, reason: 'exhausted all radii' });
    broadcastToMission(missionId, { type: 'MISSION_FAILED', missionId });
    return;
  }

  updateMission(missionId, { currentRadiusM: nextRadius });
  auditLog('RADIUS_EXPANDED', { missionId, newRadiusM: nextRadius });
  broadcastToMission(missionId, { type: 'RADIUS_EXPANDED', missionId, radiusM: nextRadius });

  _searchRing(missionId);
}

// ── Accept (First-Accept Locks) ───────────────────────────────────────────────

export interface AcceptResult {
  won: boolean;
  missionId: string;
  ambulanceId: string;
}

/**
 * Called when a driver presses Accept.
 * Node is single-threaded: this is synchronously atomic — no race conditions.
 * Returns { won: true } for the winner, { won: false } for any late arrivals.
 */
export function acceptMission(missionId: string, ambulanceId: string): AcceptResult {
  const m = state.missions.get(missionId);

  // Must be in DISPATCHING and the offer must be pending
  if (!m || m.status !== 'DISPATCHING' || !m.pendingOffers.includes(ambulanceId)) {
    return { won: false, missionId, ambulanceId };
  }

  const ambu = state.ambulances.get(ambulanceId);
  if (!ambu || ambu.status !== 'AVAILABLE') {
    return { won: false, missionId, ambulanceId };
  }

  // LOCK the mission — this is the first-accept-wins point
  const loserIds = m.pendingOffers.filter(id => id !== ambulanceId);

  updateMission(missionId, {
    status: 'ASSIGNED',
    assignedAmbulanceId: ambulanceId,
    assignedAt: now(),
    pendingOffers: [],
  });

  // Cancel all other pending offers
  for (const loserId of loserIds) {
    broadcastToAll({ type: 'OFFER_CANCELLED', ambulanceId: loserId, missionId });
  }

  // Cancel expansion timer (mission is now locked)
  const timerItem = state.expansionTimers.get(missionId);
  if (timerItem) { clearTimeout(timerItem.timer); state.expansionTimers.delete(missionId); }

  // Update ambulance status
  state.ambulances.set(ambulanceId, { ...ambu, status: 'ENROUTE' });

  auditLog('MISSION_ASSIGNED', {
    missionId,
    ambulanceId,
    driverName: ambu.driverName,
    vehicleNo: ambu.vehicleNo,
    losersCancelled: loserIds.length,
  });

  // Notify citizen
  broadcastToMission(missionId, {
    type: 'MISSION_ASSIGNED',
    missionId,
    ambulanceId,
    driverName: ambu.driverName,
    vehicleNo: ambu.vehicleNo,
    ambLat: ambu.lat,
    ambLon: ambu.lon,
  });

  // Generate green corridor checkpoints
  _generateGreenCorridor(missionId);

  return { won: true, missionId, ambulanceId };
}

// ── Decline / Timeout ─────────────────────────────────────────────────────────

export function declineMission(missionId: string, ambulanceId: string): void {
  const m = state.missions.get(missionId);
  if (!m || m.status !== 'DISPATCHING') return;

  const remaining = m.pendingOffers.filter(id => id !== ambulanceId);
  updateMission(missionId, { pendingOffers: remaining });

  auditLog('OFFER_DECLINED', { missionId, ambulanceId });

  // If no more offers, re-expand immediately
  if (remaining.length === 0) {
    const timerItem = state.expansionTimers.get(missionId);
    if (timerItem) { clearTimeout(timerItem.timer); state.expansionTimers.delete(missionId); }
    _tryExpand(missionId);
  }
}

// ── Breakdown & Re-Dispatch ───────────────────────────────────────────────────

export function reportBreakdown(missionId: string, ambulanceId: string): void {
  const m = state.missions.get(missionId);
  if (!m || m.assignedAmbulanceId !== ambulanceId) return;

  const ambu = state.ambulances.get(ambulanceId);
  const breakdownLat = ambu?.lat ?? m.patientLatLive;
  const breakdownLon = ambu?.lon ?? m.patientLonLive;

  // Mark stranded ambulance
  if (ambu) state.ambulances.set(ambulanceId, { ...ambu, status: 'BREAKDOWN' });

  auditLog('BREAKDOWN_REPORTED', {
    missionId,
    ambulanceId,
    breakdownLat,
    breakdownLon,
    note: 'Replacement will be sent to PATIENT live location; breakdown site logged for crew recovery',
  });

  updateMission(missionId, {
    status: 'REDISPATCH',
    breakdownLat,
    breakdownLon,
    breakdownAmbulanceId: ambulanceId,
    previousAmbulanceIds: [...m.previousAmbulanceIds, ambulanceId],
    assignedAmbulanceId: undefined,
    pendingOffers: [],
    currentRadiusM: Config.SEARCH_RADIUS_M, // reset radius
    searchStartedAt: now(),
    // NOTE: search uses patientLatLive (live patient position), not breakdown location
  });

  broadcastToMission(missionId, {
    type: 'BREAKDOWN_REPORTED',
    missionId,
    breakdownLat,
    breakdownLon,
    message: 'Ambulance breakdown. Dispatching replacement to your location.',
  });

  // Immediately start new search from patient's live position
  _searchRing(missionId);
}

// ── Status Updates ────────────────────────────────────────────────────────────

export function updateMissionStatus(missionId: string, status: MissionStatus): Mission | null {
  const m = state.missions.get(missionId);
  if (!m) return null;
  const updated = updateMission(missionId, { status });
  auditLog('MISSION_STATUS', { missionId, status });
  broadcastToMission(missionId, { type: 'MISSION_STATUS', missionId, status });

  if (status === 'COMPLETED') {
    const ambu = m.assignedAmbulanceId ? state.ambulances.get(m.assignedAmbulanceId) : undefined;
    if (ambu) state.ambulances.set(ambu.id, { ...ambu, status: 'AVAILABLE' });
  }

  return updated;
}

// ── Patient Location Update ───────────────────────────────────────────────────

export function updatePatientLocation(missionId: string, lat: number, lon: number): void {
  updateMission(missionId, { patientLatLive: lat, patientLonLive: lon });
  broadcastToMission(missionId, { type: 'PATIENT_LOCATION', missionId, lat, lon });
}

// ── Green Corridor ────────────────────────────────────────────────────────────

function _generateGreenCorridor(missionId: string): void {
  const m = state.missions.get(missionId);
  if (!m || !m.assignedAmbulanceId) return;

  const ambu = state.ambulances.get(m.assignedAmbulanceId);
  if (!ambu) return;

  // Use known Ahmedabad junctions / major intersections along likely routes
  // In production this would come from real routing; here we pick nearby ones
  const JUNCTIONS = [
    { name: 'CG Road Junction',        lat: 23.0317, lon: 72.5579 },
    { name: 'Navrangpura Crossroads',   lat: 23.0330, lon: 72.5607 },
    { name: 'Ashram Road Circle',       lat: 23.0222, lon: 72.5804 },
    { name: 'BRTS Corridor South',      lat: 23.0100, lon: 72.5700 },
    { name: 'Vastrapur Lake Junction',  lat: 23.0387, lon: 72.5253 },
    { name: 'SG Highway Flyover',       lat: 23.0530, lon: 72.5200 },
    { name: 'Satellite Road Cross',     lat: 23.0170, lon: 72.5100 },
    { name: 'Thaltej Char Rasta',       lat: 23.0594, lon: 72.5105 },
    { name: 'Maninagar Crossroads',     lat: 22.9944, lon: 72.6036 },
    { name: '132 ft Ring Road Circle',  lat: 23.0650, lon: 72.5600 },
  ];

  // Select junctions roughly between ambulance and patient
  const patLat = m.patientLatLive;
  const patLon = m.patientLonLive;

  const checkpoints = JUNCTIONS
    .map(j => {
      const distM = haversineSimple(ambu.lat, ambu.lon, j.lat, j.lon);
      const distToPatient = haversineSimple(j.lat, j.lon, patLat, patLon);
      const ambToPatient  = haversineSimple(ambu.lat, ambu.lon, patLat, patLon);
      return { ...j, distM, distToPatient, ambToPatient };
    })
    // Only junctions closer to patient than ambulance is, and within 5 km
    .filter(j => j.distToPatient < j.ambToPatient && j.distM < 5000)
    .sort((a, b) => a.distM - b.distM)
    .slice(0, 4) // max 4 checkpoints for clarity
    .map((j, idx) => ({
      name: j.name,
      lat: j.lat,
      lon: j.lon,
      distanceFromPatientM: Math.round(j.distToPatient),
      etaS: Math.round((j.distM / 1000) / 40 * 3600), // rough ETA at 40 km/h
      alerted: false,
    }));

  updateMission(missionId, { routeCheckpoints: checkpoints });
  auditLog('GREEN_CORRIDOR_COMPUTED', {
    missionId,
    checkpoints: checkpoints.map(c => c.name),
    disclaimer: 'ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (Simulated - No Direct Signal Actuation)',
  });

  // Broadcast to authority/control clients
  broadcastToAll({
    type: 'GREEN_CORRIDOR_UPDATE',
    missionId,
    ambulanceId: ambu.id,
    checkpoints,
    disclaimer: 'ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (Simulated - No Direct Signal Actuation)',
  });
}

/**
 * Rescales all active timers when Demo Director changes demoTimeScale.
 * Solves Q8: existing timers are dynamically rescheduled according to the new scale.
 */
export function setDemoTimeScale(newScale: number): void {
  if (newScale < 1) throw new Error('Scale must be >= 1');
  const oldScale = state.demoTimeScale;
  if (oldScale === newScale) return;

  const nowMs = Date.now();
  state.demoTimeScale = newScale;

  for (const [missionId, item] of Array.from(state.expansionTimers.entries())) {
    clearTimeout(item.timer);
    // Calculate elapsed nominal seconds
    const elapsedNominalS = ((nowMs - item.startedAt) / 1000) * oldScale;
    const remainingNominalS = Math.max(0, item.nominalDurationS - elapsedNominalS);

    if (remainingNominalS <= 0.1) {
      state.expansionTimers.delete(missionId);
      _tryExpand(missionId);
    } else {
      const delayMs = Math.round((remainingNominalS * 1000) / newScale);
      const newTimer = setTimeout(() => {
        state.expansionTimers.delete(missionId);
        _tryExpand(missionId);
      }, delayMs);
      if (newTimer.unref) newTimer.unref();
      state.expansionTimers.set(missionId, {
        timer: newTimer,
        startedAt: nowMs,
        nominalDurationS: remainingNominalS,
      });
    }
  }
}

function haversineSimple(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Re-export Config for external use
import { Config as _Config } from './config-server';
export { _Config as Config };
