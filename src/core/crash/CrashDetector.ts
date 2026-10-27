/**
 * src/core/crash/CrashDetector.ts
 *
 * Detects vehicular crashes via accelerometer magnitude.
 * Primary sensor: Accelerometer (expo-sensors).
 * Optional secondary: Gyroscope (rotation as confirming signal).
 *
 * Algorithm:
 * 1. Continuously compute magnitude g = √(ax²+ay²+az²) / 9.81
 * 2. Impact trigger: magnitude ≥ CRASH_G sustained for IMPACT_WINDOW_MS
 * 3. Post-impact stillness: after impact, if Δg < STILLNESS_G_DELTA for
 *    STILLNESS_WINDOW_MS → confirm crash, fire callback.
 * 4. Reject if stillness never follows (pothole / drop: short spike, no stillness)
 *
 * On web / emulator: delegate to CrashSimulator which injects synthetic waveforms.
 *
 * SIMULATED: On web, Accelerometer is replaced by CrashSimulator.
 * Production path: expo-sensors Accelerometer with 20 ms update interval.
 */

import { Config } from '../config';

export interface AccelSample {
  x: number;
  y: number;
  z: number;
  timestampMs: number;
}

export type CrashPhase = 'IDLE' | 'IMPACT_DETECTED' | 'WAITING_STILLNESS' | 'CRASH_CONFIRMED';

export interface CrashDetectorState {
  phase: CrashPhase;
  lastMagnitudeG: number;
  impactStartMs: number | null;
  impactPeakG: number;
}

export type CrashCallback = (peakG: number) => void;

const IMPACT_WINDOW_MS = 100; // must sustain > CRASH_G for at least this long

export class CrashDetector {
  private state: CrashDetectorState = {
    phase: 'IDLE',
    lastMagnitudeG: 0,
    impactStartMs: null,
    impactPeakG: 0,
  };
  private callbacks: CrashCallback[] = [];
  private stillnessBuffer: number[] = []; // recent magnitudes for stillness check
  private readonly STILLNESS_SAMPLES = Math.ceil(Config.STILLNESS_WINDOW_MS / 20); // 20 ms intervals

  /** Feed a new accelerometer sample. Returns true if crash confirmed this call. */
  onSample(sample: AccelSample): boolean {
    const g = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) / 9.81;
    this.state.lastMagnitudeG = g;

    // Update stillness buffer
    this.stillnessBuffer.push(g);
    if (this.stillnessBuffer.length > this.STILLNESS_SAMPLES) {
      this.stillnessBuffer.shift();
    }

    if (this.state.phase === 'IDLE') {
      if (g >= Config.CRASH_G) {
        this.state.phase = 'IMPACT_DETECTED';
        this.state.impactStartMs = sample.timestampMs;
        this.state.impactPeakG = g;
      }
      return false;
    }

    if (this.state.phase === 'IMPACT_DETECTED') {
      if (g >= Config.CRASH_G) {
        this.state.impactPeakG = Math.max(this.state.impactPeakG, g);
        const duration = sample.timestampMs - (this.state.impactStartMs ?? sample.timestampMs);
        if (duration >= IMPACT_WINDOW_MS) {
          this.state.phase = 'WAITING_STILLNESS';
          this.stillnessBuffer = [];
        }
      } else {
        // Spike ended too fast — pothole / phone drop pattern — reset
        this.state.phase = 'IDLE';
        this.state.impactStartMs = null;
      }
      return false;
    }

    if (this.state.phase === 'WAITING_STILLNESS') {
      // Check if the recent samples are all below stillness threshold
      if (this.stillnessBuffer.length >= this.STILLNESS_SAMPLES) {
        const max = Math.max(...this.stillnessBuffer);
        const min = Math.min(...this.stillnessBuffer);
        if ((max - min) < Config.STILLNESS_G_DELTA && max < 1.5) {
          // Still — crash confirmed
          this.state.phase = 'CRASH_CONFIRMED';
          const peak = this.state.impactPeakG;
          for (const cb of this.callbacks) cb(peak);
          // Auto-reset to IDLE after confirmation
          this.state = {
            phase: 'IDLE',
            lastMagnitudeG: g,
            impactStartMs: null,
            impactPeakG: 0,
          };
          return true;
        }
      }
      return false;
    }

    return false;
  }

  onCrashDetected(cb: CrashCallback): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }

  getState(): CrashDetectorState { return { ...this.state }; }

  reset(): void {
    this.state = { phase: 'IDLE', lastMagnitudeG: 0, impactStartMs: null, impactPeakG: 0 };
    this.stillnessBuffer = [];
  }
}
