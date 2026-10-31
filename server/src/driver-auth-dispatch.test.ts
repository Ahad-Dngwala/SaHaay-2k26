/**
 * server/src/driver-auth-dispatch.test.ts
 * Regression tests for driver authentication, targeted WebSocket dispatch, atomic mission acceptance, and session persistence.
 */

import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createRouter } from './routes';
import { initWss } from './ws';
import { seedAmbulances } from './seed';
import { resetState, state } from './state';
import { createMission, clearOfferTimers } from './dispatch';
import { generateToken, verifySession } from './auth';

describe('Driver Auth & Targeted Dispatch Integration', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  let baseUrl: string;
  let wsUrl: string;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use('/', createRouter());

    server = http.createServer(app);
    wss = new WebSocketServer({ server });
    initWss(wss);

    server.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}`;
      wsUrl = `ws://localhost:${port}`;
      done();
    });
  });

  let app: express.Express;

  afterAll((done) => {
    clearOfferTimers();
    wss.close();
    server.close(done);
  });

  beforeEach(() => {
    resetState();
    clearOfferTimers();
    seedAmbulances();
  });

  test('POST /api/auth/driver/login returns valid session token and verified profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876500001' })
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.token).toBeDefined();
    expect(body.token).toMatch(/^sahaay_driver_/);
    expect(body.driver.id).toBe('AMB-01');
    expect(body.driver.isVerified).toBe(true);

    // Verify session lookup
    const session = verifySession(body.token);
    expect(session).not.toBeNull();
    expect(session?.role).toBe('driver');
    expect(session?.userId).toBe('AMB-01');
  });

  test('GET /api/driver/me retrieves authenticated driver profile', async () => {
    const session = generateToken('driver', 'AMB-01');

    const res = await fetch(`${baseUrl}/api/driver/me`, {
      headers: { 'Authorization': `Bearer ${session.token}` }
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.ok).toBe(true);
    expect(body.driver.id).toBe('AMB-01');
  });

  test('Atomic first-accept wins: competing driver gets 409 Conflict', async () => {
    // Patient right next to AMB-01 (Navrangpura cluster: 23.0330, 72.5607)
    createMission({
      patientLat: 23.0330,
      patientLon: 72.5607,
      addrId: 0,
      flags: 0,
      sosUid: `atomic-test-${Date.now()}`
    });

    const m = Array.from(state.missions.values())[0];
    expect(m).toBeDefined();
    expect(m.status).toBe('DISPATCHING');
    expect(m.pendingOffers.length).toBeGreaterThan(0);

    const firstAmbu = m.pendingOffers[0];
    const secondAmbu = 'AMB-99'; // Competing unit

    // First driver accepts
    const res1 = await fetch(`${baseUrl}/missions/${m.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: firstAmbu })
    });

    expect(res1.status).toBe(200);
    const body1: any = await res1.json();
    expect(body1.won).toBe(true);
    expect(body1.ambulanceId).toBe(firstAmbu);

    // Competing driver tries to accept the already assigned mission
    const res2 = await fetch(`${baseUrl}/missions/${m.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: secondAmbu })
    });

    expect(res2.status).toBe(409);
    const body2: any = await res2.json();
    expect(body2.won).toBe(false);
    expect(body2.error).toContain('already assigned');
  });

  test('WebSocket targeted offers are delivered to the offered ambulance', (done) => {
    const session = generateToken('driver', 'AMB-01');
    const ws = new WebSocket(`${wsUrl}/?token=${session.token}`);

    ws.on('open', () => {
      // Trigger a mission right next to AMB-01
      createMission({
        patientLat: 23.0330,
        patientLon: 72.5607,
        addrId: 0,
        flags: 0,
        sosUid: `ws-test-${Date.now()}`
      });
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'DRIVER_OFFER') {
        expect(msg.ambulanceId).toBe('AMB-01');
        expect(msg.missionId).toBeDefined();
        ws.close();
        done();
      }
    });
  });
});
