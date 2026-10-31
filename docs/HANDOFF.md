# HANDOFF.md — SaHaay Prototype Sprint

## SESSION: 2026-10-31 (M11 Real Geo, Routing & Maps Completed)

### CONTEXT
Hack for Social Cause 2027 — Healthcare, Wellbeing & Service Delivery.
SPEC: `docs/REAL_PROTOTYPE_SPEC.md` is authoritative.
Goal: Transform simulated prototype into real hardware-tested emergency response system across real Android devices and local server.

---

## NEXT: M12 — Online Mobile Applications (First Vertical Slice)
1. Unify mobile codebase around Expo dev-client with two app flavours: `citizen` and `driver`.
2. Citizen app: SOS button, location services, live tracking map with MapLibre, stage transitions.
3. Driver app: On-duty background toggle, incoming mission heads-up alert with TTL, accept/decline, 4-stage navigation workflow.
4. Test real device-to-device flow: Phone A triggers SOS -> Phone B receives heads-up within 3s -> accept -> live GPS updates on both devices.

---

## DONE

### M10: Truth Reset
- [x] Conducted Step 0 audit and created `docs/REALITY_LEDGER.md` cataloguing all 16 simulated/hardcoded components.
- [x] Moved legacy multi-package experimental codebase (`backend/`, `frontend/`) to `legacy/` directory.
- [x] Created `@sahaay/core` workspace package in `packages/core`.
- [x] Added `scripts/reality-check.js` to enforce spec section 10 rules.
- [x] Eliminated simulated driver auto-accept timer (`scaledMs(1.5)`) in `server/src/dispatch.ts`.
- [x] Converted broadcasted offer delivery (`broadcastToAll`) into targeted dispatch (`sendToAmbulance`).
- [x] Implemented SQLite persistence layer (`server/src/db.ts`) with `better-sqlite3`.
- [x] Added JWT token verification to WebSocket connection handshake (`server/src/ws.ts`).
- [x] Added admin privilege verification and production guards to sensitive routes (`server/src/routes.ts`).
- [x] Updated `.agent/rules/sahaay.md` to permit local Gradle and native Expo builds.

### M11: Real Geo, Routing & Maps
- [x] Built `RoutingProvider` interface with `OsrmProvider` and `HaversineFallbackProvider` (`server/src/routing.ts`).
- [x] Created OSM hospital dataset for Ahmedabad (`data/hospitals.json`) with emergency phone, ICU beds, and trauma capability.
- [x] Implemented nearest hospital auto-selection algorithm based on driving distance and live ETA (`server/src/hospitals.ts`).
- [x] Exposed `/api/routes/directions` and `/api/routes/nearest-hospital` REST endpoints (`server/src/routes.ts`).
- [x] Installed and integrated `maplibre-gl` into `apps/admin-web/` with interactive `RealFleetMap` component (`apps/admin-web/src/components/RealFleetMap.tsx`).
- [x] Added automated unit test suite for routing and hospitals (`server/src/routing.test.ts`).
- [x] All 64 tests passing across 9 test suites (`npm test`).

---

## KNOWN ISSUES / DECISIONS
- **Decision:** `findNearestHospital` uses fast Haversine distance filtering to identify candidate hospitals before executing driving OSRM route queries, guaranteeing sub-second selection without API rate-limit bottlenecks.
- **Decision:** MapLibre raster tiles configured with standard OpenStreetMap raster source with clear visual attribution.
- **Hardware Status:** Android SDK 34 platform-tools verified (`adb.exe` operational at `$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`, AVD `Bixuu-mobile` available).
