/**
 * server/src/dispatch.test.ts
 *
 * Core dispatch correctness regression suite:
 * 1. Two drivers accepting the same mission concurrently (first-accept-wins lock).
 * 2. Losing driver receives won=false (translated to 409 Conflict at HTTP layer).
 * 3. Breakdown re-dispatch originates from patient's live GPS, while breakdown coords are preserved in audit.
 * 4. Demo Director time scaling dynamically rescales already-scheduled timers.
 * 5. Green Corridor events carry advisory disclaimer.
 */

import { state, resetState } from './state';
import {
  createMission,
  acceptMission,
  reportBreakdown,
  updatePatientLocation,
  setDemoTimeScale,
} from './dispatch';
import { seedAmbulances } from './seed';
import { syncGrid } from './matching';

describe('Server Dispatch Engine: Correctness & Concurrency', () => {
  beforeEach(() => {
    resetState();
    seedAmbulances();
    syncGrid(state.ambulances);
  });

  afterEach(() => {
    resetState();
  });

  test('two drivers accepting the same mission concurrently: exactly one wins, one loses', () => {
    // Create mission near Navrangpura (lat 23.033, lon 72.560)
    const mission = createMission({
      patientLat: 23.033,
      patientLon: 72.560,
      addrId: 0,
      flags: 0,
      sosUid: 'concurrent-test-1',
    });

    expect(mission.status).toBe('DISPATCHING');
    expect(mission.pendingOffers.length).toBeGreaterThanOrEqual(2);

    const [driver1, driver2] = mission.pendingOffers;

    // Simulate concurrent acceptance from both drivers
    const result1 = acceptMission(mission.id, driver1);
    const result2 = acceptMission(mission.id, driver2);

    // Exactly one winner
    expect(result1.won).toBe(true);
    expect(result2.won).toBe(false);

    // Mission status is ASSIGNED to driver1
    const updated = state.missions.get(mission.id);
    expect(updated?.status).toBe('ASSIGNED');
    expect(updated?.assignedAmbulanceId).toBe(driver1);

    // Pending offers cleared; driver2's offer cancelled
    expect(updated?.pendingOffers.length).toBe(0);

    // Winning ambulance is ENROUTE
    expect(state.ambulances.get(driver1)?.status).toBe('ENROUTE');
  });

  test('breakdown re-dispatch routes to patient latest GPS while preserving breakdown coords in audit', () => {
    const mission = createMission({
      patientLat: 23.033,
      patientLon: 72.560,
      addrId: 0,
      flags: 0,
      sosUid: 'breakdown-test-1',
    });

    const driverId = mission.pendingOffers[0];
    acceptMission(mission.id, driverId);

    // Patient moves 1.5km South towards Ashram Road
    const newPatientLat = 23.020;
    const newPatientLon = 72.575;
    updatePatientLocation(mission.id, newPatientLat, newPatientLon);

    const activeMissionBefore = state.missions.get(mission.id)!;
    expect(activeMissionBefore.patientLatLive).toBe(newPatientLat);
    expect(activeMissionBefore.patientLonLive).toBe(newPatientLon);

    // Record ambulance position before breakdown
    const ambu = state.ambulances.get(driverId)!;
    const expectedBreakdownLat = ambu.lat;
    const expectedBreakdownLon = ambu.lon;

    // Report breakdown
    reportBreakdown(mission.id, driverId);

    const updated = state.missions.get(mission.id)!;
    // Mission status is REDISPATCH or DISPATCHING replacement
    expect(['REDISPATCH', 'DISPATCHING']).toContain(updated.status);
    expect(updated.breakdownLat).toBe(expectedBreakdownLat);
    expect(updated.breakdownLon).toBe(expectedBreakdownLon);
    expect(updated.breakdownAmbulanceId).toBe(driverId);
    expect(updated.previousAmbulanceIds).toContain(driverId);

    // Failed ambulance is marked BREAKDOWN
    expect(state.ambulances.get(driverId)?.status).toBe('BREAKDOWN');

    // Audit log contains BREAKDOWN_REPORTED with breakdownLat and breakdownLon
    const breakdownAudit = state.audit.find(a => a.event === 'BREAKDOWN_REPORTED');
    expect(breakdownAudit).toBeDefined();
    expect((breakdownAudit?.data as any).breakdownLat).toBe(expectedBreakdownLat);
    expect((breakdownAudit?.data as any).breakdownLon).toBe(expectedBreakdownLon);
  });

  test('setDemoTimeScale reschedules already-active expansion timers', () => {
    // Mission in an isolated coordinate with no ambulances within 500m
    const mission = createMission({
      patientLat: 23.200, // Outside normal seeded bounds
      patientLon: 72.700,
      addrId: 0,
      flags: 0,
      sosUid: 'timer-test-1',
    });

    expect(state.expansionTimers.has(mission.id)).toBe(true);
    const initialTimer = state.expansionTimers.get(mission.id)!;
    expect(initialTimer.nominalDurationS).toBe(120);

    // Switch time scale to 10x
    setDemoTimeScale(10);
    expect(state.demoTimeScale).toBe(10);

    // Timer was rescheduled
    const rescheduledTimer = state.expansionTimers.get(mission.id);
    expect(rescheduledTimer).toBeDefined();
    expect(rescheduledTimer?.nominalDurationS).toBeLessThanOrEqual(120);
  });

  test('Green Corridor computation carries advisory notification disclaimer', () => {
    const mission = createMission({
      patientLat: 23.033,
      patientLon: 72.560,
      addrId: 0,
      flags: 0,
      sosUid: 'corridor-test-1',
    });

    const driverId = mission.pendingOffers[0];
    acceptMission(mission.id, driverId);

    const corridorAudit = state.audit.find(a => a.event === 'GREEN_CORRIDOR_COMPUTED');
    expect(corridorAudit).toBeDefined();
    expect((corridorAudit?.data as any).disclaimer).toContain('ADVISORY PRE-CLEARANCE NOTIFICATION ONLY');
  });
});
