/**
 * src/core/config.ts
 * SINGLE SOURCE OF TRUTH for all SaHaay tunables.
 * No magic numbers anywhere else in the codebase — import from here.
 */

export const Config = {
  // ── Crash Detection ─────────────────────────────────────────────────────────
  /** Minimum magnitude in g that triggers the crash countdown (accelerometer). */
  CRASH_G: 2.5,

  /**
   * Countdown seconds before auto-SOS is sent after impact detected.
   * Range: 5–30. Slide value = 30; pitch brief said 5–10 (conflict resolved:
   * slide wins, 30 s, see docs/STATUS.md Q1). Demo Director can override.
   */
  COUNTDOWN_SEC: 30,

  /** Minimum countdown allowed via Demo Director / config (seconds). */
  COUNTDOWN_MIN: 5,
  /** Maximum countdown allowed via Demo Director / config (seconds). */
  COUNTDOWN_MAX: 30,

  /**
   * How long post-impact the phone must be nearly-still (Δg < STILLNESS_G_DELTA)
   * to confirm a real crash (avoids pothole false positives).
   */
  STILLNESS_WINDOW_MS: 1000,
  STILLNESS_G_DELTA: 0.3,

  // ── Dispatch & Matching ─────────────────────────────────────────────────────
  /** Initial search radius around patient (metres). */
  SEARCH_RADIUS_M: 500,

  /** Seconds to wait at each ring before expanding. */
  EXPAND_AFTER_S: 120,

  /** Offer time-to-live before automatic timeout / decline (seconds). */
  OFFER_TTL_S: 25,

  /** Multiplier applied to radius on each expansion step. */
  EXPAND_FACTOR: 2,

  /** Maximum search radius cap (metres). */
  MAX_RADIUS_M: 8000,

  /** In-flight stall detection: maximum stationary duration before warning (seconds). */
  STALL_THRESHOLD_S: 90,

  /** Stall escalation: time driver has to respond to prompt before auto-redispatch (seconds). */
  STALL_ESCALATION_S: 30,

  /** Minimum distance to patient to trigger stall warning (metres). */
  STALL_MIN_DISTANCE_M: 200,

  // ── Tracking ─────────────────────────────────────────────────────────────────
  /** Seconds between ambulance location pings (SMS-style silent updates). */
  PING_INTERVAL_S: 20,

  // ── Demo & Time Scaling ─────────────────────────────────────────────────────
  /**
   * Divides all server timers so a 120 s expansion becomes 12 s when set to 10.
   * Default 1 (real time). Demo Director panel sets to 10.
   * NOTE: ETA display values are kept nominal (not divided) to avoid confusing
   * the audience.
   */
  DEMO_TIME_SCALE: 1,

  // ── Server ──────────────────────────────────────────────────────────────────
  SERVER_PORT: typeof process !== 'undefined' && process?.env?.PORT ? Number(process.env.PORT) : 3000,
  EXPO_PORT: 8081,

  // ── SMS Codec ───────────────────────────────────────────────────────────────
  /** Hard SMS character budget. */
  SMS_MAX_CHARS: 160,
  /** Soft limit for the SOS token (leaves headroom). */
  SMS_TOKEN_MAX_CHARS: 100,

  // ── Green Corridor ──────────────────────────────────────────────────────────
  /** Lead-time in seconds before a junction is alerted. */
  GREEN_CORRIDOR_LEAD_S: 60,

  // ── Offline Map ─────────────────────────────────────────────────────────────
  /**
   * Ahmedabad bounding box for road GeoJSON fetch and synthetic grid generation.
   * [west, south, east, north]
   */
  AHM_BBOX: [72.47, 22.94, 72.68, 23.12] as [number, number, number, number],
} as const;

export type ConfigKey = keyof typeof Config;
