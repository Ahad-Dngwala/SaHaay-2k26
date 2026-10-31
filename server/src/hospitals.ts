/**
 * server/src/hospitals.ts
 * Manages hospital data and nearest hospital selection based on travel distance/ETA.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LatLon, defaultRoutingProvider } from './routing';

export interface Hospital {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  emergencyPhone: string;
  traumaCenter: boolean;
  icuBedsAvailable: number;
}

const HOSPITALS_FILE = path.resolve(__dirname, '..', '..', 'data', 'hospitals.json');

export function loadHospitals(): Hospital[] {
  if (!fs.existsSync(HOSPITALS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HOSPITALS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export async function findNearestHospital(patientLocation: LatLon): Promise<{
  hospital: Hospital;
  distanceM: number;
  etaS: number;
} | null> {
  const hospitals = loadHospitals();
  if (hospitals.length === 0) return null;

  // Use fast Haversine metric across candidate hospitals to avoid 8 sequential external network requests
  const R = 6371e3;
  let bestHospital = hospitals[0];
  let minDistance = Infinity;

  for (const h of hospitals) {
    const φ1 = (patientLocation.lat * Math.PI) / 180;
    const φ2 = (h.lat * Math.PI) / 180;
    const Δφ = ((h.lat - patientLocation.lat) * Math.PI) / 180;
    const Δλ = ((h.lon - patientLocation.lon) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;

    if (d < minDistance) {
      minDistance = d;
      bestHospital = h;
    }
  }

  // Then fetch the exact driving route for the chosen best hospital
  const route = await defaultRoutingProvider.getRoute(patientLocation, {
    lat: bestHospital.lat,
    lon: bestHospital.lon,
  });

  return {
    hospital: bestHospital,
    distanceM: route.distanceM,
    etaS: route.durationS,
  };
}
