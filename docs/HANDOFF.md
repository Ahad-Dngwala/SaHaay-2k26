# HANDOFF.md — SaHaay Prototype Sprint

## SESSION: 2026-10-31 (M19 Real Device Integration Repair Sprint Completed)

### CONTEXT
Hack for Social Cause 2027 — Healthcare, Wellbeing & Service Delivery.
SPEC: `docs/REAL_PROTOTYPE_SPEC.md` is authoritative.
Goal: Real prototype running on real Android hardware + laptop server with zero simulation on demo path.
Status: **ALL MILESTONES M10 THROUGH M19 COMPLETED, INTEGRATED & VERIFIED ON DUAL EMULATORS.**

---

## DEMO READINESS: READY FOR JURY & LIVE EVALUATION
- **Real Two-Phone / Two-Emulator Hardware Setup:**
  - Citizen Phone (`Bixuu-mobile` / `emulator-5554`): Running `artifacts/apk/SaHaay-Citizen.apk` with background accelerometer + gyroscope sensor listener, full-screen alert intent, Quick Settings tile, and real tile-backed Leaflet map.
  - Driver Phone (`Ahad-mobile` / `emulator-5556`): Running `artifacts/apk/SaHaay-Driver.apk` with authenticated JWT session, targeted WebSocket offers, atomic first-accept lock, real Leaflet GPS route navigation, and in-app Gateway mode.
  - Laptop / Central Server: Authoritative dispatch backend at port 3000/4000, serving React Web Console at `/console`.
- **Zero Simulation:** Verified by `scripts/reality-check.js` (0 issues).
- **Test Suite:** **91 / 91 automated tests passing** across 13 suites (`npm test`).
- **Benchmark:** Spatial grid matching measured at **0.026 ms** p99 at 10,000 ambulances ($< 200\text{ ms}$ claim verified).

---

## DONE

### M10: Truth Reset
- [x] Conducted Step 0 audit and created `docs/REALITY_LEDGER.md`.
- [x] Moved legacy code to `legacy/`.
- [x] Established `@sahaay/core` workspace package.
- [x] Added `scripts/reality-check.js`.
- [x] Eliminated simulated auto-accept timer.
- [x] Converted broadcasted offers into targeted dispatch (`sendToAmbulance`).
- [x] Implemented SQLite persistence layer (`server/src/db.ts`).
- [x] Added JWT WebSocket handshake authentication.

### M11: Real Geo, Routing & Maps
- [x] Implemented `OsrmProvider` and `HaversineFallbackProvider` (`server/src/routing.ts`).
- [x] Added OSM hospital dataset for Ahmedabad (`data/hospitals.json`) and nearest hospital auto-selection (`server/src/hospitals.ts`).
- [x] Integrated MapLibre GL JS into admin web portal (`apps/admin-web/src/components/RealFleetMap.tsx`).
- [x] All routing tests passing (`server/src/routing.test.ts`).

### M12: Online Mobile Apps (First Vertical Slice)
- [x] Updated WebSocket real-time subscription types to handle targeted `DRIVER_OFFER` and `OFFER_CANCELLED` events.
- [x] Updated mobile application state context (`mobile-app/src/context/AppContext.tsx`) to react to targeted offers and cancellations.
- [x] Verified full build of `mobile-app` (1517 modules transformed into `dist/`).
- [x] Verified full build of `apps/admin-web` (1505 modules transformed into `dist/`).
- [x] Built, zipaligned, and signed standalone Native Android APKs (`SaHaay-Citizen.apk` and `SaHaay-Driver.apk`) using Android API 34 tools and committed to `artifacts/apk/`.
- [x] 64 / 64 automated tests passing across 9 test suites (`npm test`).

