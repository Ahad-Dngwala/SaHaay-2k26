# SaHaay — REAL PROTOTYPE SPEC (commit as `docs/REAL_PROTOTYPE_SPEC.md`)

Supersedes the "zero-cloud / simulated" posture of docs/STATUS.md, HANDOFF.md and `.agent/rules/sahaay.md`.
Goal: two (or more) real Android phones + one laptop server run the full SaHaay journey with real sensors, real GPS, real maps, real routing and real SMS. Nothing in the demo path may be simulated, hardcoded or faked.

---
## 0. Audit of the current repo (verified from source) — everything below must be fixed or deleted

### 0.1 Simulated / hardcoded in the ACTIVE stack (`server/`, `src/core/`, `server/src/*.html`)
| # | Where | Problem | Required fix |
|---|---|---|---|
| 1 | `server/src/dispatch.ts` `_searchRing` | Auto-accept timer `scaledMs(1.5)` accepts the nearest offer on behalf of a driver. | Delete. Only a real driver request (`POST /missions/:id/accept` with a driver JWT) can accept. |
| 2 | `dispatch.ts` `_searchRing` | Offers sent with `broadcastToAll` -> every connected client sees every offer. | Use `ws.sendToAmbulance(id)` (already exists) + push notification to that driver only. |
| 3 | `server/src/seed.ts` | 25 ambulances with fixed coordinates that never move. | Ambulances = registered drivers. Position comes only from the driver app's GPS stream. Seed is allowed only as an explicitly labelled `virtual: true` fleet for load tests (see 9). |
| 4 | `server/src/ws.ts` | Role / missionId / ambulanceId come from the URL query string. No auth. | JWT on WS handshake; server derives role + ids from the token. |
| 5 | `server/src/routes.ts` | No auth on accept / breakdown / status / location / `audit/tamper` / `demo/reset`. Anyone can act as any ambulance. | JWT middleware + role guards. `/audit/tamper` and `/demo/*` only when `NODE_ENV!=='production'` and role=admin. |
| 6 | `routes.ts` `decodeSmsToken` | Copy-pasted codec instead of importing `src/core/sosCodec.ts` (server `tsconfig` has `rootDir: ./src`). | Create workspace package `packages/core` (`@sahaay/core`) holding `src/core/*`; server, mobile and console import it. |
| 7 | `server/src/sos.html` | Offline packet is FAKE: `S1|uid|0|ts5e587pk|lat*1e4|lon*1e4|addr|1|f6` (9 fields, hardcoded geohash and CRC `f6`); the server's 7-field decoder rejects it. Also hardcoded: `eta-display='120s'`, `patientName:'Aarav Sharma'`, locality dropdown, JS-only countdown, status `EN_ROUTE` (not a real `MissionStatus`). | Replace the page with a real web citizen client (browser geolocation, real `encode()` from `@sahaay/core`, real ETA from the server). |
| 8 | `dispatch.ts` `_generateGreenCorridor` | 10 hardcoded junctions, straight-line distance, fixed 40 km/h, computed once at assignment, `alerted` never flips. | Replace with the real Green Corridor engine (section 6). |
| 9 | `dispatch.ts` `updateMissionStatus` | Any status string accepted, no transition rules; `ON_SCENE`/`TRANSPORTING` have no UI or endpoint. | State machine with allowed transitions + actor checks (section 4). |
| 10 | `dispatch.ts` | No "driver cancels after accepting". `reportBreakdown` is the only recovery path. `declineMission` only works while `DISPATCHING`. | Add `driver-cancel` (section 4.3). |
| 11 | `src/core/transport/*` | `SmsTransport` only calls `SimulatedCarrier`; `TransportManager.send` contains a no-op hack (`_transition({... _no:true})`); `HttpTransport` hardcodes `/missions`. | Real Android SMS transport (section 7); remove hack; transport chosen by real connectivity probe. |
| 12 | `CrashDetector.ts`, `DeadReckoningTracker.ts` | Correct and tested but wired to nothing (no sensor, no map). | Port detector to a native Android foreground service (section 5); wire the tracker to the map layer (section 3). |
| 13 | `control.html` and docs | Docs and README promise a "fleet map (Leaflet/Canvas)". There is NO map anywhere in the active stack — only tables. | Real map in the Console (section 8). |
| 14 | `docs/walkthrough.md`, `walkthrough.md` | Document endpoints that do not exist (`/ambulance/accept`, `/ambulance/breakdown`), a Leaflet map, geohash packets. | Rewrite after M18 so docs match code. |
| 15 | `.agent/rules/sahaay.md` | Forbids native modules, APKs and EAS. | Replace with section 10 rules (local Gradle builds are allowed; EAS cloud still not used). |
| 16 | In-memory state only | Restart = all missions, audit chain and accounts lost. | SQLite persistence (section 2). |

