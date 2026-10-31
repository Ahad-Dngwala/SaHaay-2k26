/**
 * server/src/green-corridor.ts
 * Real route-aware Green Corridor advisory pre-clearance engine.
 * Spec Section 6: Advisory pre-clearance notifications to traffic authorities.
 * No direct traffic-signal actuation.
 */

import fs from 'fs';
import path from 'path';
import { Config } from './config-server';
import { auditLog } from './audit';
import { broadcastToAll, broadcastToMission } from './ws';

export type SignalLifecycleState = 'PLANNED' | 'ALERTED' | 'PASSED' | 'CANCELLED';

export interface TrafficSignal {
  id: string;
  name: string;
  lat: number;
  lon: number;
  area: string;
  source: string;
  fetchedAt: string;
}

export interface RouteCheckpoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  area: string;
  distanceFromPatientM: number;
  distanceAlongRouteM: number;
  etaS: number;
  confidenceWindowS: number;
  state: SignalLifecycleState;
  alerted: boolean;
  alertedAt?: number;
  passedAt?: number;
}

export interface TrafficAuthority {
  id: string;
  name: string;
  area: string;
  bbox?: [number, number, number, number]; // [south, west, north, east]
  contactPhone: string;
  contactEmail: string;
  webhookUrl?: string;
  isActive: boolean;
}

// In-memory authority registry
export const registeredAuthorities: TrafficAuthority[] = [
  {
    id: 'auth-west',
    name: 'Ahmedabad Traffic Police (West Division - Navrangpura/Satellite)',
    area: 'Ahmedabad West',
    bbox: [23.00, 72.50, 23.08, 72.56],
    contactPhone: '+917926301234',
    contactEmail: 'traffic.west@ahmedabadpolice.gov.in',
    isActive: true,
  },
  {
    id: 'auth-central',
    name: 'Ahmedabad Traffic Police (Central Division - Ashram Rd/Paldi)',
    area: 'Ahmedabad Central',
    bbox: [23.01, 72.56, 23.06, 72.59],
    contactPhone: '+917925501234',
    contactEmail: 'traffic.central@ahmedabadpolice.gov.in',
    isActive: true,
  },
  {
    id: 'auth-north',
    name: 'Ahmedabad Traffic Police (North Division - Asarwa/Civil)',
    area: 'Ahmedabad North',
    bbox: [23.04, 72.57, 23.10, 72.63],
    contactPhone: '+917922861234',
    contactEmail: 'traffic.north@ahmedabadpolice.gov.in',
    isActive: true,
  },
];

let signalsDataset: TrafficSignal[] = [];

export function loadSignalsDataset(): TrafficSignal[] {
  if (signalsDataset.length > 0) return signalsDataset;
  try {
    const filePath = path.resolve(__dirname, '../../data/signals.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      signalsDataset = JSON.parse(raw);
    }
  } catch (err: any) {
    console.warn('Failed to load data/signals.json:', err.message);
  }
  return signalsDataset;
}

// ── Geometry Helpers ──────────────────────────────────────────────────────────

export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance from point P to line segment AB in metres */
function distToSegmentM(
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number
): number {
  const abDist = haversineDistanceM(aLat, aLon, bLat, bLon);
  if (abDist < 1) return haversineDistanceM(pLat, pLon, aLat, aLon);

  // Vector projection
  const apDist = haversineDistanceM(aLat, aLon, pLat, pLon);
  const bpDist = haversineDistanceM(bLat, bLon, pLat, pLon);

  // If projection falls outside segment:
  if (bpDist ** 2 > abDist ** 2 + apDist ** 2) return apDist;
  if (apDist ** 2 > abDist ** 2 + bpDist ** 2) return bpDist;

  // Triangular area / base = perpendicular height
  const s = (abDist + apDist + bpDist) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - abDist) * (s - apDist) * (s - bpDist)));
  return (2 * area) / abDist;
}