### M13: Self-Healing on Devices
- [x] Implemented driver cancellation (`POST /missions/:id/cancel` and `POST /missions/:id/driver-cancel` with mandatory reason): releases driver to `AVAILABLE`, excludes driver from current mission via `previousAmbulanceIds`, resets search ring, and re-dispatches to the next available unit from patient's live GPS coordinates.
- [x] Implemented driver breakdown reporting (`POST /missions/:id/breakdown`): logs breakdown location for recovery crew, marks unit `OUT_OF_SERVICE`, and initiates re-dispatch to next eligible unit.
- [x] Implemented in-flight telemetry stall detection (`recordTelemetry`, `checkStallConditions`, `driverAcknowledgeStall`): when vehicle speed < 3 km/h for > 90 s while > 200 m from patient, issues `STALL_WARNING` prompt; if no acknowledgement or movement within 30 s, automatically escalates to re-dispatch.
- [x] Implemented offer TTL timers (25 s) with early ring expansion when all offers in the current ring expire or decline.
- [x] Implemented radius expansion exhaustion cap (> 8000 m): marks mission `FAILED` and broadcasts 108/112 emergency helpline instructions.
- [x] Implemented patient cancellation / "I'm safe" (`POST /missions/:id/patient-cancel`): marks mission `CANCELLED_BY_PATIENT` and immediately releases assigned ambulance.
- [x] Added automated test suite `server/src/self-healing.test.ts` covering all Scenarios 4.3 (1)-(5).
- [x] 71 / 71 automated tests passing across 10 test suites (`npm test`).
- [x] Zero issues in `scripts/reality-check.js`.

### M14: Background Crash Detection
- [x] Exported golden waveform test vectors (`PHONE_DROP`, `POTHOLE`, `CRASH_3G`, `CRASH_2_5G`, `SUSTAINED_SHAKE`) to `packages/core/test-vectors/crash-waveforms.json`.
- [x] Enhanced `CrashDetector` with dual-mode evaluation: `IMPACT` (>= 2.5 g sustained >= 100 ms + stillness) vs `SUSTAINED_SHAKE` (continuous shaking >= 1.8 g for >= 3 s for real-phone testing).
- [x] Implemented native Android `CrashMonitorService` foreground service holding a partial wake lock, sampling `TYPE_ACCELEROMETER` at ~50 Hz (`SENSOR_DELAY_GAME`), and managing countdown + cancellation.
- [x] Implemented Android Quick Settings `CrashTileService` (`TileService`) for instant arm/disarm toggle from system drawer.
- [x] Implemented `BootReceiver` for persisting and auto-resuming monitoring across phone reboots.
- [x] Updated `SaHaayCitizenBridge` JavaScript interface to expose arm, disarm, state, countdown cancel, and test trigger to WebViews.
- [x] Recompiled and signed native release APKs (`SaHaay-Citizen.apk` and `SaHaay-Driver.apk`).
- [x] Verified deployment and live execution on `emulator-5554`: foreground service started, armed, disarmed, and logged to logcat.
- [x] 73 / 73 automated tests passing across 10 test suites (`npm test`).

### M15: Real Green Corridor (Advisory Pre-Clearance Lifecycle)
- [x] Generated real traffic signals dataset for Ahmedabad (`data/signals.json`) with exact geographic coordinates, areas, and OSM IDs.
- [x] Implemented real route-snapping geometry engine (`distanceToPolylineM` with 25 m perpendicular threshold) in `server/src/green-corridor.ts`.
- [x] Implemented full signal lifecycle state machine (`PLANNED -> ALERTED (when ETA <= GREEN_CORRIDOR_LEAD_S = 60s) -> PASSED (within 30 m) -> CANCELLED`).
- [x] Implemented division-level traffic authority scoping (`filterSignalsForAuthority`) by bounding box and municipal police divisions (West, Central, North).
- [x] Integrated into server dispatch: automatic route generation upon ambulance assignment (`acceptMission`), real-time checkpoint progression via driver telemetry (`recordTelemetry`), and graceful cancellation upon breakdown/abort.
- [x] Exposed REST endpoints (`GET /api/green-corridor/:missionId`, `GET /api/authorities`, `GET /api/authorities/:id/signals`, `GET /api/signals/all`) with mandatory advisory disclaimers on every payload.
- [x] Added automated verification test suite `server/src/green-corridor.test.ts`.
- [x] 79 / 79 automated tests passing across 11 test suites (`npm test`).

