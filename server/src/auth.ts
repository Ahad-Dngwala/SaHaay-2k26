/**
 * server/src/auth.ts
 * Authentication and verification services for Citizen, Driver, and Admin roles.
 * Backed by SQLite sessions table with in-memory caching.
 */

import crypto from 'crypto';
import { storage, CitizenData, DriverData } from './storage';
import { db } from './db';

export interface AuthSession {
  token: string;
  role: 'citizen' | 'driver' | 'admin';
  userId: string;
  expiresAt: number;
}

const memorySessions = new Map<string, AuthSession>();

export function generateToken(role: 'citizen' | 'driver' | 'admin', userId: string): AuthSession {
  const token = `sahaay_${role}_${crypto.randomBytes(24).toString('hex')}`;
  const session: AuthSession = {
    token,
    role,
    userId,
    expiresAt: Date.now() + 7 * 86400000, // 7 days
  };
  memorySessions.set(token, session);

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sessions (token, role, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(session.token, session.role, session.userId, session.expiresAt, Date.now());
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    // Graceful fallback to in-memory store in unit test environments
  }

  return session;
}

export function verifySession(token?: string): AuthSession | null {
  if (!token) return null;
  const now = Date.now();

  const memSession = memorySessions.get(token);
  if (memSession) {
    if (now > memSession.expiresAt) {
      memorySessions.delete(token);
      try { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); } catch {}
      return null;
    }
    return memSession;
  }

  try {
    const row = db.prepare('SELECT token, role, user_id as userId, expires_at as expiresAt FROM sessions WHERE token = ?').get(token) as AuthSession | undefined;
    if (row) {
      if (now > row.expiresAt) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return null;
      }
      memorySessions.set(token, row);
      return row;
    }
  } catch {}

  return null;
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

export function getDriverById(id: string): DriverData | undefined {
  return storage.getDriver(id);
}

// ── Admin Auth ───────────────────────────────────────────────────────────────

export function loginAdmin(email: string, pass: string): { token: string; user: { email: string; name: string } } | null {
  const adminPass = process.env.ADMIN_PASSWORD || 'SaHaayAdmin2026!';
  if (email === 'admin@sahaay.gov.in' && pass === adminPass) {
    const session = generateToken('admin', 'admin-super-01');
    return { token: session.token, user: { email, name: 'State Emergency Controller' } };
  }
  return null;
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of memorySessions.entries()) {
    if (now > session.expiresAt) {
      memorySessions.delete(token);
    }
  }
  try {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  } catch {}
}