### 0.2 Legacy code to retire
- `backend/` (Mongo, Redis, Twilio, Socket.io) and `frontend/` (Vite + `frontend/packages/*` Expo 49 sketches) belong to the first architecture. The Expo packages are broken: they import `@emergency/shared` which is not resolvable, `react-native-geolocation-service` which cannot run in Expo Go, `EmergencyScreen` imports `Card` from `Button`, `useGearo` uses a threshold of 50 on `react-native-sensors`, and `gearoService.js` is a sine-wave simulator.
- Move them to `legacy/` (do not delete history), exclude from CI and root workspaces, remove stray files: `frontend/--yes`, merge-conflict markers in `frontend/.gitignore`.
- **Why two dashboards exist:** `frontend/src/pages/AdminDashboard.jsx` is the old Mongo/axios admin page; `server/src/control.html` is the newer in-memory Control Dashboard. They were built for two different architectures and nobody merged them. Result: ONE Console (section 8) with role-based views (operator, traffic authority, admin). The old admin page is retired.

### 0.3 What is already good (keep)
`sosCodec` (+23 tests), `CountdownTimer`, `CrashDetector`, `TransportManager` reducer, `DeadReckoningTracker`, `SpatialGrid`, atomic first-accept lock, SHA-256 audit chain, `bench.ts`, CI workflow. Keep all 58 tests green throughout.

---
## 1. Target architecture

```
packages/core        @sahaay/core  pure TS: config, codecs (S1/A1/T1/O1/D1/X1), crash detector, countdown, reducers, dead-reckoning, state-machine
server/              Node 22 + Express + ws + SQLite. Auth, dispatch, routing, green-corridor, sms-gateway adapter, audit, announcements
apps/mobile/         ONE Expo project (latest stable SDK, dev-client, TypeScript, expo-router) -> two APK flavours: `citizen` and `driver`
  modules/sahaay-native/   Expo Module (Kotlin): CrashMonitorService, QuickSettings TileService, SmsBridge, DutyService, boot receiver
apps/console/        Web Console served by the server at /console (Vite+React or plain TS). Replaces control.html, sos.html and the legacy admin page
data/                signals + hospitals extracted from OSM (static JSON, generated by scripts/)
scripts/             gen-signals.ts, reality-check.js, device runbook helpers, fleet-sim (labelled virtual)
```
Networking for tests: laptop and phones on the same Wi-Fi (`http://<LAN-IP>:3000`) or `adb reverse tcp:3000 tcp:3000` over USB. Allow cleartext HTTP only in debug builds. A tunnel (cloudflared) is optional for internet tests. Document in `docs/DEVICE_TEST.md`.

## 2. Server data and auth
- SQLite via `better-sqlite3` (repository layer so the DB can be swapped). Tables: `users`, `devices`, `drivers` (ambulance, plate, status, last_fix), `missions`, `mission_events`, `positions` (ring buffer per mission), `offers` (mission, driver, sent_at, ttl, outcome), `audit` (hash chain persisted, verified on boot), `announcements`, `signals`, `hospitals`.
- `SpatialGrid` stays in memory as an index rebuilt from `drivers` at boot.
- Auth: no paid OTP. Citizens register name + phone and get a device-bound JWT. Drivers register with phone + plate and are activated by an admin in the Console (so a random person cannot become an ambulance). Admin created via env bootstrap. Short-lived access + refresh token. WS handshake requires JWT.
- Rate-limit SOS per phone and per IP; reject duplicate `sosUid` (already idempotent).

