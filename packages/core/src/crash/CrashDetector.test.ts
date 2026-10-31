/**
 * src/core/crash/CrashDetector.test.ts
 * Unit tests for CrashDetector using synthetic waveforms and golden vector JSON.
 */

import fs from 'fs';
import path from 'path';
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

describe('CrashDetector: dual mode (IMPACT vs SUSTAINED_SHAKE)', () => {
  test('SUSTAINED_SHAKE triggers in shake mode but NOT in impact mode', () => {
    const shakeDetector = new CrashDetector({ mode: 'SUSTAINED_SHAKE' });
    const impactDetector = new CrashDetector({ mode: 'IMPACT' });

    let shakeFired = false;
    let impactFired = false;
    shakeDetector.onCrashDetected(() => { shakeFired = true; });
    impactDetector.onCrashDetected(() => { impactFired = true; });

    // 160 samples (3200 ms >= 3000 ms) at 2.2g
    const now = 1700000000000;
    for (let i = 0; i < 160; i++) {
      const sample = { x: 0, y: 0, z: 2.2 * 9.81, timestampMs: now + i * 20 };
      shakeDetector.onSample(sample);
      impactDetector.onSample(sample);
    }

    expect(shakeFired).toBe(true);
    expect(impactFired).toBe(false); // Impact requires post-impact stillness, continuous shaking fails it
  });
});

describe('CrashDetector: golden vectors from crash-waveforms.json', () => {
  test('evaluates golden vectors matching specification', () => {
    const jsonPath = path.resolve(__dirname, '../../test-vectors/crash-waveforms.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Test each waveform against IMPACT mode
      for (const [name, def] of Object.entries<any>(data)) {
        const det = new CrashDetector({ mode: 'IMPACT' });
        let confirmed = false;
        for (const s of def.samples) {
          if (det.onSample(s)) confirmed = true;
        }
        expect(confirmed).toBe(def.expectedImpact);
      }

      // Test SUSTAINED_SHAKE against shake mode
      const shakeDet = new CrashDetector({ mode: 'SUSTAINED_SHAKE' });
      let shakeConfirmed = false;
      for (const s of data.SUSTAINED_SHAKE.samples) {
        if (shakeDet.onSample(s)) shakeConfirmed = true;
      }
      expect(shakeConfirmed).toBe(true);
    }
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
