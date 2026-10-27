/**
 * src/core/tracking/DeadReckoningTracker.test.ts
 * Unit tests for DeadReckoningTracker.
 */

import { DeadReckoningTracker, TelemetryFix } from './DeadReckoningTracker';

describe('DeadReckoningTracker', () => {
  const AHM_LAT = 23.0225;
  const AHM_LON = 72.5714;

  test('returns null before any fix is received', () => {
    const tracker = new DeadReckoningTracker();
    expect(tracker.frame(Date.now(), 0.016)).toBeNull();
  });

  test('initial frame returns anchor fix coordinates', () => {
    const tracker = new DeadReckoningTracker();
    const now = Date.now();
    const fix: TelemetryFix = {
      lat: AHM_LAT,
      lon: AHM_LON,
      kmh: 40,
      hdg: 90, // heading East
      fixT: now,
      seq: 1,
    };

    expect(tracker.onFix(fix)).toBe(true);
    const state = tracker.frame(now, 0.016);
    expect(state).not.toBeNull();
    expect(state?.lat).toBeCloseTo(AHM_LAT, 4);
    expect(state?.lon).toBeCloseTo(AHM_LON, 4);
    expect(state?.predicting).toBe(false);
  });

  test('drops out-of-order and duplicate packets', () => {
    const tracker = new DeadReckoningTracker();
    const now = Date.now();

    expect(tracker.onFix({ lat: AHM_LAT, lon: AHM_LON, kmh: 30, hdg: 0, fixT: now, seq: 5 })).toBe(true);
    expect(tracker.getLastSeq()).toBe(5);

    // Duplicate seq 5
    expect(tracker.onFix({ lat: AHM_LAT, lon: AHM_LON, kmh: 30, hdg: 0, fixT: now, seq: 5 })).toBe(false);

    // Out-of-order seq 4
    expect(tracker.onFix({ lat: AHM_LAT, lon: AHM_LON, kmh: 30, hdg: 0, fixT: now, seq: 4 })).toBe(false);

    // Newer seq 6
    expect(tracker.onFix({ lat: AHM_LAT, lon: AHM_LON, kmh: 30, hdg: 0, fixT: now, seq: 6 })).toBe(true);
    expect(tracker.getLastSeq()).toBe(6);
  });

  test('dead-reckons Eastward along heading without route', () => {
    const tracker = new DeadReckoningTracker();
    const fixT = 1000000;
    const fix: TelemetryFix = {
      lat: AHM_LAT,
      lon: AHM_LON,
      kmh: 72, // 72 km/h = 20 m/s
      hdg: 90, // Due East
      fixT,
      seq: 1,
    };

    tracker.onFix(fix);

    // Initial frame
    tracker.frame(fixT, 0.1);

    // 10 seconds later at 20 m/s -> should be ~200 m East
    // Advance frames to allow smoothing to settle
    let state = null;
    for (let t = fixT; t <= fixT + 10000; t += 100) {
      state = tracker.frame(t, 0.1);
    }

    expect(state).not.toBeNull();
    expect(state!.lon).toBeGreaterThan(AHM_LON); // Moved East
    expect(state!.lat).toBeCloseTo(AHM_LAT, 3);   // Latitude roughly unchanged
    expect(state!.predicting).toBe(true);
    expect(state!.staleS).toBe(10);
  });

  test('advances along route polyline when set', () => {
    const tracker = new DeadReckoningTracker();
    // Route going straight North: lat 23.00 to 23.05 along lon 72.50
    const route: [number, number][] = [
      [72.50, 23.00],
      [72.50, 23.05],
    ];
    tracker.setRoute(route);

    const fixT = 500000;
    tracker.onFix({
      lat: 23.00,
      lon: 72.50,
      kmh: 72, // 20 m/s
      hdg: 0,
      fixT,
      seq: 1,
    });

    // Advance 5 seconds along route
    let state = null;
    for (let t = fixT; t <= fixT + 5000; t += 100) {
      state = tracker.frame(t, 0.1);
    }

    expect(state).not.toBeNull();
    expect(state!.lat).toBeGreaterThan(23.00); // Advanced North along route
    expect(state!.lon).toBeCloseTo(72.50, 4);   // Stayed on line
  });

  test('caps prediction horizon at MAX_PREDICT_S (45s)', () => {
    const tracker = new DeadReckoningTracker();
    const fixT = 1000000;
    tracker.onFix({
      lat: AHM_LAT,
      lon: AHM_LON,
      kmh: 72,
      hdg: 90,
      fixT,
      seq: 1,
    });

    // Settle at 45s
    for (let t = fixT; t <= fixT + 45000; t += 500) {
      tracker.frame(t, 0.5);
    }
    const stateAt45s = tracker.frame(fixT + 45000, 0.1);

    // Frame at 60s (should freeze, not keep advancing)
    const stateAt60s = tracker.frame(fixT + 60000, 0.1);

    expect(stateAt60s!.predicting).toBe(false);
    expect(stateAt60s!.staleS).toBe(60);
    expect(stateAt60s!.lon).toBeCloseTo(stateAt45s!.lon, 3);
  });
});
