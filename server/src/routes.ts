/**
 * server/src/routes.ts
 * All REST API routes for the SaHaay dispatch server.
 * Includes unified endpoints for Citizen, Driver, Admin, News CMS, and APK Releases.
 */

import { Router, Request, Response } from 'express';
import { state, resetState } from './state';
import {
  createMission,
  acceptMission,
  declineMission,
  reportBreakdown,
  driverCancelMission,
  cancelMissionByPatient,
  recordTelemetry,
  driverAcknowledgeStall,
  updateMissionStatus,
  updatePatientLocation,
  setDemoTimeScale,
  tryExpandNow,
} from './dispatch';
import { auditLog, verifyChain, tamperEntry } from './audit';
import { seedAmbulances } from './seed';
import { syncGrid, findAvailable } from './matching';
import { broadcastToAll } from './ws';
import { storage } from './storage';
import { defaultRoutingProvider } from './routing';
import { findNearestHospital } from './hospitals';
import {
  authenticateCitizen,
  registerDriver,
  loginDriver,
  loginAdmin,
  verifySession,
} from './auth';

// Codec - inline the decode logic to avoid cross-package imports
function crc8(input: string): string {
  let c = 0;
  for (let i = 0; i < input.length; i++) {
    c ^= input.charCodeAt(i);
    for (let b = 0; b < 8; b++) {
      c = (c & 0x80) ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
    }
  }
  return c.toString(36).padStart(2, '0');
}

function decodeSmsToken(raw: string): { ok: true; uid: string; lat: number; lon: number; ts: number; addrId: number; flags: number } | { ok: false; reason: string } {
  const s = raw.trim();
  if (!s || s.length > 160 || /[^\x20-\x7e]/.test(s)) return { ok: false, reason: 'invalid format' };
  const lastPipe = s.lastIndexOf('|');
  if (lastPipe < 0) return { ok: false, reason: 'missing CRC' };
  const body = s.slice(0, lastPipe);
  const crc  = s.slice(lastPipe + 1);
  if (crc8(body) !== crc) return { ok: false, reason: 'CRC mismatch' };
  const f = body.split('|');
  if (f.length !== 7 || f[0] !== 'S1') return { ok: false, reason: 'malformed' };
  try {
    const lat    = parseInt(f[2], 36) / 1e5 - 90;
    const lon    = parseInt(f[3], 36) / 1e5 - 180;
    const ts     = parseInt(f[4], 36);
    const addrId = parseInt(f[5], 36);
    const flags  = parseInt(f[6], 36);
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return { ok: false, reason: 'coords out of range' };
    return { ok: true, uid: f[1], lat, lon, ts, addrId, flags };
  } catch (e) {
    return { ok: false, reason: `parse error: ${(e as Error).message}` };
  }
}

// Idempotency store: sosUid → missionId
const seenSosUids = new Set<string>();

function verifyAdmin(req: Request, res: Response, next: () => void): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin authorization header required' });
    return;
  }
  const token = authHeader.slice(7);
  const session = verifySession(token);
  if (!session || session.role !== 'admin') {
    res.status(403).json({ error: 'Admin privileges required' });
    return;
  }
  next();
}

