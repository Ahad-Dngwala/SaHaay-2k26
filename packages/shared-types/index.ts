/**
 * packages/shared-types/index.ts
 * Unified domain models and API contracts across Citizen, Driver, Admin, and Server.
 */

export type Role = 'citizen' | 'driver' | 'admin';

export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHING' | 'ENROUTE' | 'ON_SCENE' | 'OFFLINE' | 'BREAKDOWN';

export type MissionStatus =
  | 'SEARCHING'            // ring search in progress
  | 'DISPATCHING'          // offer sent to drivers, awaiting accept
  | 'ASSIGNED'             // driver accepted, en route to patient
  | 'ON_SCENE'             // ambulance arrived at patient
  | 'PATIENT_PICKED_UP'    // patient loaded, en route to hospital
  | 'TRANSPORTING'         // en route to destination hospital
  | 'ARRIVED_AT_HOSPITAL'  // arrived at hospital
  | 'COMPLETED'            // patient handed over, mission closed
  | 'REDISPATCH'           // breakdown reported, search restarted
  | 'FAILED'               // search exhausted
  | 'CANCELLED';           // cancelled by user or dispatcher

export interface CitizenProfile {
  id: string;
  phone: string;
  name: string;
  bloodGroup: string;
  emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  allergies: string[];
  medicalNotes: string;
  createdAt: number;
}

export interface DriverProfile {
  id: string;
  phone: string;
  name: string;
  licenseNo: string;
  vehicleNo: string;
  ambulanceType: 'BLS' | 'ALS' | 'ICU';
  isVerified: boolean;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isOnDuty: boolean;
  currentLat: number;
  currentLon: number;
  heading: number;
  speedKmh: number;
  assignedMissionId?: string;
  createdAt: number;
}

export interface Mission {
  id: string;
  patientLat: number;
  patientLon: number;
  patientLatLive: number;
  patientLonLive: number;
  addrId: number;
  flags: number; // 0=manual SOS, 1=crash_auto
  sosUid: string;
  status: MissionStatus;
  createdAt: number;
  updatedAt: number;

  currentRadiusM: number;
  searchStartedAt: number;
  pendingOffers: string[];

  assignedAmbulanceId?: string;
  assignedDriverName?: string;
  assignedVehicleNo?: string;
  assignedAt?: number;

  // Breakdown & Redispatch
  breakdownLat?: number;
  breakdownLon?: number;
  breakdownAmbulanceId?: string;
  previousAmbulanceIds: string[];

  // Hospital destination
  hospitalName?: string;
  hospitalLat?: number;
  hospitalLon?: number;

  // Telemetry & ETA
  etaMinutes?: number;
  distanceKm?: number;
  patientNotes?: string;
}

export interface NewsPost {
  id: string;
  title: string;
  category: 'GOVT_ALERT' | 'ROAD_SAFETY' | 'DISASTER_PREP' | 'HEALTH_BULLETIN' | 'SAHAAY_UPDATE';
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  body: string;
  imageUrl?: string;
  sourceUrl?: string;
  officialSource?: string;
  isPinned: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: number;
  createdAt: number;
}

export interface ApkRelease {
  id: string;
  appType: 'citizen' | 'driver';
  versionName: string;
  versionCode: number;
  fileName: string;
  fileSize: number;
  sha256: string;
  minAndroid: string;
  releaseNotes: string[];
  downloadUrl: string;
  isPublished: boolean;
  publishedAt: number;
}

export interface AuditEntry {
  index: number;
  timestamp: number;
  event: string;
  data: unknown;
  prevHash: string;
  hash: string;
}

