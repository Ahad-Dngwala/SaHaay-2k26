/**
 * server/src/types.ts
 * Core domain types for the SaHaay in-memory dispatch server.
 */

export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHING' | 'ENROUTE' | 'ON_SCENE' | 'OFFLINE' | 'BREAKDOWN' | 'OUT_OF_SERVICE';

export interface Ambulance {
  id: string;
  driverName: string;
  vehicleNo: string;
  lat: number;
  lon: number;
  status: AmbulanceStatus;
  heading: number; // degrees, 0 = north
  speedKmh: number;
  zone: string; // Navrangpura, Maninagar, etc.
}

export type MissionStatus =
  | 'SEARCHING'      // ring search in progress
  | 'DISPATCHING'    // offer sent, awaiting accept
  | 'ASSIGNED'       // accepted, en route
  | 'ON_SCENE'       // at patient
  | 'TRANSPORTING'   // patient in ambulance
  | 'COMPLETED'      // mission done
  | 'REDISPATCH'     // breakdown, searching for replacement
  | 'FAILED'         // exhausted all radii
  | 'CANCELLED'      // cancelled
  | 'CANCELLED_BY_PATIENT'; // patient cancelled / safe

export interface Mission {
  id: string;
  patientLat: number;
  patientLon: number;
  /** Latest known patient lat (may differ from initial if patient moves) */
  patientLatLive: number;
  patientLonLive: number;
  addrId: number;
  flags: number; // 0=manual, 1=crash_auto
  sosUid: string;
  status: MissionStatus;
  createdAt: number; // ms
  updatedAt: number; // ms

  // Dispatch state
  currentRadiusM: number;
  searchStartedAt: number; // ms - when current ring search started
  pendingOffers: string[]; // ambulance IDs with outstanding offers

  // Assignment
  assignedAmbulanceId?: string;
  assignedAt?: number;

  // Breakdown re-dispatch
  breakdownLat?: number;
  breakdownLon?: number;
  breakdownAmbulanceId?: string;
  previousAmbulanceIds: string[];

  // Route for green corridor
  routeCheckpoints?: GreenCorridorCheckpoint[];
}

export interface GreenCorridorCheckpoint {
  name: string;
  lat: number;
  lon: number;
  distanceFromPatientM: number;
  etaS: number; // estimated seconds to reach from current ambulance pos
  alerted: boolean;
}

export interface AuditEntry {
  index: number;
  timestamp: number; // ms
  event: string;
  data: unknown;
  prevHash: string;
  hash: string; // SHA-256 of prevHash+timestamp+event+JSON(data)
}

export interface WsClientMeta {
  role: 'citizen' | 'driver' | 'control' | 'authority';
  /** Mission ID for citizen/driver, undefined for control/authority */
  missionId?: string;
  /** Driver's ambulance ID, undefined for others */
  ambulanceId?: string;
}
