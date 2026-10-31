/**
 * mobile-app/src/types.ts
 * Domain types matching SaHaay server and UI state.
 */

export type AppRole = 'citizen' | 'driver';

export type CitizenTab = 'home' | 'track' | 'activity' | 'profile';
export type DriverTab = 'missions' | 'navigate' | 'activity' | 'profile';

export type MissionStatus =
  | 'SEARCHING'      // ring search in progress
  | 'DISPATCHING'    // offer sent, awaiting accept
  | 'ASSIGNED'       // accepted, en route
  | 'ON_SCENE'       // arrived at patient
  | 'TRANSPORTING'   // patient in ambulance
  | 'COMPLETED'      // mission finished
  | 'REDISPATCH'     // breakdown reported, searching replacement
  | 'FAILED'         // exhausted all radii
  | 'CANCELLED';     // patient cancelled

export interface Mission {
  id: string;
  patientLat: number;
  patientLon: number;
  patientLatLive: number;
  patientLonLive: number;
  addrId: number;
  flags: number;
  sosUid: string;
  status: MissionStatus;
  createdAt: number;
  updatedAt: number;
  currentRadiusM: number;
  searchStartedAt: number;
  pendingOffers: string[];
  assignedAmbulanceId?: string;
  assignedAt?: number;
  breakdownLat?: number;
  breakdownLon?: number;
  breakdownAmbulanceId?: string;
  previousAmbulanceIds: string[];
  // Extended UI fields
  localityName?: string;
  patientName?: string;
  patientAge?: number;
  vitals?: {
    spO2: number;
    bp: string;
    pulse: number;
  };
  incidentDiagnosis?: string;
  priorityLabel?: string;
  distanceKm?: number;
  etaMinutes?: number;
}

export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHING' | 'ENROUTE' | 'ON_SCENE' | 'OFFLINE' | 'BREAKDOWN';

export interface Ambulance {
  id: string;
  driverName: string;
  vehicleNo: string;
  lat: number;
  lon: number;
  status: AmbulanceStatus;
  heading: number;
  speedKmh: number;
  zone: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CrashEvent {
  impactG: number;
  timestamp: number;
  isStill: boolean;
  countdownRemaining: number;
}

