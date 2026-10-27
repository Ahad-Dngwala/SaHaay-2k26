/**
 * server/src/routes.ts
 * All REST API routes for the SaHaay dispatch server.
 */

import { Router, Request, Response } from 'express';
import { state, resetState } from './state';
import {
  createMission,
  acceptMission,
  declineMission,
  reportBreakdown,
  updateMissionStatus,
  updatePatientLocation,
} from './dispatch';
import { auditLog, verifyChain, tamperEntry } from './audit';
import { seedAmbulances } from './seed';
import { syncGrid } from './matching';
import { broadcastToAll } from './ws';

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

export function createRouter(): Router {
  const router = Router();

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

  // ── Ambulances ──────────────────────────────────────────────────────────────
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
    broadcastToAll({ type: 'AMBULANCE_LOCATION', ambulanceId: id, lat, lon, heading: updated.heading, speedKmh: updated.speedKmh });
    res.json({ ok: true });
  });

  // ── Missions ─────────────────────────────────────────────────────────────────
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

    // Idempotency: same sosUid should not create a second mission
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

  router.post('/missions/:id/accept', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    const result = acceptMission(req.params.id, ambulanceId);
    res.json(result);
  });

  router.post('/missions/:id/decline', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    declineMission(req.params.id, ambulanceId);
    res.json({ ok: true });
  });

  router.post('/missions/:id/breakdown', (req: Request, res: Response) => {
    const { ambulanceId } = req.body as { ambulanceId: string };
    reportBreakdown(req.params.id, ambulanceId);
    res.json({ ok: true });
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

  // ── SMS Inbound (SimulatedCarrier / real Twilio webhook) ────────────────────
  router.post('/sms/inbound', (req: Request, res: Response) => {
    // Accepts both: JSON body { token } or form body (Twilio-style: Body=<token>)
    const token: string = (req.body.token ?? req.body.Body ?? '').trim();
    if (!token) { res.status(400).json({ error: 'token required (JSON: {token} or form: Body=)' }); return; }

    const decoded = decodeSmsToken(token);
    if (!decoded.ok) {
      auditLog('SMS_INBOUND_REJECTED', { token, reason: decoded.reason });
      // Reply like an SMS gateway would (show in UI as SIMULATED reply)
      res.json({ ok: false, smsReply: `SOS FAILED: ${decoded.reason}` });
      return;
    }

    // Idempotency: same sosUid
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

    // Short confirmation SMS text (what the server would send back via real gateway)
    const smsReply = `SaHaay: MID ${mission.id}. Searching ambulance. Stay calm.`;

    res.json({ ok: true, missionId: mission.id, smsReply }); // [SIMULATED reply]
  });

  // ── Audit Log ───────────────────────────────────────────────────────────────
  router.get('/audit', (_req: Request, res: Response) => {
    res.json(state.audit);
  });

  router.get('/audit/verify', (_req: Request, res: Response) => {
    res.json(verifyChain(state.audit));
  });

  router.post('/audit/tamper', (req: Request, res: Response) => {
    // DEMO ONLY: tamper an entry to demonstrate verification failure
    const { index } = req.body as { index: number };
    const entry = tamperEntry(index ?? 0);
    if (!entry) { res.status(404).json({ error: 'entry not found' }); return; }
    res.json({ ok: true, tamperedEntry: entry });
  });

  // ── Demo Director ───────────────────────────────────────────────────────────
  router.post('/demo/reset', (_req: Request, res: Response) => {
    resetState();
    seedAmbulances();
    syncGrid(state.ambulances);
    seenSosUids.clear();
    res.json({ ok: true, message: 'World reset and re-seeded' });
  });

  router.post('/demo/time-scale', (req: Request, res: Response) => {
    const { scale } = req.body as { scale: number };
    if (typeof scale !== 'number' || scale < 1) { res.status(400).json({ error: 'scale must be >= 1' }); return; }
    state.demoTimeScale = scale;
    res.json({ ok: true, demoTimeScale: scale });
  });

  return router;
}