## 3. Real maps, positions and routing
- Map stack: MapLibre (`@maplibre/maplibre-react-native`) in the apps, MapLibre GL JS in the Console. Tiles: OSM raster for online use. Do NOT hammer tile.openstreetmap.org — put the tile URL in config and note that production needs a tile provider or self-host.
- Routing behind a `RoutingProvider` interface: default `OsrmProvider` (public demo server for the prototype only, rate-limited and not for production; self-host OSRM in Docker on an India extract for stable demos), optional `GoogleDirectionsProvider` when `GOOGLE_MAPS_API_KEY` is set. Output: polyline, distance, duration, per-step durations. Cache results by (origin cell, destination).
- Live positions: driver app posts GPS at adaptive rate (1 Hz while on a mission, 5-10 s when idle on duty). Server stores, updates the grid, fans out to the mission room. Citizen app posts patient position when it moves more than 15 m. All markers on all clients are real fixes; between fixes `DeadReckoningTracker` smooths, and every marker shows "last update Ns ago".
- ETA = remaining route duration from the last real fix (snap to route), recomputed on deviation > 50 m; never a constant.
- Reroute if the driver deviates, or if the patient moves > 100 m.
- Hospital: nearest hospital from `data/hospitals.json` (OSM extract) chosen by route time; shown to the citizen, driver and Console.

## 4. Mission lifecycle (real, Uber-style)
### 4.1 States and allowed transitions
`SEARCHING -> OFFERED -> ASSIGNED -> EN_ROUTE_TO_PATIENT -> ARRIVED -> TRANSPORTING -> AT_HOSPITAL -> COMPLETED`
Side exits: `CANCELLED_BY_PATIENT` (only while SEARCHING/OFFERED/ASSIGNED), `FAILED` (all rings exhausted -> notify operators in the Console, no silent fail), `REDISPATCH` (driver cancel / breakdown / offer TTL). Every transition: validated, actor-checked, written to `mission_events` and to the audit chain, pushed over WS (and SMS when the party is in SMS mode).

### 4.2 Offers
- Offers go ONLY to eligible drivers: `status=AVAILABLE`, on duty, last fix younger than 60 s, not in `previousDriverIds` for this mission, within the current ring. A driver with an active mission never receives offers.
- Each offer has a TTL (config, default 25 s). On TTL expiry the offer is cancelled for that driver and counted as a "no response" (trust score).
- Ripple ladder unchanged (500 m, x2 after 120 s, max 8 km) but the ring also advances early when every driver in the ring has declined or timed out.
- First `accept` wins atomically (HTTP 200); everyone else gets 409 and a push "offer cancelled".
- `DEMO_TIME_SCALE` stays as a Console-only developer tool, off by default, shown with a visible banner when active.

### 4.3 Self-healing — required scenarios (must be automated tests AND runnable on devices)
1. Driver 1 accepts, then taps "Cancel mission" (reason required) -> mission goes `REDISPATCH`, driver 1 becomes `AVAILABLE` again but is excluded from this mission, ring search restarts from the patient's LIVE position, driver 2 (in range, available) receives the offer, driver 3 (busy on another mission) receives nothing.
2. Driver 1 breakdown -> same flow, breakdown coordinates logged for crew recovery, driver 1 `OUT_OF_SERVICE` until an admin clears it.
3. Telemetry-based stall detection: driver ASSIGNED/EN_ROUTE, speed < 3 km/h for more than N seconds (config, default 90) while far from the patient -> server prompts the driver ("Are you OK?") and escalates to automatic redispatch if no reply in 30 s. (Closes the "no automatic stall detection" gap listed in LIMITATIONS.md.)
4. No driver in 8 km -> `FAILED` + Console alert + SMS/push to the citizen with 108/112 instructions.
5. Patient cancels or marks "I'm safe" -> ambulance released, driver notified.

