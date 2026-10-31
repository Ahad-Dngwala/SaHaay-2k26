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
import { broadcastToAll, broadcastToMission, sendToAmbulance } from './ws';
import type { Mission, MissionStatus } from './types';
import { defaultRoutingProvider, computeHaversineRouteSync } from './routing';
import { selectRouteSignals, updateCorridorProgress, cancelCorridorCheckpoints, RouteCheckpoint } from './green-corridor';

// ── Helpers ──────────────────────────────────────────────────────────────────

function scaledMs(seconds: number): number {
  return Math.round((seconds * 1000) / state.demoTimeScale);
}

function now(): number { return Date.now(); }

const offerTimers = new Map<string, NodeJS.Timeout>();

export function clearOfferTimers(missionId?: string, ambuId?: string): void {
  if (missionId && ambuId) {
    const key = `${missionId}:${ambuId}`;
    const t = offerTimers.get(key);
    if (t) { clearTimeout(t); offerTimers.delete(key); }
  } else if (missionId) {
    for (const [key, t] of Array.from(offerTimers.entries())) {
      if (key.startsWith(`${missionId}:`)) {
        clearTimeout(t);
        offerTimers.delete(key);
      }
    }
  } else {
    for (const t of offerTimers.values()) {
      clearTimeout(t);
    }
    offerTimers.clear();
  }
}

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

  clearOfferTimers(missionId);

  // Send offers to all eligible candidates in this ring (nearest-first)
  const offerIds = eligible.map(c => c.id);
  updateMission(missionId, {
    status: 'DISPATCHING',
    pendingOffers: offerIds,
    searchStartedAt: now(),
  });

  auditLog('OFFERS_SENT', { missionId, to: offerIds, radiusM: m.currentRadiusM });

  // Notify each candidate driver via WebSocket and set TTL
  for (const candidate of eligible) {
    const ambu = state.ambulances.get(candidate.id);
    if (!ambu) continue;
    sendToAmbulance(candidate.id, {
      type: 'DRIVER_OFFER',
      ambulanceId: candidate.id,
      missionId,
      patientLat: m.patientLatLive,
      patientLon: m.patientLonLive,
      distanceM: Math.round(candidate.distM),
      addrId: m.addrId,
      ttlS: Config.OFFER_TTL_S,
    });

    // Schedule per-driver offer TTL timer (25s scaled)
    const offerKey = `${missionId}:${candidate.id}`;
    const ttlDelay = scaledMs(Config.OFFER_TTL_S);
    const ttlTimer = setTimeout(() => {
      offerTimers.delete(offerKey);
      handleOfferTimeout(missionId, candidate.id);
    }, ttlDelay);
    if (ttlTimer.unref) ttlTimer.unref();
    offerTimers.set(offerKey, ttlTimer);
  }

  // Notify citizen
  broadcastToMission(missionId, { type: 'MISSION_SEARCHING', missionId, radiusM: m.currentRadiusM });

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

  clearOfferTimers(missionId);

  // Cancel any outstanding offers
  const pendingOffers = [...m.pendingOffers];
  updateMission(missionId, { pendingOffers: [], status: 'SEARCHING' });

  for (const aid of pendingOffers) {
    sendToAmbulance(aid, { type: 'OFFER_CANCELLED', ambulanceId: aid, missionId });
  }

  const nextRadius = m.currentRadiusM * Config.EXPAND_FACTOR;

  if (nextRadius > Config.MAX_RADIUS_M) {
    updateMission(missionId, { status: 'FAILED' });
    auditLog('MISSION_FAILED', {
      missionId,
      reason: 'exhausted all radii',
      instructions: 'No ambulances available within 8 km. Please dial 108 or 112 immediately.',
    });
    broadcastToMission(missionId, {
      type: 'MISSION_FAILED',
      missionId,
      reason: 'No ambulances available within 8 km',
      emergencyInstructions: 'No ambulances available within reach. Please dial 108 (Ambulance) or 112 (National Emergency) immediately.',
    });
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

  // Clear offer timers for this mission
  clearOfferTimers(missionId);
  stallTrackers.delete(ambulanceId);

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
    sendToAmbulance(loserId, { type: 'OFFER_CANCELLED', ambulanceId: loserId, missionId });
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

// ── Decline & Offer TTL ───────────────────────────────────────────────────────

export function declineMission(missionId: string, ambulanceId: string): void {
  const m = state.missions.get(missionId);
  if (!m || m.status !== 'DISPATCHING') return;

  clearOfferTimers(missionId, ambulanceId);

  const remaining = m.pendingOffers.filter(id => id !== ambulanceId);
  const prev = m.previousAmbulanceIds.includes(ambulanceId)
    ? m.previousAmbulanceIds
    : [...m.previousAmbulanceIds, ambulanceId];

  updateMission(missionId, { pendingOffers: remaining, previousAmbulanceIds: prev });

  auditLog('OFFER_DECLINED', { missionId, ambulanceId });

  // Early expansion if all drivers in current ring declined or timed out
  if (remaining.length === 0) {
    const timerItem = state.expansionTimers.get(missionId);
    if (timerItem) { clearTimeout(timerItem.timer); state.expansionTimers.delete(missionId); }
    _tryExpand(missionId);
  }
}

export function handleOfferTimeout(missionId: string, ambulanceId: string): void {
  const m = state.missions.get(missionId);
  if (!m || m.status !== 'DISPATCHING') return;
  if (!m.pendingOffers.includes(ambulanceId)) return;

  clearOfferTimers(missionId, ambulanceId);

  const remaining = m.pendingOffers.filter(id => id !== ambulanceId);
  const prev = m.previousAmbulanceIds.includes(ambulanceId)
    ? m.previousAmbulanceIds
    : [...m.previousAmbulanceIds, ambulanceId];

  updateMission(missionId, { pendingOffers: remaining, previousAmbulanceIds: prev });

  auditLog('OFFER_TTL_EXPIRED', {
    missionId,
    ambulanceId,
    note: 'Driver did not respond within TTL (recorded for driver trust score)',
  });

  sendToAmbulance(ambulanceId, {
    type: 'OFFER_CANCELLED',
    ambulanceId,
    missionId,
    reason: 'TTL_EXPIRED',
  });

  // Early expansion if all offers expired/declined
  if (remaining.length === 0) {
    const timerItem = state.expansionTimers.get(missionId);
    if (timerItem) { clearTimeout(timerItem.timer); state.expansionTimers.delete(missionId); }
    _tryExpand(missionId);
  }
}

// ── Driver Cancellation ───────────────────────────────────────────────────────

export function driverCancelMission(
  missionId: string,
  ambulanceId: string,
  reason: string
): { ok: boolean; error?: string } {
  if (!reason || !reason.trim()) {
    return { ok: false, error: 'Reason is required for driver cancellation' };
  }
  const m = state.missions.get(missionId);
  if (!m) return { ok: false, error: 'Mission not found' };
  if (m.assignedAmbulanceId !== ambulanceId) {
    return { ok: false, error: 'Ambulance is not assigned to this mission' };
  }

  clearOfferTimers(missionId);
  stallTrackers.delete(ambulanceId);

  const ambu = state.ambulances.get(ambulanceId);
  if (ambu) {
    state.ambulances.set(ambulanceId, { ...ambu, status: 'AVAILABLE' });
  }

  auditLog('DRIVER_CANCELLED', {
    missionId,
    ambulanceId,
    reason,
    note: 'Driver released back to AVAILABLE, excluded from this mission. Redispatching from live patient location.',
  });

  sendToAmbulance(ambulanceId, {
    type: 'MISSION_CANCELLED',
    missionId,
    reason,
    message: 'You have cancelled this mission.',
  });

  broadcastToMission(missionId, {
    type: 'DRIVER_CANCELLED',
    missionId,
    ambulanceId,
    reason,
    message: 'Assigned driver cancelled. Finding replacement ambulance...',
  });

  // Cancel any active expansion timer
  const timerItem = state.expansionTimers.get(missionId);
  if (timerItem) {
    clearTimeout(timerItem.timer);
    state.expansionTimers.delete(missionId);
  }

  // Cancel any active green corridor checkpoints
  if (m.routeCheckpoints && m.routeCheckpoints.length > 0) {
    cancelCorridorCheckpoints(missionId, m.routeCheckpoints as RouteCheckpoint[], `Driver cancelled: ${reason}`);
  }

  updateMission(missionId, {
    status: 'REDISPATCH',
    routeCheckpoints: undefined,
    previousAmbulanceIds: [...m.previousAmbulanceIds, ambulanceId],
    assignedAmbulanceId: undefined,
    pendingOffers: [],
    currentRadiusM: Config.SEARCH_RADIUS_M,
    searchStartedAt: now(),
  });

  _searchRing(missionId);
  return { ok: true };
}

// ── Patient Cancellation ("I'm Safe") ─────────────────────────────────────────

export function cancelMissionByPatient(
  missionId: string,
  reason = "Patient marked safe"
): { ok: boolean; error?: string } {
  const m = state.missions.get(missionId);
  if (!m) return { ok: false, error: 'Mission not found' };

  const cancelableStates: MissionStatus[] = ['SEARCHING', 'DISPATCHING', 'ASSIGNED', 'REDISPATCH'];
  if (!cancelableStates.includes(m.status)) {
    return { ok: false, error: `Cannot cancel mission in status ${m.status}` };
  }

  clearOfferTimers(missionId);

  const timerItem = state.expansionTimers.get(missionId);
  if (timerItem) {
    clearTimeout(timerItem.timer);
    state.expansionTimers.delete(missionId);
  }

  // Cancel any pending offers to candidates
  for (const aid of m.pendingOffers) {
    sendToAmbulance(aid, {
      type: 'OFFER_CANCELLED',
      ambulanceId: aid,
      missionId,
      reason: 'Patient cancelled',
    });
  }

  // Release assigned ambulance if any
  if (m.assignedAmbulanceId) {
    stallTrackers.delete(m.assignedAmbulanceId);
    const ambu = state.ambulances.get(m.assignedAmbulanceId);
    if (ambu) {
      state.ambulances.set(m.assignedAmbulanceId, { ...ambu, status: 'AVAILABLE' });
    }
    sendToAmbulance(m.assignedAmbulanceId, {
      type: 'MISSION_CANCELLED',
      missionId,
      status: 'CANCELLED_BY_PATIENT',
      reason,
      message: 'Mission was cancelled by patient.',
    });
  }

  // Cancel any active green corridor checkpoints
  if (m.routeCheckpoints && m.routeCheckpoints.length > 0) {
    cancelCorridorCheckpoints(missionId, m.routeCheckpoints as RouteCheckpoint[], `Patient cancelled: ${reason}`);
  }

  updateMission(missionId, {
    status: 'CANCELLED_BY_PATIENT',
    routeCheckpoints: undefined,
    pendingOffers: [],
  });

  auditLog('MISSION_CANCELLED_BY_PATIENT', { missionId, reason });
  broadcastToMission(missionId, {
    type: 'MISSION_CANCELLED',
    missionId,
    status: 'CANCELLED_BY_PATIENT',
    reason,
  });

  return { ok: true };
}

// ── Breakdown & Re-Dispatch ───────────────────────────────────────────────────

export function reportBreakdown(missionId: string, ambulanceId: string): void {
  const m = state.missions.get(missionId);
  if (!m || m.assignedAmbulanceId !== ambulanceId) return;

  clearOfferTimers(missionId);
  stallTrackers.delete(ambulanceId);

  const ambu = state.ambulances.get(ambulanceId);
  const breakdownLat = ambu?.lat ?? m.patientLatLive;
  const breakdownLon = ambu?.lon ?? m.patientLonLive;

  // Mark stranded ambulance OUT_OF_SERVICE until an admin clears it
  if (ambu) state.ambulances.set(ambulanceId, { ...ambu, status: 'OUT_OF_SERVICE' });

  auditLog('BREAKDOWN_REPORTED', {
    missionId,
    ambulanceId,
    breakdownLat,
    breakdownLon,
    note: 'Ambulance marked OUT_OF_SERVICE. Replacement will be sent to PATIENT live location; breakdown site logged for crew recovery',
  });

  sendToAmbulance(ambulanceId, {
    type: 'AMBULANCE_OUT_OF_SERVICE',
    ambulanceId,
    missionId,
    breakdownLat,
    breakdownLon,
    message: 'Vehicle marked out of service. Breakdown coordinates logged for recovery.',
  });

  // Cancel active corridor checkpoints for the broken-down vehicle
  if (m.routeCheckpoints && m.routeCheckpoints.length > 0) {
    cancelCorridorCheckpoints(missionId, m.routeCheckpoints as RouteCheckpoint[], 'Ambulance breakdown');
  }

  updateMission(missionId, {
    status: 'REDISPATCH',
    routeCheckpoints: undefined,
    breakdownLat,
    breakdownLon,
    breakdownAmbulanceId: ambulanceId,
    previousAmbulanceIds: [...m.previousAmbulanceIds, ambulanceId],
    assignedAmbulanceId: undefined,
    pendingOffers: [],
    currentRadiusM: Config.SEARCH_RADIUS_M, // reset radius
    searchStartedAt: now(),
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

// ── Telemetry Stall Detection ─────────────────────────────────────────────────

export interface StallTracker {
  ambulanceId: string;
  missionId: string;
  stallStartedAt: number;
  promptSentAt?: number;
}

export const stallTrackers = new Map<string, StallTracker>();

export function recordTelemetry(
  ambulanceId: string,
  lat: number,
  lon: number,
  speedKmh: number,
  simulatedNowMs?: number
): void {
  const ambu = state.ambulances.get(ambulanceId);
  if (ambu) {
    state.ambulances.set(ambulanceId, {
      ...ambu,
      lat,
      lon,
      speedKmh,
    });
  }

  // Find if ambulance is assigned to an active mission
  const activeMission = Array.from(state.missions.values()).find(
    m => m.assignedAmbulanceId === ambulanceId && ['ASSIGNED', 'ENROUTE', 'ON_SCENE'].includes(m.status)
  );

  if (!activeMission) {
    stallTrackers.delete(ambulanceId);
    return;
  }

  // Progress Green Corridor checkpoints if any
  if (activeMission.routeCheckpoints && activeMission.routeCheckpoints.length > 0) {
    const { updatedCheckpoints } = updateCorridorProgress(
      activeMission.id,
      ambulanceId,
      lat,
      lon,
      speedKmh,
      activeMission.routeCheckpoints as RouteCheckpoint[]
    );
    updateMission(activeMission.id, { routeCheckpoints: updatedCheckpoints });
  }

  const distToPatient = haversineSimple(lat, lon, activeMission.patientLatLive, activeMission.patientLonLive);
  const isStalled = speedKmh < 3 && distToPatient > Config.STALL_MIN_DISTANCE_M;
  const currentTime = simulatedNowMs ?? now();

  if (!isStalled) {
    const existing = stallTrackers.get(ambulanceId);
    if (existing && existing.promptSentAt) {
      auditLog('STALL_RESOLVED', {
        ambulanceId,
        missionId: activeMission.id,
        speedKmh,
        distToPatient,
      });
      sendToAmbulance(ambulanceId, {
        type: 'STALL_RESOLVED',
        ambulanceId,
        missionId: activeMission.id,
        message: 'Normal speed resumed.',
      });
      broadcastToMission(activeMission.id, {
        type: 'STALL_RESOLVED',
        ambulanceId,
        missionId: activeMission.id,
      });
    }
    stallTrackers.delete(ambulanceId);
    return;
  }

  // Ambulance is stalled
  let tracker = stallTrackers.get(ambulanceId);
  if (!tracker) {
    tracker = {
      ambulanceId,
      missionId: activeMission.id,
      stallStartedAt: currentTime,
    };
    stallTrackers.set(ambulanceId, tracker);
    return;
  }

  const elapsedS = (currentTime - tracker.stallStartedAt) / 1000;
  const thresholdS = Config.STALL_THRESHOLD_S / state.demoTimeScale;
  const escalationS = Config.STALL_ESCALATION_S / state.demoTimeScale;

  if (elapsedS >= thresholdS && !tracker.promptSentAt) {
    tracker.promptSentAt = currentTime;
    auditLog('STALL_WARNING_ISSUED', {
      ambulanceId,
      missionId: activeMission.id,
      elapsedS,
      speedKmh,
      distToPatient,
    });
    sendToAmbulance(ambulanceId, {
      type: 'STALL_WARNING',
      missionId: activeMission.id,
      ambulanceId,
      message: 'Are you OK? Stationary vehicle detected. Tap to confirm or mission will redispatch.',
      timeoutS: Math.round(escalationS),
    });
    broadcastToMission(activeMission.id, {
      type: 'STALL_WARNING',
      missionId: activeMission.id,
      ambulanceId,
      message: 'Ambulance stall detected. Awaiting driver confirmation.',
    });
  } else if (tracker.promptSentAt && ((currentTime - tracker.promptSentAt) / 1000) >= escalationS) {
    auditLog('STALL_ESCALATED_REDISPATCH', {
      ambulanceId,
      missionId: activeMission.id,
      waitedS: (currentTime - tracker.promptSentAt) / 1000,
    });
    stallTrackers.delete(ambulanceId);
    reportBreakdown(activeMission.id, ambulanceId);
  }
}

export function driverAcknowledgeStall(ambulanceId: string): boolean {
  const tracker = stallTrackers.get(ambulanceId);
  if (!tracker) return false;
  auditLog('STALL_ACKNOWLEDGED_BY_DRIVER', { ambulanceId, missionId: tracker.missionId });
  stallTrackers.delete(ambulanceId);
  sendToAmbulance(ambulanceId, {
    type: 'STALL_RESOLVED',
    ambulanceId,
    missionId: tracker.missionId,
    message: 'Driver confirmed OK. Resuming mission.',
  });
  broadcastToMission(tracker.missionId, {
    type: 'STALL_RESOLVED',
    ambulanceId,
    missionId: tracker.missionId,
    message: 'Driver confirmed status.',
  });
  return true;
}

export function checkStallConditions(simulatedNowMs?: number): void {
  const currentTime = simulatedNowMs ?? now();
  for (const [ambulanceId, tracker] of Array.from(stallTrackers.entries())) {
    const m = state.missions.get(tracker.missionId);
    if (!m || m.assignedAmbulanceId !== ambulanceId || !['ASSIGNED', 'ENROUTE', 'ON_SCENE'].includes(m.status)) {
      stallTrackers.delete(ambulanceId);
      continue;
    }
    const elapsedS = (currentTime - tracker.stallStartedAt) / 1000;
    const thresholdS = Config.STALL_THRESHOLD_S / state.demoTimeScale;
    const escalationS = Config.STALL_ESCALATION_S / state.demoTimeScale;

    if (elapsedS >= thresholdS && !tracker.promptSentAt) {
      tracker.promptSentAt = currentTime;
      auditLog('STALL_WARNING_ISSUED', {
        ambulanceId,
        missionId: m.id,
        elapsedS,
      });
      sendToAmbulance(ambulanceId, {
        type: 'STALL_WARNING',
        missionId: m.id,
        ambulanceId,
        message: 'Are you OK? Stationary vehicle detected. Tap to confirm or mission will redispatch.',
        timeoutS: Math.round(escalationS),
      });
      broadcastToMission(m.id, {
        type: 'STALL_WARNING',
        missionId: m.id,
        ambulanceId,
        message: 'Ambulance stall detected. Awaiting driver confirmation.',
      });
    } else if (tracker.promptSentAt && ((currentTime - tracker.promptSentAt) / 1000) >= escalationS) {
      auditLog('STALL_ESCALATED_REDISPATCH', {
        ambulanceId,
        missionId: m.id,
        waitedS: (currentTime - tracker.promptSentAt) / 1000,
      });
      stallTrackers.delete(ambulanceId);
      reportBreakdown(m.id, ambulanceId);
    }
  }
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

export function generateGreenCorridorSync(missionId: string): RouteCheckpoint[] {
  const m = state.missions.get(missionId);
  if (!m || !m.assignedAmbulanceId) return [];

  const ambu = state.ambulances.get(m.assignedAmbulanceId);
  if (!ambu) return [];

  const route = computeHaversineRouteSync(
    { lat: ambu.lat, lon: ambu.lon },
    { lat: m.patientLatLive, lon: m.patientLonLive }
  );

  const checkpoints = selectRouteSignals(
    route.geometry,
    ambu.lat,
    ambu.lon,
    m.patientLatLive,
    m.patientLonLive,
    ambu.speedKmh || 35
  );

  updateMission(missionId, { routeCheckpoints: checkpoints });
  auditLog('GREEN_CORRIDOR_COMPUTED', {
    missionId,
    checkpointsCount: checkpoints.length,
    checkpoints: checkpoints.map(c => ({ id: c.id, name: c.name, etaS: c.etaS })),
    disclaimer: 'ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (No Direct Signal Actuation)',
  });

  // Broadcast to authority/control clients
  broadcastToAll({
    type: 'GREEN_CORRIDOR_UPDATE',
    missionId,
    ambulanceId: ambu.id,
    checkpoints,
    disclaimer: 'ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (No Direct Signal Actuation)',
  });

  return checkpoints;
}

export function generateGreenCorridor(missionId: string): RouteCheckpoint[] {
  return generateGreenCorridorSync(missionId);
}

function _generateGreenCorridor(missionId: string): void {
  generateGreenCorridorSync(missionId);
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