### M16: Real SMS Fallback (Two Phones, GSM / Dual-Path)
- [x] Implemented complete GSM-7 Base36 compact SMS protocol in `@sahaay/core` (`smsProtocol.ts`) covering all 6 packet types (`S1` SOS, `A1` Assignment, `T1` Telemetry ping, `O1` Driver offer, `D1` Driver reply, `X1` Cancellation) with CRC-8 and total non-throwing decoders.
- [x] Implemented server-side `SmsGatewayManager` (`server/src/sms-gateway.ts`) with `LoopbackProvider`, `AndroidSmsGatewayProvider`, and in-app Driver gateway support.
- [x] Added `/sms/gateway/outbox` and `/sms/gateway/ack` endpoints for outbound SMS spooling.
- [x] Enhanced `POST /sms/inbound` to dynamically decode and handle all protocol packets (`S1`, `D1`, `X1`).
- [x] Cleaned up `TransportManager.ts` by removing the no-op hack `_transition({ ... _no: true })`.
- [x] Added native Android `SmsReceiver` and `SmsManager` integration to both Citizen and Driver APK manifests and bridges (`SaHaayCitizenBridge`, `SaHaayDriverBridge`).
- [x] Implemented Driver app in-app Gateway mode with `ForwardSmsHttpTask` for two-phone live blackout demos without 3rd-party SaaS dependencies.
- [x] Added automated test suite `server/src/sms-fallback.test.ts`.
- [x] 87 / 87 automated tests passing across 12 test suites (`npm test`).

### M17: Consolidated Web Console
- [x] Integrated unified React Web Console served at `/console` and `/admin` from compiled `apps/admin-web/dist`.
- [x] Configured server root `/` redirect to `/console`.
- [x] Operator control room: Live MapLibre GPS map with real hospital routing, active mission timeline, and real-time fleet state.
- [x] Driver Verification review and Citizen accounts inspection.
- [x] News & Alerts Publishing CMS with severity targeting and push broadcast.
- [x] APK Release Manager serving signed native APK downloads (`/downloads/SaHaay-Citizen.apk`, `/downloads/SaHaay-Driver.apk`).
- [x] Cryptographic SHA-256 tamper-evident audit log inspector.

### M18: Hardening, Docs Update & Benchmark Execution
- [x] Executed real spatial indexing benchmark (`server/src/bench.ts`): measured **0.026 ms** p99 latency at 10,000 ambulances, verifying slide claim ($< 200\text{ ms}$).
- [x] Generated updated `docs/BENCHMARK.md` with measured latencies.
- [x] Updated `docs/CLAIMS_MATRIX.md` mapping all problem/solution/USP claims to real code and test vectors.
- [x] Updated `docs/ARCHITECTURE.md` with master ecosystem architecture and Scope Boundary definitions.
- [x] Created `docs/DEVICE_TEST.md` detailing OEM background service configuration (Xiaomi, Samsung, Vivo, Oppo) and physical phone verification steps.
- [x] Verified full test suite: **87 / 87 tests passing** across 12 test suites (`npm test`).
- [x] Verified smoke test passing (`npm run test:smoke`).
- [x] TypeScript clean (`npx tsc --noEmit`) and reality check clean (`node scripts/reality-check.js`).
- [x] Native APKs recompiled, signed, and verified installed on `emulator-5554`.
- [x] Zero issues in `scripts/reality-check.js` and clean TypeScript (`npx tsc --noEmit`).
- [x] **Android Java Cleanliness Audit:** Resolved all 19 deprecation and lint warnings across both native apps.

### M19: Real Device Integration Repair Sprint (Auth, Targeted Dispatch, Real Tile Maps, Accelerometer + Gyroscope, Dual Emulator Installation)
- [x] **Part 1 — Mobile Runtime Reconciliation:**
  - Audited `apps/citizen-app/`, `apps/driver-app/`, and `mobile-app/`.
  - Documented canonical runtime architecture in `docs/MOBILE_RUNTIME_MAP.md`.
