# HANDOFF.md — SaHaay Prototype Sprint

## SESSION: 2026-10-31 (M10 Reality Reset Completed)

### CONTEXT
Hack for Social Cause 2027 — Healthcare, Wellbeing & Service Delivery.
SPEC: `docs/REAL_PROTOTYPE_SPEC.md` is authoritative.
Goal: Transform simulated prototype into real hardware-tested emergency response system across real Android devices and local server.

---

## NEXT: M11 — Real Maps, Positions and Routing
1. MapLibre GL JS integrated into Console.
2. `RoutingProvider` interface with `OsrmProvider` (public demo server default / local extract) and optional `GoogleDirectionsProvider`.
3. Live GPS telemetry stream ingestion from driver devices with adaptive cadence (1 Hz active, 5-10s idle).
4. Real dynamic route ETA computation (snapping fix to route, recomputing on deviation > 50m).
5. Nearest hospital selection from `data/hospitals.json` (OSM extract).

---

## DONE (M10: Truth Reset)
- [x] Conducted Step 0 audit and created `docs/REALITY_LEDGER.md` cataloguing all 16 simulated/hardcoded components.
- [x] Moved legacy multi-package experimental codebase (`backend/`, `frontend/`) to `legacy/` directory.
- [x] Created `@sahaay/core` workspace package in `packages/core` hosting pure codecs, crash detectors, countdown timers, and dead-reckoning logic.
- [x] Added `scripts/reality-check.js` to enforce spec section 10 rules.
- [x] Eliminated simulated driver auto-accept timer (`scaledMs(1.5)`) in `server/src/dispatch.ts`.
- [x] Converted broadcasted offer delivery (`broadcastToAll`) into targeted dispatch (`sendToAmbulance`) so drivers only see their own offers.
- [x] Implemented SQLite persistence layer (`server/src/db.ts`) with `better-sqlite3`.
- [x] Added JWT token verification to WebSocket connection handshake (`server/src/ws.ts`).
- [x] Added admin privilege verification and production guards to sensitive routes (`server/src/routes.ts`).
- [x] Updated `.agent/rules/sahaay.md` to permit local Gradle and native Expo builds.
- [x] Added integration test suite (`server/src/ws-targeted.test.ts`) validating targeted WebSocket delivery and unauthorized connection rejection.
- [x] All 61 automated tests passing cleanly (`npm test`).

---

## KNOWN ISSUES / DECISIONS
- **Decision:** SQLite database initialized with in-memory fallback during automated test runs (`NODE_ENV=test`) to guarantee clean idempotency and avoid file locks.
- **Decision:** WebSocket connection accepts `?token=<jwt>` parameter, extracting role and binding ambulance identity server-side.
- **Hardware Status:** Android SDK 34 platform-tools verified (`adb.exe` operational at `$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`, AVD `Bixuu-mobile` available).
