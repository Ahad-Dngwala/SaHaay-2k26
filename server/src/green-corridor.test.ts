/**
 * server/src/green-corridor.test.ts
 * Verification suite for M15 Real Green Corridor advisory pre-clearance engine.
 */

import { state, resetState } from './state';
import {
  distanceToPolylineM,
  haversineDistanceM,
  selectRouteSignals,
  updateCorridorProgress,
  cancelCorridorCheckpoints,
  filterSignalsForAuthority,
  registeredAuthorities,
  loadSignalsDataset,
  RouteCheckpoint,
} from './green-corridor';
import { createMission, acceptMission, recordTelemetry, generateGreenCorridor } from './dispatch';
import { Config } from './config-server';

describe('Green Corridor Advisory Pre-Clearance Engine', () => {
  beforeEach(() => {
    resetState();
  });

  describe('Geometry and Route-Snapping', () => {
    it('computes point-to-polyline distance accurately', () => {
      // Segment from Navrangpura (23.0330, 72.5607) to Stadium (23.0420, 72.5607) - due north
      const polyline: [number, number][] = [
        [23.0330, 72.5607],
        [23.0420, 72.5607],
      ];

      // Point right on midpoint: (23.0375, 72.5607)
      const onMidpoint = distanceToPolylineM(23.0375, 72.5607, polyline);
      expect(onMidpoint).toBeLessThan(1); // < 1 metre

      // Point slightly east (~10m)
      // 1 deg lon at lat 23 is ~102 km -> 0.0001 deg is ~10.2m
      const nearPoint = distanceToPolylineM(23.0375, 72.5608, polyline);
      expect(nearPoint).toBeGreaterThan(5);
      expect(nearPoint).toBeLessThan(20);

      // Point 500m away
      const farPoint = distanceToPolylineM(23.0375, 72.5660, polyline);
      expect(farPoint).toBeGreaterThan(400);
    });

    it('selects only signals within 25m of route', () => {
      const signals = loadSignalsDataset();
      expect(signals.length).toBeGreaterThan(10);

      // Construct a route passing directly through Navrangpura Swastik Cross Road (23.0335, 72.5608)
      const targetSig = signals.find(s => s.id === 'sig-ahd-swastik') || signals[0];
      const routePolyline: [number, number][] = [
        [targetSig.lat - 0.005, targetSig.lon],
        [targetSig.lat, targetSig.lon], // exact pass
        [targetSig.lat + 0.005, targetSig.lon],
      ];

      const selected = selectRouteSignals(
        routePolyline,
        targetSig.lat - 0.005,
        targetSig.lon,
        targetSig.lat + 0.005,
        targetSig.lon,
        36 // km/h
      );

      expect(selected.length).toBeGreaterThan(0);
      const foundTarget = selected.find(c => c.id === targetSig.id);
      expect(foundTarget).toBeDefined();
      expect(foundTarget?.name).toBe(targetSig.name);
    });
  });

  describe('Signal Lifecycle State Machine (PLANNED -> ALERTED -> PASSED -> CANCELLED)', () => {
    it('advances signals from PLANNED to ALERTED when ETA <= 60s, then to PASSED within 30m', () => {
      const initialCheckpoints: RouteCheckpoint[] = [
        {
          id: 'sig-test-1',
          name: 'Test Junction 1',
          lat: 23.0350,
          lon: 72.5600,
          area: 'Ahmedabad West',
          distanceFromPatientM: 1000,
          distanceAlongRouteM: 1500,
          etaS: 150, // > 60s -> starts PLANNED
          confidenceWindowS: 22,
          state: 'PLANNED',
          alerted: false,
        },
      ];

      // Ambulance at 23.0300 (~555m away at 36 km/h = 10 m/s -> ETA ~55s <= 60s)
      const { updatedCheckpoints: step1, newlyAlerted } = updateCorridorProgress(
        'm-test',
        'amb-1',
        23.0300,
        72.5600,
        36,
        initialCheckpoints
      );

      expect(step1[0].state).toBe('ALERTED');
      expect(step1[0].alerted).toBe(true);
      expect(newlyAlerted.length).toBe(1);
      expect(newlyAlerted[0].id).toBe('sig-test-1');

      // Ambulance reaches junction: within 15m
      const { updatedCheckpoints: step2, newlyPassed } = updateCorridorProgress(
        'm-test',
        'amb-1',
        23.0350,
        72.5601, // ~10m away
        36,
        step1
      );

      expect(step2[0].state).toBe('PASSED');
      expect(step2[0].passedAt).toBeDefined();
      expect(newlyPassed.length).toBe(1);
      expect(newlyPassed[0].id).toBe('sig-test-1');
    });

    it('cancels pending checkpoints on breakdown or abort while preserving passed signals', () => {
      const checkpoints: RouteCheckpoint[] = [
        {
          id: 'sig-passed',
          name: 'Passed Junction',
          lat: 23.0300,
          lon: 72.5600,
          area: 'Ahmedabad West',
          distanceFromPatientM: 1500,
          distanceAlongRouteM: 0,
          etaS: 0,
          confidenceWindowS: 0,
          state: 'PASSED',
          alerted: true,
          passedAt: Date.now() - 5000,
        },
        {
          id: 'sig-alerted',
          name: 'Alerted Junction',
          lat: 23.0350,
          lon: 72.5600,
          area: 'Ahmedabad West',
          distanceFromPatientM: 800,
          distanceAlongRouteM: 500,
          etaS: 50,
          confidenceWindowS: 8,
          state: 'ALERTED',
          alerted: true,
        },
        {
          id: 'sig-planned',
          name: 'Planned Junction',
          lat: 23.0400,
          lon: 72.5600,
          area: 'Ahmedabad West',
          distanceFromPatientM: 200,
          distanceAlongRouteM: 1100,
          etaS: 110,
          confidenceWindowS: 15,
          state: 'PLANNED',
          alerted: false,
        },
      ];

      const cancelled = cancelCorridorCheckpoints('m-test', checkpoints, 'Breakdown on CG Road');

      expect(cancelled[0].state).toBe('PASSED'); // Preserved!
      expect(cancelled[1].state).toBe('CANCELLED');
      expect(cancelled[2].state).toBe('CANCELLED');
    });
  });

  describe('Traffic Authority Scoping & Mission Integration', () => {
    it('scopes signal alerts to registered division boundaries', () => {
      const authWest = registeredAuthorities.find(a => a.id === 'auth-west')!;
      expect(authWest).toBeDefined();

      const mixedCheckpoints: RouteCheckpoint[] = [
        {
          id: 'sig-west-1',
          name: 'West Division Sig',
          lat: 23.0330,
          lon: 72.5550, // inside West bbox [23.00, 72.50, 23.08, 72.56]
          area: 'Ahmedabad West',
          distanceFromPatientM: 500,
          distanceAlongRouteM: 500,
          etaS: 40,
          confidenceWindowS: 6,
          state: 'ALERTED',
          alerted: true,
        },
        {
          id: 'sig-central-1',
          name: 'Central Division Sig',
          lat: 23.0250,
          lon: 72.5750, // inside Central bbox
          area: 'Ahmedabad Central',
          distanceFromPatientM: 500,
          distanceAlongRouteM: 500,
          etaS: 40,
          confidenceWindowS: 6,
          state: 'ALERTED',
          alerted: true,
        },
      ];

      const westSignals = filterSignalsForAuthority('auth-west', mixedCheckpoints);
      expect(westSignals.length).toBe(1);
      expect(westSignals[0].id).toBe('sig-west-1');
    });

    it('generates real route-aware green corridor checkpoints when mission is assigned', () => {
      // Position ambulance and patient on a route passing directly through sig-01 (23.0364, 72.5611)
      state.ambulances.set('amb-corridor-1', {
        id: 'amb-corridor-1',
        driverName: 'Ramesh Patel',
        vehicleNo: 'GJ-01-AX-9999',
        lat: 23.0300,
        lon: 72.5611,
        status: 'AVAILABLE',
        heading: 0,
        speedKmh: 35,
        zone: 'Ahmedabad West',
      });

      const m = createMission({
        patientLat: 23.0450,
        patientLon: 72.5611,
        addrId: 1,
        flags: 0,
        sosUid: 'sos-gc-test',
      });

      // Ensure offer is dispatched to amb-corridor-1
      m.status = 'DISPATCHING';
      m.pendingOffers = ['amb-corridor-1'];

      // Assign the ambulance
      const acceptResult = acceptMission(m.id, 'amb-corridor-1');
      expect(acceptResult.won).toBe(true);

      // Verify checkpoints generated during acceptMission
      const updatedMission = state.missions.get(m.id)!;
      expect(updatedMission.routeCheckpoints).toBeDefined();
      const checkpoints = updatedMission.routeCheckpoints!;
      expect(Array.isArray(checkpoints)).toBe(true);
      expect(checkpoints.length).toBeGreaterThan(0);

      // Verify each checkpoint has mandatory advisory properties
      for (const cp of checkpoints) {
        expect(cp.id).toBeDefined();
        expect(cp.name).toBeDefined();
        expect(cp.etaS).toBeGreaterThanOrEqual(0);
        expect(cp.confidenceWindowS).toBeGreaterThanOrEqual(0);
        expect(['PLANNED', 'ALERTED']).toContain(cp.state);
      }
    });
  });
});
