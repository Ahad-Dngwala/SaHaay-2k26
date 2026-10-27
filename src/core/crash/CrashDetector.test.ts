/**
 * src/core/crash/CrashDetector.test.ts
 * Unit tests for CrashDetector using synthetic waveforms.
 */

import { CrashDetector } from './CrashDetector';
import {
  phoneDrop, pothole, crash3G, crash2_5G, feedWaveform,
} from './CrashSimulator';

describe('CrashDetector: phone drop', () => {
  test('phone drop does NOT trigger crash detection', () => {
    const det = new CrashDetector();
    let fired = false;
    det.onCrashDetected(() => { fired = true; });
    feedWaveform(det, phoneDrop());
    expect(fired).toBe(false);
  });
});

describe('CrashDetector: pothole', () => {
  test('pothole (below threshold) does NOT trigger crash detection', () => {
    const det = new CrashDetector();
    let fired = false;
    det.onCrashDetected(() => { fired = true; });
    feedWaveform(det, pothole());
    expect(fired).toBe(false);
  });
});

describe('CrashDetector: real crash 3g', () => {
  test('3g crash + stillness triggers crash detection', () => {
    const det = new CrashDetector();
    let peakGReceived = 0;
    det.onCrashDetected((peakG) => { peakGReceived = peakG; });
    feedWaveform(det, crash3G());
    expect(peakGReceived).toBeGreaterThanOrEqual(2.9);
  });

  test('feedWaveform returns true for crash', () => {
    const det = new CrashDetector();
    const result = feedWaveform(det, crash3G());
    expect(result).toBe(true);
  });
});

describe('CrashDetector: threshold crash 2.5g', () => {
  test('2.5g crash + stillness triggers crash detection', () => {
    const det = new CrashDetector();
    let fired = false;
    det.onCrashDetected(() => { fired = true; });
    feedWaveform(det, crash2_5G());
    expect(fired).toBe(true);
  });
});

describe('CrashDetector: state transitions', () => {
  test('initial state is IDLE', () => {
    const det = new CrashDetector();
    expect(det.getState().phase).toBe('IDLE');
  });

  test('reset() returns to IDLE', () => {
    const det = new CrashDetector();
    det.onSample({ x: 0, y: 0, z: 30, timestampMs: Date.now() });
    det.reset();
    expect(det.getState().phase).toBe('IDLE');
  });

  test('callback can be unsubscribed', () => {
    const det = new CrashDetector();
    let count = 0;
    const unsub = det.onCrashDetected(() => count++);
    unsub();
    feedWaveform(det, crash3G());
    expect(count).toBe(0);
  });

  test('callback receives peak g value', () => {
    const det = new CrashDetector();
    const peaks: number[] = [];
    det.onCrashDetected((g) => peaks.push(g));
    feedWaveform(det, crash3G());
    expect(peaks.length).toBe(1);
    expect(peaks[0]).toBeGreaterThan(2.5);
  });
});
