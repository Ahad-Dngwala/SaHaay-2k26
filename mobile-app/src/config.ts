/**
 * mobile-app/src/config.ts
 * Client config aligned with src/core/config.ts (single source of truth for tunables).
 */

export const Config = {
  // Crash Detection
  CRASH_G: 2.5,
  COUNTDOWN_SEC: 30,
  COUNTDOWN_MIN: 5,
  COUNTDOWN_MAX: 30,
  STILLNESS_WINDOW_MS: 1000,
  STILLNESS_G_DELTA: 0.3,

  // Dispatch & Matching
  SEARCH_RADIUS_M: 500,
  EXPAND_AFTER_S: 120,
  EXPAND_FACTOR: 2,
  MAX_RADIUS_M: 8000,

  // Tracking
  PING_INTERVAL_S: 20,

  // Demo & Time Scaling
  DEMO_TIME_SCALE: 1,

  // Backend Endpoints
  API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? 'http://localhost:3000'
    : 'http://localhost:3000',
  WS_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? 'ws://localhost:3000/ws'
    : 'ws://localhost:3000/ws',

  // Emergency Hotlines (India)
  EMERGENCY_HOTLINE: '112',
  AMBULANCE_HOTLINE: '108',

  // Default Ahmedabad Center (Navrangpura, Gujarat)
  AHMEDABAD_CENTER: {
    lat: 23.0300,
    lon: 72.5600,
    name: 'Navrangpura, Ahmedabad',
  },
} as const;