export function createRouter(): Router {
  const router = Router();

  // ── Root & Index ─────────────────────────────────────────────────────────────
  router.get('/', (_req: Request, res: Response) => {
    res.redirect('/control');
  });

  // ── Health ──────────────────────────────────────────────────────────────────
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ambulances: state.ambulances.size,
      missions: state.missions.size,
      audit: state.audit.length,
      demoTimeScale: state.demoTimeScale,
    });
  });

  // ── Unified Auth & Profile Endpoints ─────────────────────────────────────────

  // Citizen Authentication
  router.post('/api/auth/citizen', (req: Request, res: Response) => {
    const { phone, name } = req.body as { phone?: string; name?: string };
    if (!phone) { res.status(400).json({ error: 'Phone number required' }); return; }
    const result = authenticateCitizen(phone, name);
    auditLog('CITIZEN_LOGIN', { citizenId: result.citizen.id, phone: result.citizen.phone });
    res.json(result);
  });

  // Citizen Profile
  router.get('/api/citizen/profile/:id', (req: Request, res: Response) => {
    const citizen = storage.getCitizen(req.params.id);
    if (!citizen) { res.status(404).json({ error: 'Citizen not found' }); return; }
    res.json(citizen);
  });

  router.put('/api/citizen/profile/:id', (req: Request, res: Response) => {
    const citizen = storage.getCitizen(req.params.id);
    if (!citizen) { res.status(404).json({ error: 'Citizen not found' }); return; }
    const updated = { ...citizen, ...req.body, id: citizen.id };
    storage.saveCitizen(updated);
    auditLog('CITIZEN_PROFILE_UPDATED', { citizenId: citizen.id });
    res.json(updated);
  });

  // Driver Authentication
  router.post('/api/auth/driver/register', (req: Request, res: Response) => {
    const { phone, name, licenseNo, vehicleNo, ambulanceType } = req.body as {
      phone?: string;
      name?: string;
      licenseNo?: string;
      vehicleNo?: string;
      ambulanceType?: 'BLS' | 'ALS' | 'ICU';
    };
    if (!phone || !name || !licenseNo || !vehicleNo) {
      res.status(400).json({ error: 'All registration fields (phone, name, licenseNo, vehicleNo) are required' });
      return;
    }
    const result = registerDriver({ phone, name, licenseNo, vehicleNo, ambulanceType });
    auditLog('DRIVER_REGISTERED', { driverId: result.driver.id, verificationStatus: result.driver.verificationStatus });
    res.status(201).json(result);
  });

  router.post('/api/auth/driver/login', (req: Request, res: Response) => {
    const { phone } = req.body as { phone?: string };
    if (!phone) { res.status(400).json({ error: 'Phone required' }); return; }
    const result = loginDriver(phone);
    if (!result) { res.status(404).json({ error: 'Driver account not found. Please register.' }); return; }
    auditLog('DRIVER_LOGIN', { driverId: result.driver.id, isVerified: result.driver.isVerified });
    res.json(result);
  });

  // Driver Duty Status Toggle (Mandatory Verification Gate!)
  router.post('/api/driver/:id/duty', (req: Request, res: Response) => {
    const driver = storage.getDriver(req.params.id);
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }
    const { isOnDuty } = req.body as { isOnDuty: boolean };

    // Strict requirement: Unverified drivers cannot become dispatch-eligible!
    if (isOnDuty && !driver.isVerified) {
      res.status(403).json({
        error: 'Driver verification pending. Active dispatch requires verified state credentials.',
        verificationStatus: driver.verificationStatus,
      });
      return;
    }

    driver.isOnDuty = !!isOnDuty;
    storage.saveDriver(driver);

    // Sync to active ambulances map
    if (driver.isOnDuty) {
      state.ambulances.set(driver.id, {
        id: driver.id,
        driverName: driver.name,
        vehicleNo: driver.vehicleNo,
        lat: driver.currentLat,
        lon: driver.currentLon,
        status: 'AVAILABLE',
        heading: driver.heading,
        speedKmh: driver.speedKmh,
        zone: 'Ahmedabad Central',
      });
    } else {
      const amb = state.ambulances.get(driver.id);
      if (amb && amb.status === 'AVAILABLE') {
        amb.status = 'OFFLINE';
      }
    }
    syncGrid(state.ambulances);
    auditLog('DRIVER_DUTY_CHANGED', { driverId: driver.id, isOnDuty: driver.isOnDuty });
    res.json({ ok: true, driver });
  });

  // Admin Authentication
  router.post('/api/auth/admin/login', (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    const result = loginAdmin(email, password);
    if (!result) { res.status(401).json({ error: 'Invalid admin credentials' }); return; }
    auditLog('ADMIN_LOGIN', { email });
    res.json(result);
  });

  // ── News & Awareness CMS (Powers Citizen Updates Screen 04) ──────────────────

  router.get('/api/updates', (_req: Request, res: Response) => {
    res.json(storage.listNews(true));
  });

  router.get('/api/admin/updates', (_req: Request, res: Response) => {
    res.json(storage.listNews(false));
  });

  router.post('/api/admin/updates', (req: Request, res: Response) => {
    const { title, category, priority, body, sourceUrl, officialSource, isPinned } = req.body;
    if (!title || !body) { res.status(400).json({ error: 'Title and body required' }); return; }
    const post = {
      id: `news-${Date.now()}`,
      title,
      category: category || 'GOVT_ALERT',
      priority: priority || 'NORMAL',
      body,
      sourceUrl: sourceUrl || 'https://gujhealth.gujarat.gov.in',
      officialSource: officialSource || 'Gujarat Emergency Health Directorate',
      isPinned: !!isPinned,
      status: 'PUBLISHED' as const,
      publishedAt: Date.now(),
      createdAt: Date.now(),
    };
    storage.saveNews(post);
    auditLog('NEWS_PUBLISHED', { postId: post.id, title: post.title });
    broadcastToAll({ type: 'NEWS_UPDATE', post });
    res.status(201).json(post);
  });

  router.delete('/api/admin/updates/:id', (req: Request, res: Response) => {
    const success = storage.deleteNews(req.params.id);
    if (!success) { res.status(404).json({ error: 'Post not found' }); return; }
    auditLog('NEWS_DELETED', { postId: req.params.id });
    res.json({ ok: true });
  });

  // ── APK Release Management ───────────────────────────────────────────────────

  router.get('/api/releases', (_req: Request, res: Response) => {
    res.json(storage.listReleases());
  });

  router.get('/api/releases/latest/:appType', (req: Request, res: Response) => {
    const rel = storage.getRelease(req.params.appType as 'citizen' | 'driver');
    if (!rel) { res.status(404).json({ error: 'No published release found' }); return; }
    res.json(rel);
  });

  // ── Admin Fleet & Driver Management ──────────────────────────────────────────

  router.get('/api/admin/overview', (_req: Request, res: Response) => {
    const allMissions = Array.from(state.missions.values());
    const allAmbulances = Array.from(state.ambulances.values());
    const drivers = storage.listDrivers();
    const citizens = storage.listCitizens();

    res.json({
      activeEmergencies: allMissions.filter(m => m.status === 'SEARCHING' || m.status === 'DISPATCHING').length,
      assignedMissions: allMissions.filter(m => m.status === 'ASSIGNED' || m.status === 'ON_SCENE' || m.status === 'TRANSPORTING').length,
      completedMissions: allMissions.filter(m => m.status === 'COMPLETED').length,
      totalAmbulances: allAmbulances.length,
      availableAmbulances: allAmbulances.filter(a => a.status === 'AVAILABLE').length,
      busyAmbulances: allAmbulances.filter(a => a.status === 'ENROUTE' || a.status === 'ON_SCENE').length,
      verifiedDrivers: drivers.filter(d => d.isVerified).length,
      pendingDrivers: drivers.filter(d => !d.isVerified).length,
      registeredCitizens: citizens.length,
    });
  });

  router.get('/api/admin/drivers', (_req: Request, res: Response) => {
    res.json(storage.listDrivers());
  });

  router.post('/api/admin/drivers/:id/verify', (req: Request, res: Response) => {
    const driver = storage.getDriver(req.params.id);
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }
    const { approve } = req.body as { approve: boolean };
    driver.isVerified = !!approve;
    driver.verificationStatus = approve ? 'VERIFIED' : 'REJECTED';
    storage.saveDriver(driver);
    auditLog('DRIVER_VERIFICATION_EVALUATED', { driverId: driver.id, isVerified: driver.isVerified, status: driver.verificationStatus });
    res.json({ ok: true, driver });
  });

  router.get('/api/admin/citizens', (_req: Request, res: Response) => {
    res.json(storage.listCitizens());
  });

  // ── Ambulances (Existing routes preserved for tests) ─────────────────────────
  router.get('/ambulances', (_req: Request, res: Response) => {
    res.json(Array.from(state.ambulances.values()));
  });

  router.patch('/ambulances/:id/location', (req: Request, res: Response) => {
    const { id } = req.params;
    const { lat, lon, heading, speedKmh } = req.body as { lat: number; lon: number; heading?: number; speedKmh?: number };
    const ambu = state.ambulances.get(id);
    if (!ambu) { res.status(404).json({ error: 'ambulance not found' }); return; }
    const updated = { ...ambu, lat, lon, ...(heading !== undefined ? { heading } : {}), ...(speedKmh !== undefined ? { speedKmh } : {}) };
    state.ambulances.set(id, updated);
    syncGrid(state.ambulances);
    recordTelemetry(id, lat, lon, updated.speedKmh ?? 0);
    broadcastToAll({ type: 'AMBULANCE_LOCATION', ambulanceId: id, lat, lon, heading: updated.heading, speedKmh: updated.speedKmh });
    res.json({ ok: true });
  });

  // ── Missions (Single source of truth) ─────────────────────────────────────────
  router.get('/missions', (_req: Request, res: Response) => {
    res.json(Array.from(state.missions.values()));
  });

  router.get('/missions/:id', (req: Request, res: Response) => {
    const m = state.missions.get(req.params.id);
    if (!m) { res.status(404).json({ error: 'not found' }); return; }
    res.json(m);
  });

  router.post('/missions', (req: Request, res: Response) => {
    const { lat, lon, addrId = 0, flags = 0, sosUid } = req.body as { lat: number; lon: number; addrId?: number; flags?: number; sosUid?: string };
    if (lat === undefined || lon === undefined) { res.status(400).json({ error: 'lat and lon required' }); return; }

    const uid = sosUid ?? `manual-${Date.now()}`;
    if (seenSosUids.has(uid)) {
      const existing = Array.from(state.missions.values()).find(m => m.sosUid === uid);
      res.json({ ok: true, missionId: existing?.id, idempotent: true });
      return;
    }
    seenSosUids.add(uid);

    const mission = createMission({ patientLat: lat, patientLon: lon, addrId, flags, sosUid: uid });
    res.status(201).json({ ok: true, missionId: mission.id });
  });

  // ── SOS Direct Trigger (Alias for /missions) ─────────────────────────────────
  router.post('/sos', (req: Request, res: Response) => {
    const { lat, lon, addrId = 0, flags = 0, sosUid } = req.body as { lat: number; lon: number; addrId?: number; flags?: number; sosUid?: string };
    if (lat === undefined || lon === undefined) { res.status(400).json({ error: 'lat and lon required' }); return; }

    const uid = sosUid ?? `sos-${Date.now()}`;
    if (seenSosUids.has(uid)) {
      const existing = Array.from(state.missions.values()).find(m => m.sosUid === uid);
      res.json({ ok: true, missionId: existing?.id, idempotent: true });
      return;
    }
    seenSosUids.add(uid);

    const mission = createMission({ patientLat: lat, patientLon: lon, addrId, flags, sosUid: uid });
    res.status(201).json({ ok: true, missionId: mission.id, status: mission.status });
  });

  router.post('/missions/:id/accept', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    if (!ambulanceId) {
      res.status(400).json({ error: 'ambulanceId required', won: false });
      return;
    }
    const result = acceptMission(req.params.id, ambulanceId);
    if (!result.won) {
      res.status(409).json({
        error: 'Offer expired or mission already assigned to another unit',
        won: false,
        missionId: req.params.id,
        ambulanceId,
      });
      return;
    }
    res.status(200).json(result);
  });

  router.post('/missions/:id/decline', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    declineMission(req.params.id, ambulanceId);
    res.json({ ok: true });
  });

  router.post('/missions/:id/expand', (req: Request, res: Response) => {
    tryExpandNow(req.params.id);
    const m = state.missions.get(req.params.id);
    res.json({ ok: true, mission: m });
  });

  router.post('/missions/:id/quick-assign', (req: Request, res: Response) => {
    const m = state.missions.get(req.params.id);
    if (!m) { res.status(404).json({ error: 'not found' }); return; }
    const available = findAvailable(state.ambulances, m.patientLatLive, m.patientLonLive, 8000);
    if (!available.length) { res.status(400).json({ error: 'no available ambulances' }); return; }
    
    const targetAmbuId = m.pendingOffers[0] || available[0].id;
    if (!m.pendingOffers.includes(targetAmbuId)) {
      m.pendingOffers.push(targetAmbuId);
      m.status = 'DISPATCHING';
    }
    const result = acceptMission(m.id, targetAmbuId);
    res.json({ ok: true, ...result });
  });

  router.post('/missions/:id/breakdown', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    reportBreakdown(req.params.id, ambulanceId);
    res.json({ ok: true });
  });

  router.post('/missions/:id/cancel', (req: Request, res: Response) => {
    const { ambulanceId, driverId, reason } = req.body as { ambulanceId?: string; driverId?: string; reason?: string };
    const ambId = ambulanceId || driverId;
    if (ambId) {
      if (!reason) {
        res.status(400).json({ error: 'Cancellation reason is required' });
        return;
      }
      const result = driverCancelMission(req.params.id, ambId, reason);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ ok: true });
    } else {
      const result = cancelMissionByPatient(req.params.id, reason || 'Patient cancelled');
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ ok: true });
    }
  });

  router.post('/missions/:id/driver-cancel', (req: Request, res: Response) => {
    const { ambulanceId, driverId, reason } = req.body as { ambulanceId?: string; driverId?: string; reason?: string };
    const ambId = ambulanceId || driverId;
    if (!ambId || !reason) {
      res.status(400).json({ error: 'ambulanceId and reason are required' });
      return;
    }
    const result = driverCancelMission(req.params.id, ambId, reason);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/missions/:id/patient-cancel', (req: Request, res: Response) => {
    const { reason } = req.body as { reason?: string };
    const result = cancelMissionByPatient(req.params.id, reason || 'Patient marked safe');
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  router.post('/missions/:id/stall-ack', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    if (!ambulanceId) {
      res.status(400).json({ error: 'ambulanceId required' });
      return;
    }
    const acknowledged = driverAcknowledgeStall(ambulanceId);
    res.json({ ok: acknowledged });
  });

  router.post('/ambulances/:id/stall-ack', (req: Request, res: Response) => {
    const acknowledged = driverAcknowledgeStall(req.params.id);
    res.json({ ok: acknowledged });
  });

  router.patch('/missions/:id/status', (req: Request, res: Response) => {
    const { status } = req.body as { status: string };
    const updated = updateMissionStatus(req.params.id, status as any);
    if (!updated) { res.status(404).json({ error: 'not found' }); return; }
    res.json(updated);
  });

  router.patch('/missions/:id/patient-location', (req: Request, res: Response) => {
    const { lat, lon } = req.body as { lat: number; lon: number };
    updatePatientLocation(req.params.id, lat, lon);
    res.json({ ok: true });
  });

  // ── SMS Inbound ─────────────────────────────────────────────────────────────
  router.get('/sms/inbound', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      endpoint: '/sms/inbound',
      supportedMethods: ['POST'],
      description: 'SaHaay Simulated SMS Inbound Webhook. Send HTTP POST with { token } or form Body=<token>.',
      example: { token: 'S1|9f3|0|ts5e587pk|230300|725800|37|1|f6' }
    });
  });

  router.post('/sms/inbound', (req: Request, res: Response) => {
    const token: string = (req.body.token ?? req.body.Body ?? '').trim();
    if (!token) { res.status(400).json({ error: 'token required (JSON: {token} or form: Body=)' }); return; }

    const decoded = decodeSmsToken(token);
    if (!decoded.ok) {
      auditLog('SMS_INBOUND_REJECTED', { token, reason: decoded.reason });
      res.json({ ok: false, smsReply: `SOS FAILED: ${decoded.reason}` });
      return;
    }

    if (seenSosUids.has(decoded.uid)) {
      const existing = Array.from(state.missions.values()).find(m => m.sosUid === decoded.uid);
      res.json({ ok: true, smsReply: `SOS DUP: MID ${existing?.id ?? '?'}`, missionId: existing?.id, idempotent: true });
      return;
    }
    seenSosUids.add(decoded.uid);

    auditLog('SMS_INBOUND', { uid: decoded.uid, lat: decoded.lat, lon: decoded.lon, flags: decoded.flags });

    const mission = createMission({
      patientLat: decoded.lat,
      patientLon: decoded.lon,
      addrId: decoded.addrId,
      flags: decoded.flags,
      sosUid: decoded.uid,
    });

    const smsReply = `SaHaay: MID ${mission.id}. Searching ambulance. Stay calm.`;
    res.json({ ok: true, missionId: mission.id, smsReply });
  });


  // ── Real Routing & ETA ───────────────────────────────────────────────────────
  router.post('/api/routes/directions', async (req: Request, res: Response) => {
    const { origin, destination } = req.body as {
      origin?: { lat: number; lon: number };
      destination?: { lat: number; lon: number };
    };
    if (!origin || !destination || origin.lat === undefined || destination.lat === undefined) {
      res.status(400).json({ error: 'origin and destination with lat/lon required' });
      return;
    }
    const route = await defaultRoutingProvider.getRoute(origin, destination);
    res.json(route);
  });

  router.post('/api/routes/nearest-hospital', async (req: Request, res: Response) => {
    const { location } = req.body as { location?: { lat: number; lon: number } };
    if (!location || location.lat === undefined || location.lon === undefined) {
      res.status(400).json({ error: 'location with lat/lon required' });
      return;
    }
    const result = await findNearestHospital(location);
    if (!result) {
      res.status(404).json({ error: 'No hospitals available' });
      return;
    }
    res.json(result);
  });
  // ── Audit Log ───────────────────────────────────────────────────────────────
  router.get('/audit', (_req: Request, res: Response) => {
    res.json(state.audit);
  });

  router.get('/audit/verify', (_req: Request, res: Response) => {
    res.json(verifyChain(state.audit));
  });

  router.post('/audit/tamper', verifyAdmin, (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Tamper testing endpoint disabled in production' });
      return;
    }
    const { index } = req.body as { index: number };
    const entry = tamperEntry(index ?? 0);
    if (!entry) { res.status(404).json({ error: 'entry not found' }); return; }
    res.json({ ok: true, tamperedEntry: entry });
  });

  // ── Demo Director ───────────────────────────────────────────────────────────
  router.post('/demo/reset', (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Demo reset disabled in production' });
      return;
    }
    resetState();
    seedAmbulances();
    syncGrid(state.ambulances);
    seenSosUids.clear();
    res.json({ ok: true, message: 'World reset and re-seeded' });
  });

  router.post('/demo/time-scale', (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Demo time-scale disabled in production' });
      return;
    }
    const { scale } = req.body as { scale: number };
    if (typeof scale !== 'number' || scale < 1) { res.status(400).json({ error: 'scale must be >= 1' }); return; }
    setDemoTimeScale(scale);
    res.json({ ok: true, demoTimeScale: scale });
  });

  return router;
}
