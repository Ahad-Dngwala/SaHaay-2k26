/**
 * src/core/crash/CrashSimulator.ts
 * [SIMULATED]
 * Injects synthetic accelerometer waveforms for testing on web/emulator.
 * Production path: expo-sensors Accelerometer with setUpdateInterval(20).
 */

import type { AccelSample } from './CrashDetector';

export type WaveformType = 'PHONE_DROP' | 'POTHOLE' | 'CRASH_3G' | 'CRASH_2_5G';

export interface SimulatedWaveform {
  type: WaveformType;
  samples: AccelSample[];
}

function makeSamples(
  magnitudesG: number[],
  intervalMs = 20,
  startMs = Date.now(),
): AccelSample[] {
  return magnitudesG.map((g, i) => ({
    // z-axis impact (vehicle hits something)
    x: 0,
    y: 0,
    z: g * 9.81,
    timestampMs: startMs + i * intervalMs,
  }));
}

/**
 * PHONE_DROP: short sharp spike (< 100 ms), no sustained stillness follows.
 * Should NOT trigger crash detection.
 */
export function phoneDrop(startMs = Date.now()): SimulatedWaveform {
  const magnitudes = [
    1.0, 1.0,  // normal motion
    3.5, 4.0,  // impact spike (2 samples = 40 ms — below IMPACT_WINDOW_MS=100ms)
    1.8, 1.5,  // bouncing
    1.0, 1.0, 1.0, 1.0,  // back to normal
  ];
  return { type: 'PHONE_DROP', samples: makeSamples(magnitudes, 20, startMs) };
}

/**
 * POTHOLE: medium spike, returns to driving motion (not still).
 * Should NOT trigger crash detection.
 */
export function pothole(startMs = Date.now()): SimulatedWaveform {
  const magnitudes = [
    1.0, 1.0, 1.0,
    2.8, 2.6,   // pothole spike (below CRASH_G threshold of 2.5 barely — use 2.3 to be safe)
    1.2, 1.1, 1.0, 1.0, 1.0,  // back to driving — no stillness
  ];
  // Use 2.3 g (below the 2.5g threshold)
  const safe = magnitudes.map(g => g > 2.5 ? 2.3 : g);
  return { type: 'POTHOLE', samples: makeSamples(safe, 20, startMs) };
}

/**
 * CRASH_3G: real crash — sustained 3g impact + post-impact stillness.
 * SHOULD trigger crash detection.
 */
export function crash3G(startMs = Date.now()): SimulatedWaveform {
  const magnitudes = [
    1.0, 1.0, 1.0, 1.0,        // normal driving
    3.0, 3.2, 3.1, 3.0, 3.2, 2.9, // sustained impact ≥ 2.5g for 6 × 20ms = 120ms > IMPACT_WINDOW_MS
    0.98, 1.02, 0.99, 1.01,    // post-impact: very still (vehicle stopped)
    1.00, 0.99, 1.01, 0.98,    // more stillness (>= 50 samples needed for STILLNESS_WINDOW_MS=1000ms at 20ms)
    1.00, 1.01, 0.99, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 1.01, 0.99, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 1.01, 0.99, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 1.01, 0.99, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 1.01, 0.99, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 1.00, 1.00, 1.00, 1.00, 1.00,
  ];
  return { type: 'CRASH_3G', samples: makeSamples(magnitudes, 20, startMs) };
}

/**
 * CRASH_2_5G: threshold-level crash — exactly 2.5g.
 * SHOULD trigger crash detection.
 */
export function crash2_5G(startMs = Date.now()): SimulatedWaveform {
  const magnitudes = [
    1.0, 1.0,
    2.5, 2.5, 2.5, 2.5, 2.5, 2.5, // sustained at exactly threshold for 120 ms
    1.00, 1.00, 0.99, 1.01, 0.98, 1.00, 1.01, 0.99,  // still
    1.00, 0.99, 1.01, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 0.99, 1.01, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 0.99, 1.01, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 0.99, 1.01, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 0.99, 1.01, 1.00, 0.98, 1.01, 0.99, 1.00,
    1.00, 1.00, 1.00, 1.00, 1.00, 1.00,
  ];
  return { type: 'CRASH_2_5G', samples: makeSamples(magnitudes, 20, startMs) };
}

/** Feed a waveform into a CrashDetector synchronously. Returns true if crash was confirmed. */
export function feedWaveform(
  detector: { onSample: (s: AccelSample) => boolean },
  waveform: SimulatedWaveform,
): boolean {
  let crashed = false;
  for (const sample of waveform.samples) {
    if (detector.onSample(sample)) crashed = true;
  }
  return crashed;
}