## 5. Real crash detection (Android native, background, no app open)
Native Expo Module in Kotlin, because JS cannot run reliably with the screen off.
- `CrashMonitorService`: foreground service (type declared per Android 14/15 rules — verify on the test phone; `specialUse` with a justification string is acceptable for sideloaded builds) holding a partial wake lock, listening to `TYPE_ACCELEROMETER` at ~50 Hz (`SENSOR_DELAY_GAME`, batched where supported) with gyroscope as an optional secondary confirmation. Persistent notification with Arm/Disarm actions.
- **Quick Settings tile** (`TileService`) toggles monitoring on/off; on Android 13+ offer the in-app prompt to add the tile (`requestAddTileService`). State survives process death (DataStore/SharedPreferences) and reboot (`BOOT_COMPLETED` receiver, only if the user had armed it).
- Detector: port `CrashDetector.ts` to Kotlin. Both implementations must pass the same golden vectors: export `CrashSimulator` waveforms (`PHONE_DROP`, `POTHOLE`, `CRASH_3G`, `CRASH_2_5G`) to `packages/core/test-vectors/crash-waveforms.json`, test in Jest AND in a Kotlin unit test.
- **Two modes (config `CRASH_MODE`)** — the user's test requirement and the pitch spec both stay true:
  - `IMPACT` (default, pitch spec): >= 2.5 g sustained >= 100 ms, then post-impact stillness 1000 ms.
  - `SUSTAINED_SHAKE` (device-testing mode, labelled in the UI): magnitude above a threshold for `SHAKE_SUSTAIN_S` (configurable 3-5 s). This lets the team trigger a real SOS from a real phone without crashing a car. It is NOT a crash model and must be described honestly in docs.
- On trigger: full-screen-intent heads-up notification with big CANCEL, vibration + alarm sound, countdown from `COUNTDOWN_SEC` (30; Console/dev setting may shorten to 5-30). Exactly-once SOS, persisted so a process kill during the countdown still fires or cancels correctly.
- At expiry: read a real GPS fix (`LocationManager` GPS+network, no Play Services dependency; last-known fix fallback with age shown); if the connectivity probe says ONLINE -> HTTP `POST /sos`; else -> real SMS (section 7). Flag `crash_auto`.
- Permissions flow with plain-language onboarding: location (incl. background), notifications, SMS, battery-optimisation exemption, `USE_FULL_SCREEN_INTENT`. Document OEM kill-list steps (Xiaomi/Vivo/Oppo/Samsung) in `docs/DEVICE_TEST.md`.

## 6. Green Corridor (primary focus) — real, still honest
Honest framing stays: the system sends advisory pre-clearance alerts to registered traffic authorities; it does NOT actuate signals.
1. **Signal data:** `scripts/gen-signals.ts` queries OSM (Overpass) for `highway=traffic_signals` + major junction nodes inside the Ahmedabad/Gandhinagar bbox, saves `data/signals.json` (id, lat, lon, name if any, source=OSM, fetched_at). Runtime never depends on Overpass.
2. **Route-aware selection:** after assignment (and on every reroute) take the real route polyline, find signals within 25 m of the line, order by distance along the route, compute for each: distance ahead, ETA from the ambulance's LAST REAL FIX using per-step durations, and a confidence window (+/- from recent speed variance).
3. **Alert lifecycle per signal:** `PLANNED -> ALERTED` (when ETA <= `GREEN_CORRIDOR_LEAD_S`, default 60 s) `-> PASSED` (ambulance within 30 m or past it along the line) `-> CANCELLED` (reroute/cancel/breakdown). `alerted` flag flips for real; each change is audited.
4. **Recipients:** registered traffic authorities (table `authorities` with area polygon/bbox, contact, role). Delivery: Console "Authority" view (live), webhook, and optional email via the existing SMTP service. Each authority sees only signals inside its area.
5. **Visual:** both mobile apps and the Console draw the route, the signals ahead coloured by lifecycle state, and the ETA at each. The citizen sees "route is being cleared: next signal in 40 s" (as information, not a promise).
6. **Best path:** route chosen by the RoutingProvider; when two alternatives are within 10 % of duration, prefer the one with fewer signals (config `PREFER_FEWER_SIGNALS`) and show the choice in the Console.
7. Tests: unit tests on a recorded real OSRM response fixture + a driven-route replay that asserts the exact state sequence and timing of alerts.

