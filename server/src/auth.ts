/**
 * server/src/auth.ts
 * Authentication and verification services for Citizen, Driver, and Admin roles.
 */

import crypto from 'crypto';
import { storage, CitizenData, DriverData } from './storage';

export interface AuthSession {
  token: string;
  role: 'citizen' | 'driver' | 'admin';
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, AuthSession>();

export function generateToken(role: 'citizen' | 'driver' | 'admin', userId: string): AuthSession {
  const token = `sahaay_${role}_${crypto.randomBytes(24).toString('hex')}`;
  const session: AuthSession = {
    token,
    role,
    userId,
    expiresAt: Date.now() + 7 * 86400000, // 7 days
  };
  sessions.set(token, session);
  return session;
}

export function verifySession(token?: string): AuthSession | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// ── Citizen Auth ─────────────────────────────────────────────────────────────

export function authenticateCitizen(phone: string, name?: string): { token: string; citizen: CitizenData } {
  const cleanPhone = phone.replace(/\s+/g, '');
  let citizen = storage.getCitizenByPhone(cleanPhone);
  if (!citizen) {
    citizen = {
      id: `cit-${Date.now()}`,
      phone: cleanPhone,
      name: name || 'Citizen User',
      bloodGroup: 'Unknown',
      emergencyContacts: [],
      allergies: [],
      medicalNotes: '',
      createdAt: Date.now(),
    };
    storage.saveCitizen(citizen);
  }
  const session = generateToken('citizen', citizen.id);
  return { token: session.token, citizen };
}

// ── Driver Auth & Verification ───────────────────────────────────────────────

export function registerDriver(params: {
  phone: string;
  name: string;
  licenseNo: string;
  vehicleNo: string;
  ambulanceType?: 'BLS' | 'ALS' | 'ICU';
}): { token: string; driver: DriverData } {
  const cleanPhone = params.phone.replace(/\s+/g, '');
  let driver = storage.getDriverByPhone(cleanPhone);
  if (!driver) {
    driver = {
      id: `amb-reg-${Date.now().toString().slice(-4)}`,
      name: params.name,
      phone: cleanPhone,
      licenseNo: params.licenseNo,
      vehicleNo: params.vehicleNo,
      ambulanceType: params.ambulanceType || 'BLS',
      isVerified: false, // Mandatory verification gate!
      verificationStatus: 'PENDING',
      isOnDuty: false,
      currentLat: 23.0365,
      currentLon: 72.5611,
      heading: 0,
      speedKmh: 0,
      createdAt: Date.now(),
    };
    storage.saveDriver(driver);
  }
  const session = generateToken('driver', driver.id);
  return { token: session.token, driver };
}

export function loginDriver(phone: string): { token: string; driver: DriverData } | null {
  const cleanPhone = phone.replace(/\s+/g, '');
  const driver = storage.getDriverByPhone(cleanPhone);
  if (!driver) return null;
  const session = generateToken('driver', driver.id);
  return { token: session.token, driver };
}

// ── Admin Auth ───────────────────────────────────────────────────────────────

export function loginAdmin(email: string, pass: string): { token: string; user: { email: string; name: string } } | null {
  if (email === 'admin@sahaay.gov.in' && pass === 'SaHaayAdmin2026!') {
    const session = generateToken('admin', 'admin-super-01');
    return { token: session.token, user: { email, name: 'State Emergency Controller' } };
  }
  return null;
}

