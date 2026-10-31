/**
 * server/src/config-server.ts
 * Server-side copy of config constants (avoids cross-package import issues).
 * Single source of truth lives in src/core/config.ts — keep in sync.
 */
export const Config = {
  CRASH_G: 2.5,
  COUNTDOWN_SEC: 30,
  SEARCH_RADIUS_M: 500,
  EXPAND_AFTER_S: 120,
  OFFER_TTL_S: 25,
  EXPAND_FACTOR: 2,
  MAX_RADIUS_M: 8000,
  STALL_THRESHOLD_S: 90,
  STALL_ESCALATION_S: 30,
  STALL_MIN_DISTANCE_M: 200,
  PING_INTERVAL_S: 20,
  DEMO_TIME_SCALE: 1,
  SERVER_PORT: Number(process.env.PORT) || 3000,
  SMS_MAX_CHARS: 160,
  SMS_TOKEN_MAX_CHARS: 100,
  GREEN_CORRIDOR_LEAD_S: 60,
  AHM_BBOX: [72.47, 22.94, 72.68, 23.12] as [number, number, number, number],
} as const;