## 7. Real offline SMS fallback
- Protocol in `@sahaay/core` (`smsProtocol.ts`), all ASCII GSM-7, one packet = one SMS (<= 160), CRC-8, versioned, total decoders (never throw):
  - `S1` citizen SOS (existing codec) — citizen -> gateway
  - `A1` assignment (mission id, plate, driver first name, ETA s, driver position) — server -> citizen
  - `T1` tracking ping (seq, lat, lon, speed, heading, ETA, fix time) — server -> citizen (adaptive cadence 15-30 s)
  - `O1` offer to a driver in SMS mode (mission id, patient lat/lon, distance, TTL) — server -> driver
  - `D1` driver reply/telemetry (accept/decline/arrived/position, seq) — driver -> server
  - `X1` cancel — either direction
  Pick ONE design: the existing base36 `sosCodec` format. Mark the geohash design in `docs/implementation.md` as superseded.
- Android native `SmsBridge`: `SmsManager.sendTextMessage` with sent/delivery PendingIntents and a retry outbox (persisted), manifest `BroadcastReceiver` for `SMS_RECEIVED` filtered by prefix and sender allow-list, persisted inbox with dedupe by `seq`. Packets are decoded in `@sahaay/core` and fed into the SAME app store as WebSocket messages, so the map updates identically and shows a "via SMS" badge + packet age. `DeadReckoningTracker` fills the gaps between pings.
- Server side `SmsGateway` interface with providers: `AndroidSmsGatewayProvider` (capcom6/android-sms-gateway REST on a spare SIM phone — Apache-2.0, recommended for the demo), `TwilioProvider` (optional), `LoopbackProvider` (tests only, labelled). Also an in-app **Gateway mode** in the driver app (toggle): forwards received `S1/D1` SMS to the server over HTTP and sends server-queued SMS through `SmsManager`, so two phones plus one laptop are enough for a live blackout demo.
- Transport choice from a real connectivity probe (HTTP health check with timeout + `NetInfo`), through the existing `TransportManager` reducer, with the hack removed. A "Force blackout" switch in the dev menu only flips the probe; it does not bypass anything.
- Honest constraints go in the UI/docs: SMS needs GSM signal (it is "no data", not "no network"); Android only; India commercial SMS needs TRAI DLT registration; sideloaded APK may need "Allow restricted settings" for SMS permissions.

## 8. One Web Console (replaces control.html, sos.html, legacy admin)
Served at `/console`, role-based login:
- **Operator:** live map (all drivers coloured by status, missions, routes, signals), mission table with timeline, force actions (reassign, expand ring, cancel, mark failed -> manual dispatch), alerts for `FAILED`/stall.
- **Traffic Authority:** only their area, upcoming ambulances + per-signal ETA/alert state (section 6).
- **Admin:** approve/suspend drivers, authorities CRUD, **News/Announcements feed** (title, body, severity, target = all / citizens / drivers; delivered by WS + push + shown in app feed), SOS/drill mode, audit verify, system health, config (crash mode, countdown, TTLs).
- **Dev tools tab** (hidden in production): time scale, tamper demo, blackout probe override, virtual fleet spawner.
- The `/sos` web page is replaced by a minimal real citizen web client (browser geolocation + real `encode()`), kept only as a fallback for people without the app.

## 9. Virtual fleet for >2 drivers (testing aid, not part of the product)
`scripts/fleet-sim` registers N drivers through the REAL API, authenticates with real JWTs and drives real OSRM routes while posting GPS like a phone would. Everything they create is flagged `virtual:true` and shown with a "VIRTUAL" badge in the Console. Used for: multi-driver self-heal tests, load tests, screenshots. Never counted as a feature.
Alternative real option: Android emulators (AVD) as extra drivers with `adb emu geo fix` (see `scripts/emu.sh`) — fully real client code.

