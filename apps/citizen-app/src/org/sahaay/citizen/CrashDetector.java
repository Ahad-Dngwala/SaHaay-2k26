package org.sahaay.citizen;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java implementation of SaHaay Crash Detector.
 * Matches packages/core/src/crash/CrashDetector.ts exactly.
 * Evaluates golden vector waveforms identically.
 */
public class CrashDetector {
    public static final int MODE_IMPACT = 0;
    public static final int MODE_SUSTAINED_SHAKE = 1;

    public static final int PHASE_IDLE = 0;
    public static final int PHASE_IMPACT_DETECTED = 1;
    public static final int PHASE_WAITING_STILLNESS = 2;
    public static final int PHASE_SHAKING = 3;
    public static final int PHASE_CRASH_CONFIRMED = 4;

    public interface CrashListener {
        void onCrashConfirmed(double peakG);
    }

    private static final double CRASH_G = 2.5;
    private static final double STILLNESS_G_DELTA = 0.3;
    private static final long STILLNESS_WINDOW_MS = 1000;
    private static final long IMPACT_WINDOW_MS = 100;
    private static final double EPSILON = 0.001;

    private int mode = MODE_IMPACT;
    private double shakeThresholdG = 1.8;
    private long shakeSustainMs = 3000;

    private int phase = PHASE_IDLE;
    private double lastMagnitudeG = 0.0;
    private Long impactStartMs = null;
    private double impactPeakG = 0.0;
    private Long shakeStartMs = null;

    private final List<Double> stillnessBuffer = new ArrayList<>();
    private final int stillnessSamples = (int) Math.ceil(STILLNESS_WINDOW_MS / 20.0);
    private final List<CrashListener> listeners = new ArrayList<>();

    public CrashDetector() {}

    public CrashDetector(int mode, double shakeThresholdG, long shakeSustainMs) {
        this.mode = mode;
        this.shakeThresholdG = shakeThresholdG;
        this.shakeSustainMs = shakeSustainMs;
    }

    public void setMode(int mode) {
        this.mode = mode;
        reset();
    }

    public int getMode() {
        return this.mode;
    }

    public void addListener(CrashListener listener) {
        listeners.add(listener);
    }

    public boolean onSample(float x, float y, float z, long timestampMs) {
        double g = Math.sqrt(x * x + y * y + z * z) / 9.81;
        this.lastMagnitudeG = g;

        // ── SUSTAINED_SHAKE Mode ──────────────────────────────────────────────
        if (this.mode == MODE_SUSTAINED_SHAKE) {
            if (g >= shakeThresholdG) {
                if (shakeStartMs == null) {
                    shakeStartMs = timestampMs;
                    phase = PHASE_SHAKING;
                    impactPeakG = g;
                } else {
                    impactPeakG = Math.max(impactPeakG, g);
                    long duration = timestampMs - shakeStartMs;
                    if (duration >= shakeSustainMs) {
                        phase = PHASE_CRASH_CONFIRMED;
                        double peak = impactPeakG;
                        for (CrashListener l : listeners) l.onCrashConfirmed(peak);
                        reset();
                        return true;
                    }
                }
            } else {
                shakeStartMs = null;
                phase = PHASE_IDLE;
            }
            return false;
        }

        // ── IMPACT Mode ───────────────────────────────────────────────────────
        stillnessBuffer.add(g);
        if (stillnessBuffer.size() > stillnessSamples) {
            stillnessBuffer.remove(0);
        }

        if (phase == PHASE_IDLE) {
            if (g >= CRASH_G - EPSILON) {
                phase = PHASE_IMPACT_DETECTED;
                impactStartMs = timestampMs;
                impactPeakG = g;
            }
            return false;
        }

        if (phase == PHASE_IMPACT_DETECTED) {
            if (g >= CRASH_G - EPSILON) {
                impactPeakG = Math.max(impactPeakG, g);
                long duration = timestampMs - (impactStartMs != null ? impactStartMs : timestampMs);
                if (duration >= IMPACT_WINDOW_MS) {
                    phase = PHASE_WAITING_STILLNESS;
                    stillnessBuffer.clear();
                }
            } else {
                phase = PHASE_IDLE;
                impactStartMs = null;
            }
            return false;
        }

        if (phase == PHASE_WAITING_STILLNESS) {
            if (stillnessBuffer.size() >= stillnessSamples) {
                double max = -Double.MAX_VALUE;
                double min = Double.MAX_VALUE;
                for (double val : stillnessBuffer) {
                    if (val > max) max = val;
                    if (val < min) min = val;
                }
                if ((max - min) < STILLNESS_G_DELTA && max < 1.5) {
                    phase = PHASE_CRASH_CONFIRMED;
                    double peak = impactPeakG;
                    for (CrashListener l : listeners) l.onCrashConfirmed(peak);
                    reset();
                    return true;
                }
            }
            return false;
        }

        return false;
    }

    public void reset() {
        phase = PHASE_IDLE;
        lastMagnitudeG = 0.0;
        impactStartMs = null;
        impactPeakG = 0.0;
        shakeStartMs = null;
        stillnessBuffer.clear();
    }

    public int getPhase() {
        return phase;
    }

    public double getLastMagnitudeG() {
        return lastMagnitudeG;
    }
}
