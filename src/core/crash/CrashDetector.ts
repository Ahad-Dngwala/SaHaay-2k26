/**
 * src/core/crash/CrashDetector.ts
 *
 * Detects vehicular crashes via accelerometer magnitude.
 * Primary sensor: Accelerometer (expo-sensors / native Android service).
 *
 * Supports two operational modes (Spec Section 5):
 * 1. IMPACT (default, pitch spec):
 *    - Magnitude >= CRASH_G (2.5 g) sustained for >= 100 ms
 *    - Followed by post-impact stillness (Delta g < 0.3 g, max < 1.5 g) for >= 1000 ms
 *    - Rejects potholes / phone drops (no post-impact stillness)
 * 2. SUSTAINED_SHAKE (device-testing mode):
 *    - Continuous shaking above threshold (>= 1.8 g) for >= 3 s (3000 ms)
 *    - Allows testing crash response on real hardware without vehicle impact.
 */

import { Config } from '../config';

export interface AccelSample {
  x: number;
  y: number;
  z: number;
  timestampMs: number;
}

export type CrashMode = 'IMPACT' | 'SUSTAINED_SHAKE';

export type CrashPhase = 'IDLE' | 'IMPACT_DETECTED' | 'WAITING_STILLNESS' | 'SHAKING' | 'CRASH_CONFIRMED';

export interface CrashDetectorState {
  phase: CrashPhase;
  lastMagnitudeG: number;
  impactStartMs: number | null;
  impactPeakG: number;
}

export interface CrashDetectorOptions {
  mode?: CrashMode;
  shakeThresholdG?: number;
  shakeSustainMs?: number;
}

export type CrashCallback = (peakG: number) => void;

const IMPACT_WINDOW_MS = 100; // must sustain > CRASH_G for at least 100 ms
const EPSILON = 0.001; // float precision tolerance

export class CrashDetector {
  private mode: CrashMode;
  private shakeThresholdG: number;
  private shakeSustainMs: number;

  private state: CrashDetectorState = {
    phase: 'IDLE',
    lastMagnitudeG: 0,
    impactStartMs: null,
    impactPeakG: 0,
  };
  private callbacks: CrashCallback[] = [];
  private stillnessBuffer: number[] = [];
  private readonly STILLNESS_SAMPLES = Math.ceil(Config.STILLNESS_WINDOW_MS / 20); // 20 ms intervals
  private shakeStartMs: number | null = null;

  constructor(options: CrashDetectorOptions = {}) {
    this.mode = options.mode ?? 'IMPACT';
    this.shakeThresholdG = options.shakeThresholdG ?? 1.8;
    this.shakeSustainMs = options.shakeSustainMs ?? 3000;
  }

  setMode(mode: CrashMode): void {
    this.mode = mode;
    this.reset();
  }

  getMode(): CrashMode {
    return this.mode;
  }

  /** Feed a new accelerometer sample. Returns true if crash confirmed this call. */
  onSample(sample: AccelSample): boolean {
    const g = Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2) / 9.81;
    this.state.lastMagnitudeG = g;

    // ── SUSTAINED_SHAKE Mode ──────────────────────────────────────────────────
    if (this.mode === 'SUSTAINED_SHAKE') {
      if (g >= this.shakeThresholdG) {
        if (this.shakeStartMs === null) {
          this.shakeStartMs = sample.timestampMs;
          this.state.phase = 'SHAKING';
          this.state.impactPeakG = g;
        } else {
          this.state.impactPeakG = Math.max(this.state.impactPeakG, g);
          const duration = sample.timestampMs - this.shakeStartMs;
          if (duration >= this.shakeSustainMs) {
            this.state.phase = 'CRASH_CONFIRMED';
            const peak = this.state.impactPeakG;
            for (const cb of this.callbacks) cb(peak);
            this.reset();
            return true;
          }
        }
      } else {
        // Drop below threshold resets shake duration
        this.shakeStartMs = null;
        this.state.phase = 'IDLE';
      }
      return false;
    }

    // ── IMPACT Mode (Default) ─────────────────────────────────────────────────
    this.stillnessBuffer.push(g);
    if (this.stillnessBuffer.length > this.STILLNESS_SAMPLES) {
      this.stillnessBuffer.shift();
    }

    if (this.state.phase === 'IDLE') {
      if (g >= Config.CRASH_G - EPSILON) {
        this.state.phase = 'IMPACT_DETECTED';
        this.state.impactStartMs = sample.timestampMs;
        this.state.impactPeakG = g;
      }
      return false;
    }

    if (this.state.phase === 'IMPACT_DETECTED') {
      if (g >= Config.CRASH_G - EPSILON) {
        this.state.impactPeakG = Math.max(this.state.impactPeakG, g);
        const duration = sample.timestampMs - (this.state.impactStartMs ?? sample.timestampMs);
        if (duration >= IMPACT_WINDOW_MS) {
          this.state.phase = 'WAITING_STILLNESS';
          this.stillnessBuffer = [];
        }
      } else {
        // Spike ended too fast — pothole / phone drop — reset
        this.state.phase = 'IDLE';
        this.state.impactStartMs = null;
      }
      return false;
    }

    if (this.state.phase === 'WAITING_STILLNESS') {
      if (this.stillnessBuffer.length >= this.STILLNESS_SAMPLES) {
        const max = Math.max(...this.stillnessBuffer);
        const min = Math.min(...this.stillnessBuffer);
        if ((max - min) < Config.STILLNESS_G_DELTA && max < 1.5) {
          // Still — crash confirmed
          this.state.phase = 'CRASH_CONFIRMED';
          const peak = this.state.impactPeakG;
          for (const cb of this.callbacks) cb(peak);
          this.reset();
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
    this.shakeStartMs = null;
  }
}
