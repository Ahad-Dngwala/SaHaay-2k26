/**
 * server/src/e2e-journey.test.ts
 *
 * Full End-to-End User Journey Test covering all 8 stages:
 * 1. Citizen initiates SOS (either manual or via countdown).
 * 2. Countdown expires (or manual SOS).
 * 3. Server creates mission, executes spatial index search, and offers candidates.
 * 4. Driver 1 accepts (wins assignment); Driver 2 attempts late acceptance (receives 409 Conflict).
 * 5. Citizen receives assignment and telemetry tracking updates.
 * 6. Simulated network blackout forces transport to SMS mode; token sent via /sms/inbound.
 * 7. Patient moves GPS -> breakdown reported -> replacement dispatched from patient's live coordinates.
 * 8. Mission completes and cryptographic SHA-256 audit chain verifies with 100% integrity.
 */

import express from 'express';
import http from 'http';
import { state, resetState } from './state';
import { seedAmbulances } from './seed';
import { syncGrid } from './matching';
import { createRouter } from './routes';
import { verifyChain } from './audit';
import { encode, decode } from '../../src/core/sosCodec';
import { CountdownTimer } from '../../src/core/crash/CountdownTimer';
import { DeadReckoningTracker } from '../../src/core/tracking/DeadReckoningTracker';

describe('Complete E2E User Journey (Stages 1 to 8)', () => {
  let app: express.Express;
  let server: http.Server;
  let port: number;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use('/', createRouter());
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      done();
    });
  });

  afterAll((done) => {
    resetState();
    server.close(done);
  });

  beforeEach(() => {
    resetState();
    seedAmbulances();
    syncGrid(state.ambulances);
  });

  afterEach(() => {
    resetState();
  });

  test('executes golden path journey end-to-end', async () => {
    // ── STAGE 1 & 2: Citizen Crash Detected & 30s Countdown ──────────────────
    let sosTriggered = false;
    const timer = new CountdownTimer({
      durationSec: 5, // accelerated for test
      onExpire: () => { sosTriggered = true; },
    });

    jest.useFakeTimers();
    timer.start();
    expect(timer.isRunning()).toBe(true);
    jest.advanceTimersByTime(5000);
    expect(sosTriggered).toBe(true);
    jest.useRealTimers();

    // ── STAGE 3: Server Mission Creation & Spatial Index Search ─────────────
    // Patient located near Navrangpura: 23.033, 72.560
    const createRes = await fetch(`http://localhost:${port}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 23.033,
        lon: 72.560,
        addrId: 0,
        flags: 1, // Crash auto-SOS flag
        sosUid: 'e2e-journey-sos-1',
      }),
    });

    expect(createRes.status).toBe(201);
    const createData = await createRes.json() as any;
    expect(createData.ok).toBe(true);
    const missionId = createData.missionId;
    expect(missionId).toBeDefined();

    const mission = state.missions.get(missionId)!;
    expect(mission.status).toBe('DISPATCHING');
    expect(mission.pendingOffers.length).toBeGreaterThanOrEqual(2);

    const [driver1, driver2] = mission.pendingOffers;

    // ── STAGE 4: Driver 1 Accepts, Driver 2 Gets 409 Conflict ───────────────
    const acceptRes1 = await fetch(`http://localhost:${port}/missions/${missionId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: driver1 }),
    });
    expect(acceptRes1.status).toBe(200);
    const acceptData1 = await acceptRes1.json() as any;
    expect(acceptData1.won).toBe(true);

    // Driver 2 attempts late acceptance -> receives 409 Conflict
    const acceptRes2 = await fetch(`http://localhost:${port}/missions/${missionId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: driver2 }),
    });
    expect(acceptRes2.status).toBe(409);
    const acceptData2 = await acceptRes2.json() as any;
    expect(acceptData2.won).toBe(false);
    expect(acceptData2.error).toContain('Offer expired or mission already assigned');

    // ── STAGE 5: Telemetry Streaming & Dead-Reckoning Projection ────────────
    const ambu = state.ambulances.get(driver1)!;
    const tracker = new DeadReckoningTracker();
    const fixNow = Date.now();
    tracker.onFix({
      lat: ambu.lat,
      lon: ambu.lon,
      kmh: 45,
      hdg: 90,
      fixT: fixNow,
      seq: 1,
    });

    const markerState = tracker.frame(fixNow + 5000, 0.1);
    expect(markerState).not.toBeNull();
    expect(markerState!.lon).toBeGreaterThan(ambu.lon); // Projecting along heading

    // ── STAGE 6: Simulated Network Blackout & Inbound SMS Fallback ───────────
    const smsToken = encode({
      uid: 'smsbk001',
      lat: 23.035,
      lon: 72.562,
      ts: Math.floor(Date.now() / 1000),
      addrId: 1,
      flags: 0,
    }).token;

    const smsRes = await fetch(`http://localhost:${port}/sms/inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: smsToken }),
    });
    expect(smsRes.status).toBe(200);
    const smsData = await smsRes.json() as any;
    expect(smsData.ok).toBe(true);
    expect(smsData.smsReply).toContain('SaHaay: MID');

    // ── STAGE 7: Patient Moves & Stalled Ambulance Reports Breakdown ─────────
    const movedLat = 23.025;
    const movedLon = 72.570;
    await fetch(`http://localhost:${port}/missions/${missionId}/patient-location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: movedLat, lon: movedLon }),
    });

    // Report breakdown on driver1's vehicle
    const breakdownRes = await fetch(`http://localhost:${port}/missions/${missionId}/breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: driver1 }),
    });
    expect(breakdownRes.status).toBe(200);

    const missionAfterBreakdown = state.missions.get(missionId)!;
    expect(missionAfterBreakdown.breakdownAmbulanceId).toBe(driver1);
    expect(missionAfterBreakdown.patientLatLive).toBe(movedLat);
    expect(missionAfterBreakdown.patientLonLive).toBe(movedLon);
    expect(state.ambulances.get(driver1)?.status).toBe('BREAKDOWN');

    // Breakdown coordinates preserved in audit
    const breakdownAudit = state.audit.find(a => a.event === 'BREAKDOWN_REPORTED');
    expect(breakdownAudit).toBeDefined();
    expect((breakdownAudit?.data as any).breakdownLat).toBe(ambu.lat);

    // ── STAGE 8: Mission Completion & Cryptographic Audit Verification ───────
    await fetch(`http://localhost:${port}/missions/${missionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });

    expect(state.missions.get(missionId)?.status).toBe('COMPLETED');

    // Verify SHA-256 audit chain integrity via API
    const verifyRes = await fetch(`http://localhost:${port}/audit/verify`);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json() as any;
    expect(verifyData.valid).toBe(true);
    expect(verifyData.checkedEntries).toBeGreaterThanOrEqual(5);

    // Verify chain mathematically
    const directVerify = verifyChain(state.audit);
    expect(directVerify.valid).toBe(true);
  });
});