- [x] **Milestone M1 — Identity, Auth & SQLite Persistence:**
  - Added `sessions` table to SQLite in `server/src/db.ts` with auto-migration.
  - Updated `server/src/auth.ts` to persist and verify sessions against SQLite with memory caching.
  - Added `GET /api/driver/me` authenticated endpoint returning driver profile, vehicle details, and active assigned mission.
  - Enforced secure admin login using `process.env.ADMIN_PASSWORD`.
- [x] **Milestone M2 — Targeted Offers & Atomic Assignment:**
  - Updated `server/src/ws.ts`: mandatory JWT token verification for driver WebSocket connections; unauthenticated driver connections rejected with HTTP 4401.
  - Updated `apps/driver-app/assets/app.js`: eliminated hardcoded `amb-01` and replaced with dynamic authenticated session (`localStorage`).
  - Removed polling interval (`setInterval(..., 2500)`): offers now delivered purely via WebSocket `DRIVER_OFFER` events.
  - Atomic First-Accept Lock: `POST /missions/:id/accept` returns HTTP 200 `{ won: true }` for winner; competing drivers receive HTTP 409 `{ won: false }` and `OFFER_CANCELLED` WebSocket broadcast; Driver UI closes modal without navigating.
- [x] **Milestone M3 — Real Online Tile Maps & Live Telemetry:**
  - Bundled local offline-capable `leaflet.js` and `leaflet.css` in `apps/citizen-app/assets/` and `apps/driver-app/assets/`.
  - Replaced SVG simulated road paths in `apps/citizen-app/assets/index.html` and `apps/driver-app/assets/index.html` with real Leaflet OpenStreetMap containers.
  - Connected real OSRM polyline fetching (`/api/routing/route`) and live driver location reporting (`PATCH /ambulances/:id/location`).
  - Removed fake step timer animation (`marker.style.top = ...`).
- [x] **Milestone M4 — Native Android Crash Detection & Heads-Up Alerts:**
  - Updated `CrashDetector.java` with gyroscope sample tracking (`onGyroSample`) and angular velocity peak evaluation.
  - Updated `CrashMonitorService.java`: registered `Sensor.TYPE_ACCELEROMETER` AND `Sensor.TYPE_GYROSCOPE`, added full-screen heads-up intent (`setFullScreenIntent`), and dynamic location fix via `LocationManager`.
  - Ensured `CrashTileService.java` synchronizes directly with service armed status.
- [x] **Milestone M5 — Removal of Simulated Fallbacks in `mobile-app/`:**
  - Removed automatic `quickAssign` fallback timer (`setTimeout 2500ms`) and `defaultDriver` in `mobile-app/src/context/AppContext.tsx`.
  - Removed fake offline mission ID generation in `mobile-app/src/services/api.ts`.
- [x] **Milestone M6 — Build, Dual-Emulator Installation & Regression Verification:**
  - Recompiled and signed native APKs: `artifacts/apk/SaHaay-Citizen.apk` and `artifacts/apk/SaHaay-Driver.apk`.
  - Launched and verified dual emulators: `Bixuu-mobile` (`emulator-5554`) and `Ahad-mobile` (`emulator-5556`).
  - Installed `SaHaay-Citizen.apk` on `Bixuu-mobile` and `SaHaay-Driver.apk` on `Ahad-mobile`.
  - Captured live device verification screenshots (`artifacts/bixuu-screen.png` and `artifacts/ahad-screen.png`).
  - Added regression test suite `server/src/driver-auth-dispatch.test.ts`.
  - All **91 / 91 tests passing** across 13 test suites (`npm test`).

---

## KNOWN ISSUES / DECISIONS
- **Green Corridor Exclusion:** Green corridor features are explicitly decoupled from blocking core dispatch during this release.
- **Hardware Integration:** APKs compiled with Java 8 bytecode and signed with v1/v2 schemes, verified on AVDs Bixuu-mobile and Ahad-mobile. Physical dual-device verification on hardware with real GSM SIM cards and hardware accelerometers/gyroscopes remains a requirement for full telecommunication compliance testing prior to field deployment; AVD verification validates runtime behavior, WebSocket dispatch, and UI rendering without replacing physical hardware tests.
