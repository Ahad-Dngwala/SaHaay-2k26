import { state, resetState } from './state';
import {
  createMission,
  acceptMission,
  driverCancelMission,
  cancelMissionByPatient,
  reportBreakdown,
  recordTelemetry,
  driverAcknowledgeStall,
  checkStallConditions,
  handleOfferTimeout,
  stallTrackers,
  tryExpandNow,
} from './dispatch';
import { Config } from './config-server';
import type { Ambulance } from './types';

describe('M13 Self-Healing on Devices & Scenarios 4.3 (1)-(5)', () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    resetState();
  });

  // ── Scenario 4.3 (1): Driver Cancellation ──────────────────────────────────
  test('Scenario 1: Driver 1 accepts then cancels with reason -> redispatch to Driver 2, Driver 1 excluded, Driver 3 busy receives nothing', () => {
    // Patient at Navrangpura (23.033, 72.560)
    const patLat = 23.033;
    const patLon = 72.560;

    // Driver 1: Available, 200m away
    const d1: Ambulance = {
      id: 'amb-d1',
      driverName: 'Ramesh',
      vehicleNo: 'GJ-01-AA-1001',
      lat: 23.0335,
      lon: 72.5605,
      status: 'AVAILABLE',
      heading: 0,
      speedKmh: 0,
      zone: 'Navrangpura',
    };

    // Driver 2: Available, 350m away
    const d2: Ambulance = {
      id: 'amb-d2',
      driverName: 'Suresh',
      vehicleNo: 'GJ-01-BB-2002',
      lat: 23.035,
      lon: 72.561,
      status: 'AVAILABLE',
      heading: 0,
      speedKmh: 0,
      zone: 'Navrangpura',
    };

    // Driver 3: Busy on another mission, 250m away
    const d3: Ambulance = {
      id: 'amb-d3',
      driverName: 'Kailash',
      vehicleNo: 'GJ-01-CC-3003',
      lat: 23.034,
      lon: 72.5608,
      status: 'ENROUTE', // BUSY!
      heading: 0,
      speedKmh: 35,
      zone: 'Navrangpura',
    };

    state.ambulances.set(d1.id, d1);
    state.ambulances.set(d2.id, d2);
    state.ambulances.set(d3.id, d3);

    // Create mission
    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 10,
      flags: 0,
      sosUid: 'sos-scenario-1',
    });

    expect(mission.pendingOffers).toContain(d1.id);
    expect(mission.pendingOffers).toContain(d2.id);
    expect(mission.pendingOffers).not.toContain(d3.id); // Busy driver excluded!

    // Driver 1 accepts
    const acceptRes = acceptMission(mission.id, d1.id);
    expect(acceptRes.won).toBe(true);

    const assignedMission = state.missions.get(mission.id)!;
    expect(assignedMission.status).toBe('ASSIGNED');
    expect(assignedMission.assignedAmbulanceId).toBe(d1.id);
    expect(state.ambulances.get(d1.id)!.status).toBe('ENROUTE');

    // Driver 1 attempts cancel WITHOUT reason -> should fail
    const noReasonRes = driverCancelMission(mission.id, d1.id, '');
    expect(noReasonRes.ok).toBe(false);
    expect(noReasonRes.error).toContain('Reason is required');

    // Driver 1 cancels with valid reason
    const cancelRes = driverCancelMission(mission.id, d1.id, 'Engine temperature warning');
    expect(cancelRes.ok).toBe(true);

    const redispatchedMission = state.missions.get(mission.id)!;
    // Mission went to REDISPATCH / DISPATCHING with new ring
    expect(['REDISPATCH', 'DISPATCHING']).toContain(redispatchedMission.status);
    expect(redispatchedMission.assignedAmbulanceId).toBeUndefined();
    expect(redispatchedMission.previousAmbulanceIds).toContain(d1.id);

    // Driver 1 is released back to AVAILABLE
    expect(state.ambulances.get(d1.id)!.status).toBe('AVAILABLE');

    // Driver 2 received the new offer; Driver 1 excluded; Driver 3 excluded
    expect(redispatchedMission.pendingOffers).toContain(d2.id);
    expect(redispatchedMission.pendingOffers).not.toContain(d1.id);
    expect(redispatchedMission.pendingOffers).not.toContain(d3.id);
  });

  // ── Scenario 4.3 (2): Driver Breakdown ─────────────────────────────────────
  test('Scenario 2: Driver 1 reports breakdown -> marked OUT_OF_SERVICE with recovery coords, mission redispatched from patient location', () => {
    const patLat = 23.025;
    const patLon = 72.570;

    const d1: Ambulance = {
      id: 'amb-bk1',
      driverName: 'Vikram',
      vehicleNo: 'GJ-01-BK-1111',
      lat: 23.026, // within 500m
      lon: 72.571,
      status: 'AVAILABLE',
      heading: 90,
      speedKmh: 0,
      zone: 'Ellisbridge',
    };

    const d2: Ambulance = {
      id: 'amb-bk2',
      driverName: 'Pravin',
      vehicleNo: 'GJ-01-BK-2222',
      lat: 23.027, // within 500m
      lon: 72.571,
      status: 'AVAILABLE',
      heading: 0,
      speedKmh: 0,
      zone: 'Ellisbridge',
    };

    state.ambulances.set(d1.id, d1);
    state.ambulances.set(d2.id, d2);

    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 11,
      flags: 0,
      sosUid: 'sos-scenario-2',
    });

    acceptMission(mission.id, d1.id);

    // D1 moves and reports breakdown at coordinates
    recordTelemetry(d1.id, 23.0275, 72.5715, 0);

    reportBreakdown(mission.id, d1.id);

    // Driver 1 marked OUT_OF_SERVICE until cleared by admin
    expect(state.ambulances.get(d1.id)!.status).toBe('OUT_OF_SERVICE');

    const m = state.missions.get(mission.id)!;
    expect(m.breakdownAmbulanceId).toBe(d1.id);
    expect(m.breakdownLat).toBe(23.0275);
    expect(m.breakdownLon).toBe(72.5715);
    expect(m.previousAmbulanceIds).toContain(d1.id);

    // Redispatch sent offer to D2 from patient live location
    expect(m.pendingOffers).toContain(d2.id);
    expect(m.pendingOffers).not.toContain(d1.id);
  });

  // ── Scenario 4.3 (3): Telemetry Stall Detection ───────────────────────────
  test('Scenario 3: Driver speed < 3 km/h for > 90s far from patient triggers warning; 30s no response escalates to auto-redispatch', () => {
    const patLat = 23.030;
    const patLon = 72.560;

    // Driver 1 starts nearby (200m away)
    const d1: Ambulance = {
      id: 'amb-stall-1',
      driverName: 'Chetan',
      vehicleNo: 'GJ-01-ST-01',
      lat: 23.032,
      lon: 72.560,
      status: 'AVAILABLE',
      heading: 180,
      speedKmh: 40,
      zone: 'Navrangpura',
    };

    const d2: Ambulance = {
      id: 'amb-stall-2',
      driverName: 'Manish',
      vehicleNo: 'GJ-01-ST-02',
      lat: 23.031,
      lon: 72.561,
      status: 'AVAILABLE',
      heading: 0,
      speedKmh: 0,
      zone: 'Navrangpura',
    };

    state.ambulances.set(d1.id, d1);
    state.ambulances.set(d2.id, d2);

    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 12,
      flags: 0,
      sosUid: 'sos-scenario-3',
    });

    const acceptRes = acceptMission(mission.id, d1.id);
    expect(acceptRes.won).toBe(true);

    const t0 = 1700000000000;

    // Driver 1 drives away (e.g. detour or obstruction) to 23.040 (~1.1 km away > 200m) and halts (0 km/h)
    recordTelemetry(d1.id, 23.040, 72.560, 0, t0);

    const tracker = stallTrackers.get(d1.id);
    expect(tracker).toBeDefined();
    expect(tracker?.stallStartedAt).toBe(t0);
    expect(tracker?.promptSentAt).toBeUndefined();

    // 80 seconds later: still below 90s threshold -> no prompt yet
    recordTelemetry(d1.id, 23.040, 72.560, 0, t0 + 80_000);
    expect(stallTrackers.get(d1.id)?.promptSentAt).toBeUndefined();

    // 95 seconds later: exceeds STALL_THRESHOLD_S (90s) -> prompt issued!
    recordTelemetry(d1.id, 23.040, 72.560, 0, t0 + 95_000);
    const updatedTracker = stallTrackers.get(d1.id);
    expect(updatedTracker?.promptSentAt).toBe(t0 + 95_000);

    // 20 seconds after prompt: within 30s escalation window
    checkStallConditions(t0 + 95_000 + 20_000);
    expect(state.missions.get(mission.id)!.status).toBe('ASSIGNED');

    // 35 seconds after prompt with NO response -> auto-escalation redispatch!
    checkStallConditions(t0 + 95_000 + 35_000);

    const redispatched = state.missions.get(mission.id)!;
    expect(['REDISPATCH', 'DISPATCHING']).toContain(redispatched.status);
    expect(state.ambulances.get(d1.id)!.status).toBe('OUT_OF_SERVICE');
    expect(redispatched.pendingOffers).toContain(d2.id);
  });

  test('Scenario 3b: Driver acknowledges stall prompt or resumes speed -> stall resolved', () => {
    const patLat = 23.030;
    const patLon = 72.560;

    const d1: Ambulance = {
      id: 'amb-stall-ack',
      driverName: 'Alok',
      vehicleNo: 'GJ-01-ST-99',
      lat: 23.031, // within 500m
      lon: 72.560,
      status: 'AVAILABLE',
      heading: 180,
      speedKmh: 45,
      zone: 'Navrangpura',
    };

    state.ambulances.set(d1.id, d1);

    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 13,
      flags: 0,
      sosUid: 'sos-scenario-3b',
    });

    acceptMission(mission.id, d1.id);

    const t0 = 1700000000000;
    // Moves 1.5km away and halts
    recordTelemetry(d1.id, 23.045, 72.560, 0, t0);
    recordTelemetry(d1.id, 23.045, 72.560, 0, t0 + 95_000); // Trigger prompt

    expect(stallTrackers.get(d1.id)?.promptSentAt).toBeDefined();

    // Driver taps prompt to acknowledge
    const acknowledged = driverAcknowledgeStall(d1.id);
    expect(acknowledged).toBe(true);

    // Stall tracker cleared and mission remains assigned
    expect(stallTrackers.get(d1.id)).toBeUndefined();
    expect(state.missions.get(mission.id)!.status).toBe('ASSIGNED');
  });

  // ── Scenario 4.3 (4): All Rings Exhausted (FAILED) ─────────────────────────
  test('Scenario 4: No drivers available within 8 km -> FAILED status with 108/112 emergency instructions', () => {
    // Isolated patient with no ambulances nearby
    const patLat = 23.100;
    const patLon = 72.600;

    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 14,
      flags: 0,
      sosUid: 'sos-scenario-4',
    });

    // Expand rings up to 8000m and beyond
    tryExpandNow(mission.id); // 500m -> 1000m
    tryExpandNow(mission.id); // 1000m -> 2000m
    tryExpandNow(mission.id); // 2000m -> 4000m
    tryExpandNow(mission.id); // 4000m -> 8000m
    tryExpandNow(mission.id); // 8000m -> > 8000m (EXHAUSTED)

    const failedMission = state.missions.get(mission.id)!;
    expect(failedMission.status).toBe('FAILED');

    // Audit logs verify instructions
    const failAudit = state.audit.find(a => a.event === 'MISSION_FAILED');
    expect(failAudit).toBeDefined();
    expect((failAudit?.data as any).instructions).toContain('108');
  });

  // ── Scenario 4.3 (5): Patient Cancellation / Safe ──────────────────────────
  test('Scenario 5: Patient cancels or marks safe -> ambulance released to AVAILABLE and driver notified', () => {
    const patLat = 23.033;
    const patLon = 72.560;

    const d1: Ambulance = {
      id: 'amb-pat-cancel',
      driverName: 'Jayesh',
      vehicleNo: 'GJ-01-PC-10',
      lat: 23.034,
      lon: 72.561,
      status: 'AVAILABLE',
      heading: 0,
      speedKmh: 0,
      zone: 'Navrangpura',
    };

    state.ambulances.set(d1.id, d1);

    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 15,
      flags: 0,
      sosUid: 'sos-scenario-5',
    });

    acceptMission(mission.id, d1.id);
    expect(state.ambulances.get(d1.id)!.status).toBe('ENROUTE');

    // Patient marks safe
    const cancelRes = cancelMissionByPatient(mission.id, "Patient's condition stabilized, family arrived");
    expect(cancelRes.ok).toBe(true);

    const m = state.missions.get(mission.id)!;
    expect(m.status).toBe('CANCELLED_BY_PATIENT');

    // Ambulance released back to AVAILABLE
    expect(state.ambulances.get(d1.id)!.status).toBe('AVAILABLE');
  });

  // ── Offer TTL & Early Ring Expansion ───────────────────────────────────────
  test('Offer TTL expiration: driver non-response removes offer; ring expands early once all offers expire', () => {
    const patLat = 23.030;
    const patLon = 72.560;

    const d1: Ambulance = {
      id: 'amb-ttl-1',
      driverName: 'Kishore',
      vehicleNo: 'GJ-01-TL-01',
      lat: 23.031,
      lon: 72.560,
      status: 'AVAILABLE',
      heading: 0,
      speedKmh: 0,
      zone: 'Navrangpura',
    };

    state.ambulances.set(d1.id, d1);

    const mission = createMission({
      patientLat: patLat,
      patientLon: patLon,
      addrId: 16,
      flags: 0,
      sosUid: 'sos-ttl-test',
    });

    expect(mission.pendingOffers).toContain(d1.id);
    expect(mission.currentRadiusM).toBe(Config.SEARCH_RADIUS_M);

    // Simulate TTL timeout for d1
    handleOfferTimeout(mission.id, d1.id);

    const m = state.missions.get(mission.id)!;
    // Offer was removed and ring expanded early to 1000m; d1 is now in previousAmbulanceIds
    expect(m.pendingOffers).not.toContain(d1.id);
    expect(m.previousAmbulanceIds).toContain(d1.id);
    expect(m.currentRadiusM).toBe(Config.SEARCH_RADIUS_M * Config.EXPAND_FACTOR);
  });
});
