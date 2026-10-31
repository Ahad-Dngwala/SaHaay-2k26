# HANDOFF.md — SaHaay Prototype Sprint

## SESSION: 2026-10-31 (M14 Background Crash Detection Completed)

### CONTEXT
Hack for Social Cause 2027 — Healthcare, Wellbeing & Service Delivery.
SPEC: `docs/REAL_PROTOTYPE_SPEC.md` is authoritative.
Goal: Real prototype running on real Android hardware + laptop server with zero simulation on demo path.

---

## NEXT: M15 — Real Green Corridor (Advisory Pre-Clearance Lifecycle)
1. **Signal dataset:** Generate/validate OSM-derived signal dataset for Ahmedabad (`data/signals.json`) covering highway=traffic_signals & major junctions.
2. **Route-aware selection:** Snap real OSRM route polyline to signals within 25 m; calculate per-signal ETA from ambulance's last real GPS fix.
3. **Alert lifecycle:** Implement signal state transitions `PLANNED -> ALERTED (when ETA <= GREEN_CORRIDOR_LEAD_S = 60s) -> PASSED (within 30 m) -> CANCELLED`.
4. **Authority scoping:** Filter authority view by geographic boundary/bbox.
5. **Driven-route replay test:** Unit test on recorded OSRM response asserting exact alert sequence and timing.

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

---

## KNOWN ISSUES / DECISIONS
- **D8 Inner Class Serialization:** Anonymous and non-static inner classes on Android Java 8 bytecode can cause D8 parameter length null checks. Resolved by using named top-level runnable classes (`SosHttpTask.java`) and having services implement interfaces directly.
- **Hardware Integration:** APKs compiled with Java 8 bytecode and signed with v1/v2 schemes, tested on `emulator-5554` and ready for physical device deployment.