/** Minimum distance from a point to a polyline */
export function distanceToPolylineM(lat: number, lon: number, polyline: [number, number][]): number {
  if (polyline.length < 2) return polyline.length === 1 ? haversineDistanceM(lat, lon, polyline[0][0], polyline[0][1]) : Infinity;
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distToSegmentM(lat, lon, polyline[i][0], polyline[i][1], polyline[i + 1][0], polyline[i + 1][1]);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// ── Route-Aware Corridor Selection ───────────────────────────────────────────

export function selectRouteSignals(
  routePolyline: [number, number][],
  ambulanceLat: number,
  ambulanceLon: number,
  patientLat: number,
  patientLon: number,
  speedKmh = 35
): RouteCheckpoint[] {
  const allSignals = loadSignalsDataset();
  const speedMps = Math.max(speedKmh, 20) * (1000 / 3600); // minimum 20 km/h baseline

  const selected: RouteCheckpoint[] = [];

  for (const sig of allSignals) {
    // 1. Must be within 25m of the route polyline (Spec Section 6.2)
    const distToLineM = distanceToPolylineM(sig.lat, sig.lon, routePolyline);
    if (distToLineM > 25) continue;

    // 2. Compute distance along route from ambulance to signal
    const distFromAmbulanceM = haversineDistanceM(ambulanceLat, ambulanceLon, sig.lat, sig.lon);
    const distFromPatientM = haversineDistanceM(sig.lat, sig.lon, patientLat, patientLon);

    // Calculate approximate ETA based on route distance
    const etaS = Math.round(distFromAmbulanceM / speedMps);
    const confidenceWindowS = Math.round(etaS * 0.15); // +/- 15% window

    selected.push({
      id: sig.id,
      name: sig.name,
      lat: sig.lat,
      lon: sig.lon,
      area: sig.area,
      distanceFromPatientM: Math.round(distFromPatientM),
      distanceAlongRouteM: Math.round(distFromAmbulanceM),
      etaS,
      confidenceWindowS,
      state: etaS <= Config.GREEN_CORRIDOR_LEAD_S ? 'ALERTED' : 'PLANNED',
      alerted: etaS <= Config.GREEN_CORRIDOR_LEAD_S,
      alertedAt: etaS <= Config.GREEN_CORRIDOR_LEAD_S ? Date.now() : undefined,
    });
  }

  // Order checkpoints along the route by distance ahead
  return selected.sort((a, b) => a.distanceAlongRouteM - b.distanceAlongRouteM);
}

// ── In-Flight Signal Lifecycle Evaluator ──────────────────────────────────────

export function updateCorridorProgress(
  missionId: string,
  ambulanceId: string,
  ambulanceLat: number,
  ambulanceLon: number,
  speedKmh: number,
  checkpoints: RouteCheckpoint[]
): { updatedCheckpoints: RouteCheckpoint[]; newlyAlerted: RouteCheckpoint[]; newlyPassed: RouteCheckpoint[] } {
  const speedMps = Math.max(speedKmh, 15) * (1000 / 3600);
  const nowMs = Date.now();

  const newlyAlerted: RouteCheckpoint[] = [];
  const newlyPassed: RouteCheckpoint[] = [];

  const updatedCheckpoints = checkpoints.map(cp => {
    if (cp.state === 'PASSED' || cp.state === 'CANCELLED') {
      return cp;
    }

    const distToSignalM = haversineDistanceM(ambulanceLat, ambulanceLon, cp.lat, cp.lon);
    const updatedEtaS = Math.round(distToSignalM / speedMps);

    // 1. Check if ambulance has reached or passed signal (<= 30 m)
    if (distToSignalM <= 30) {
      newlyPassed.push({ ...cp, state: 'PASSED', passedAt: nowMs, distanceAlongRouteM: distToSignalM, etaS: 0 });
      return {
        ...cp,
        state: 'PASSED' as SignalLifecycleState,
        passedAt: cp.passedAt || nowMs,
        distanceAlongRouteM: Math.round(distToSignalM),
        etaS: 0,
      };
    }

    // 2. Check if ambulance is within lead time (<= GREEN_CORRIDOR_LEAD_S, default 60s)
    if (updatedEtaS <= Config.GREEN_CORRIDOR_LEAD_S && cp.state === 'PLANNED') {
      newlyAlerted.push({ ...cp, state: 'ALERTED', alerted: true, alertedAt: nowMs, etaS: updatedEtaS });
      return {
        ...cp,
        state: 'ALERTED' as SignalLifecycleState,
        alerted: true,
        alertedAt: nowMs,
        distanceAlongRouteM: Math.round(distToSignalM),
        etaS: updatedEtaS,
      };
    }

    return {
      ...cp,
      distanceAlongRouteM: Math.round(distToSignalM),
      etaS: updatedEtaS,
    };
  });

  // Handle newly alerted signals
  for (const sig of newlyAlerted) {
    auditLog('SIGNAL_ALERTED', {
      missionId,
      ambulanceId,
      signalId: sig.id,
      name: sig.name,
      etaS: sig.etaS,
      leadTimeS: Config.GREEN_CORRIDOR_LEAD_S,
      disclaimer: 'ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (No Direct Signal Actuation)',
    });

    broadcastToAll({
      type: 'GREEN_CORRIDOR_ALERT',
      missionId,
      ambulanceId,
      signal: sig,
      disclaimer: 'ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (No Direct Signal Actuation)',
    });
  }

  // Handle passed signals
  for (const sig of newlyPassed) {
    auditLog('SIGNAL_PASSED', {
      missionId,
      ambulanceId,
      signalId: sig.id,
      name: sig.name,
    });

    broadcastToMission(missionId, {
      type: 'GREEN_CORRIDOR_PASSED',
      missionId,
      signalId: sig.id,
      name: sig.name,
    });
  }

  return { updatedCheckpoints, newlyAlerted, newlyPassed };
}

export function cancelCorridorCheckpoints(
  missionId: string,
  checkpoints: RouteCheckpoint[],
  reason: string
): RouteCheckpoint[] {
  const cancelled = checkpoints.map(cp => {
    if (cp.state === 'PASSED') return cp;
    return { ...cp, state: 'CANCELLED' as SignalLifecycleState };
  });

  auditLog('GREEN_CORRIDOR_CANCELLED', { missionId, reason });
  broadcastToMission(missionId, {
    type: 'GREEN_CORRIDOR_CANCELLED',
    missionId,
    reason,
  });

  return cancelled;
}

// ── Authority-Scoped Filtering ────────────────────────────────────────────────

export function filterSignalsForAuthority(
  authorityId: string,
  checkpoints: RouteCheckpoint[]
): RouteCheckpoint[] {
  const auth = registeredAuthorities.find(a => a.id === authorityId);
  if (!auth) return [];

  return checkpoints.filter(cp => {
    if (auth.area && cp.area === auth.area) return true;
    if (auth.bbox) {
      const [south, west, north, east] = auth.bbox;
      return cp.lat >= south && cp.lat <= north && cp.lon >= west && cp.lon <= east;
    }
    return false;
  });
}