## 10. Rules for the agent (replace `.agent/rules/sahaay.md`)
1. Read `docs/HANDOFF.md` and this spec first. Work milestone by milestone; update HANDOFF.md at the end of each.
2. NOTHING in the demo path may be simulated, hardcoded or random. If something truly cannot be real in a milestone, label it `SIMULATED` in code + UI + `docs/REALITY_LEDGER.md`, and treat that as a failing item to close.
3. `scripts/reality-check.js` runs in CI and fails on: `Math.random()` in non-test server/app code, `setTimeout` that calls `acceptMission`, hard-coded patient/driver names or coordinates outside `data/` and tests, `'SIMULATED'` tags not listed in the ledger.
4. Native builds are allowed: `npx expo prebuild` + local Gradle (`npx expo run:android --device`). No EAS cloud builds. Keep generated `android/` committed.
5. Verify, don't assume: after every change run typecheck, `npm test`, then run on a device/emulator and LOOK (screenshots via `adb exec-out screencap -p`, logs via `adb logcat`). Max 5 fix attempts per error, then log in HANDOFF "KNOWN ISSUES".
6. Small commits per milestone (`git commit -m "M12: ..."`). Never commit secrets; `.env.example` only.
7. Keep every file < 1000 lines. Pure logic lives in `packages/core` with tests. Tunables only in `packages/core/src/config.ts`.
8. Measure, never invent numbers. Re-run `npm run bench` and report what you measured. Real end-to-end latencies (tap -> offer visible on driver phone) must be measured on devices and logged in `docs/BENCHMARK.md`.
9. Prefer plain code and few dependencies; every dependency must be justified in HANDOFF.

## 11. Milestones (each with an exit test — do them in this order, the first vertical slice matters most)
| # | Milestone | Exit criteria |
|---|---|---|
| M10 | **Truth reset:** reality audit (`docs/REALITY_LEDGER.md`), `packages/core` workspace, legacy moved, rules replaced, `reality-check.js`, SQLite + auth + WS auth, remove auto-accept and broadcast offers | 58 tests still green; unauthenticated accept returns 401; offers reach only the targeted driver (integration test with 3 real WS clients) |
| M11 | **Real geo:** MapLibre in Console, RoutingProvider (OSRM), live positions, real ETA, hospital choice | Moving a real phone moves its marker in the Console within 2 s; ETA changes with progress |
| M12 | **Mobile apps (online core):** one Expo dev-client project, two flavours, auth, location, map, citizen SOS button, driver duty + offer + accept + navigation states | Phone A taps SOS; Phone B shows heads-up offer within 3 s even with screen off; accept -> both see each other live. Record a screen capture |
| M13 | **Self-healing on devices:** driver cancel, breakdown, stall detection, busy-exclusion, TTL | Scenarios 4.3 (1)-(5) pass as automated tests AND on 3 devices/emulators |
| M14 | **Background crash detection:** native service + tile + notification + countdown + exactly-once SOS | Armed from the tile, phone in pocket with screen off, sustained shake for N s triggers the countdown, cancel works, expiry sends a real SOS; golden-vector tests pass in Jest and Kotlin |
| M15 | **Green Corridor (real):** signals dataset, route-aware planner, lifecycle, authority view, map overlays | Driving a recorded real route replays PLANNED->ALERTED->PASSED in order with correct timing; authority sees only its area |
| M16 | **SMS fallback (real):** protocol packets, SmsBridge, gateway mode / android-sms-gateway, map rendering from SMS | Data OFF on citizen phone: SOS sent by real SMS, mission created, A1/T1 SMS arrive and the marker moves on the citizen map with "via SMS" badge |
| M17 | **Console completion:** roles, news feed, driver approval, authorities, dev tools | News posted in Console appears on both phones; driver approval gates duty |
| M18 | **Hardening + docs:** rewrite walkthrough/ARCHITECTURE/CLAIMS_MATRIX to match code, `docs/DEVICE_TEST.md`, final reality-check, benchmark of real latencies, demo script + backup video | All claims in CLAIMS_MATRIX link to a test or a recorded device run; ledger has zero open SIMULATED items on the demo path |

## 12. Definition of done = the live demo script
1. Three phones: Citizen (C), Driver 1 (D1), Driver 2 (D2); laptop shows the Console.
2. Both drivers go on duty; Console shows them on the map at their real locations.
3. C arms crash monitoring from the quick-settings tile, locks the phone; sustained shake -> countdown notification -> expiry -> SOS.
4. D1 and D2 both get heads-up offers; D1 accepts; D2's offer cancels. C sees D1's name/plate/ETA and live marker; route + green-corridor signals appear.
5. D1 taps "Cancel mission" -> C sees "finding a replacement"; D2 gets the offer, accepts; C's map switches to D2 within seconds.
6. Turn off data on C -> next updates arrive by SMS and still move the marker (badge "via SMS").
7. Admin posts a news item -> appears on all phones. Audit chain verifies; Console shows the complete timeline.
