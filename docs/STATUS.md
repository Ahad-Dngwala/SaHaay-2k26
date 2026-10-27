# SaHaay — System Status & Architectural Audit

**Date:** October 2026  
**Document Purpose:** Baseline status report comparing existing repository code, historical pitch decks / documents, and the Hack for Social Cause 2027 specification.

---

## 1. What Already Exists and Works

Prior to this sprint, the repository contained two separate subsystems:
1. **Legacy Backend (`backend/`)**:
   - Express REST API with Socket.io (`app.js`, `server.js`).
   - MongoDB schemas for `User`, `Driver`, `Emergency`, `Assignment`, `EmergencyEvent`, `GpsLog`, `MessageLog`, and `TrafficAuthority`.
   - Dispatch controller & service (`backend/services/dispatch.service.js`) with Haversine distance computation and a basic 2-minute expansion timeout.
   - Basic SMS webhook endpoint expecting `EMERGENCY#lat,lng` strings.
   - Traffic notification service sending email alerts to authorities via Nodemailer.
2. **Legacy Web Client (`frontend/`)**:
   - Vite + React 18 web dashboard using Tailwind CSS and `@react-google-maps/api`.
   - Google Maps views for user emergency dispatch, driver acceptance, and admin overview.
3. **Legacy Mobile Packages (`frontend/packages/`)**:
   - Outdated Expo SDK 49 skeletons in `packages/user-app` and `packages/ambulance-app` with unintegrated accelerometer hooks and incomplete dependencies.

---

## 2. What Is Missing vs. Hackathon Spec

The hackathon requires a self-contained, offline-first prototype executable on any local developer environment (`npm i && npm run dev`) without cloud accounts or paid API keys. Critical missing elements in the legacy codebase:

| Spec Requirement | Legacy Codebase Gap | Target Solution |
| :--- | :--- | :--- |
| **No Cloud / No Paid APIs** | Depended on external MongoDB instance, Redis, Google Maps API key, and Twilio credentials. Failed without live local DB. | Pure in-memory TypeScript dispatch server (`server/`) + offline bundled GeoJSON road graph. |
| **Unified Zero-Config Runner** | Required running separate servers and ports manually (`npm run dev` in backend, `npm run dev` in frontend, plus Expo). | Single root `package.json` concurrently starting dispatch server (`:3000`) and unified Expo app (`:8081`). |
| **Compact ASCII SMS Codec** | Only supported uncompressed `EMERGENCY#lat,lng` strings exceeding budget. | Strict `S1|<uid36>|<lat36>|<lon36>|<ts36>|<flags36>|<crc>` base36 encoding ($\le 100$ chars, hard limit 160) with CRC validation. |
| **Transport State Machine** | Ad-hoc network error catching; no formal offline-first degradation. | Explicit 4-state reducer (`ONLINE` $\to$ `DEGRADED` $\to$ `OFFLINE_SMS` $\to$ `RECOVERED`) with persistent outbox & exponential backoff. |
| **Simulated Carrier** | Required paid Twilio SMS gateway. | In-process `SimulatedCarrier` with latency/loss injection sending tokens to `/sms/inbound` (labeled **SIMULATED**). |
| **Reliable Crash Detection** | Depended on missing `react-native-sensors` package; no stillness verification. | Expo-sensors Accelerometer ($20\text{ ms}$ interval), $\ge 2.5g$ threshold with post-impact stillness filter and `CrashSimulator`. |
| **Offline Map & Dead Reckoning** | Depended on Google Maps tile downloads. | Bundled `assets/ahmedabad-roads.geojson` rendered with `react-native-svg` + Turf.js smooth interpolation between $20\text{s}$ SMS pings. |
| **Self-Healing Re-Dispatch** | Required manual transfer button click. | Automatic/Driver "Simulate Breakdown" triggering state transition to `REDISPATCH`, searching from patient's current location. |
| **Tamper-Evident Audit Log** | Standard mutable Mongo collection without integrity protection. | Cryptographic append-only SHA-256 hash chain with `/audit/verify` validation. |
| **Benchmarking** | Claimed "< 200 ms" without measurement. | Real `npm run bench` measuring 1k and 10k ambulance spatial index matching latency reported in `docs/BENCHMARK.md`. |

---

## 3. Conflicts Between Existing Documents and This Spec

Where historical documents and the current specification conflict, **THIS SPEC WINS** (unless verified working code already satisfied the requirement). Every conflict and its resolution is recorded below:

### Conflict 1: Crash Countdown Duration
- **Deck (`organized.pdf` / slides):** States **30 seconds** safety countdown before sending SOS.
- **Pitch / Project Context:** Mentioned an earlier 5–10 seconds cancellation window.
- **Authoritative Resolution:** `COUNTDOWN_SEC = 30` by default in [`src/core/config.ts`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/src/core/config.ts), configurable between 5 and 30 seconds (`COUNTDOWN_MIN = 5`, `COUNTDOWN_MAX = 30`). This supersedes the earlier 10-second draft. Gated by `CountdownTimer` which guarantees exactly-once SOS emission at expiry and zero emissions if cancelled.

### Conflict 2: Database & Infrastructure
- **Deck & Legacy Backend:** Claims Cloud-Native MongoDB geospatial clusters, Redis queue, and Twilio GSM gateway.
- **Spec:** Requires immediate local execution (`npm i && npm run dev`) with zero external accounts or infrastructure hurdles.
- **Resolution:** Implement high-performance in-memory TypeScript spatial grid index on the Node server. Label external services as simulated where applicable.

### Conflict 3: Mapping Framework
- **Legacy Frontend & Implementation Notes:** Recommends Google Maps JavaScript API, or native C++ Organic Maps / MapLibre vector tiles.
- **Spec & Rules:** Must run in Expo Go and on web without native binaries or EAS builds.
- **Resolution:** Bundle Ahmedabad roads GeoJSON directly in `assets/ahmedabad-roads.geojson`, render using `react-native-svg`, and perform dead-reckoning marker projection via Turf.js. Production vector tile path is documented in `ARCHITECTURE.md`.

### Conflict 4: SMS Wire Protocol
- **Legacy Backend:** Parses `EMERGENCY#lat,long`.
- **Implementation Guide (§5):** Proposed a geohash-based variant `S1|<seq>|<uid>|<geohash9>|...`.
- **Spec:** Mandates fixed base36 fixed-point formula:
  `lat36 = base36(round((lat+90)*1e5))`
  `lon36 = base36(round((lon+180)*1e5))`
  `ts36 = base36(unix seconds)`
  `crc = 2-char base36 checksum`
- **Resolution:** Implemented the exact spec formula in [`src/core/sosCodec.ts`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/src/core/sosCodec.ts), delivering ~1 m precision in $< 45$ characters.

### Conflict 5: App Architecture (Multi-package vs Unified Expo App)
- **Legacy Frontend:** Split into `frontend/` (Vite) and `frontend/packages/` (separate unbuilt apps).
- **Spec:** Single unified Expo app running on Web and Android with role selection (Citizen, Driver, Control, Demo Director).
- **Resolution:** Single top-level Expo application with shared navigation and state, served concurrently with the dispatch backend.

---

## Authoritative Engineering Decision Record (Q1–Q10)

### Q1: Countdown Duration
- **Decision:** Default crash countdown is **30 seconds** (`Config.COUNTDOWN_SEC = 30`), configurable between 5 and 30 seconds (`COUNTDOWN_MIN` to `COUNTDOWN_MAX`). Demo Director can shorten it for fast demonstrations.
- **Implementation:** `src/core/crash/CountdownTimer.ts` implements this shared setting, emitting second ticks, gating transmission, and guaranteeing that cancellation completely prevents SOS, while completion sends exactly one SOS.
- **Test:** Validated in `src/core/crash/CountdownTimer.test.ts`.

### Q2: What Does "Under 200 ms" Measure?
- **Decision:** The claim strictly refers to the **in-process spatial-grid search** (`SpatialGrid.query()`), not end-to-end network transmission.
- **Approved Deck Wording:**
  > *"Rapid Ambulance Matching: Spatial-grid search completes in under 200 ms at a simulated fleet size of 10,000 ambulances in the measured benchmark."*
- **Empirical Measurement:** Reported in `docs/BENCHMARK.md`: $p50 = 2.4\ \mu\text{s}$, $p99 = 3.7\ \mu\text{s}$ at 10,000 synthetic ambulances in Ahmedabad.
- **Cautions:** Benchmark tests synthetic random coordinates; it measures in-memory index querying, not network or WebSocket I/O.

### Q3: Breakdown Location vs. Patient's Live GPS
- **Decision:** Both destinations are implemented and kept distinct:
  1. **Patient Destination:** Replacement ambulance routes to the patient's **latest known GPS coordinates** (`patientLatLive`, `patientLonLive`).
  2. **Breakdown Destination:** Stranded ambulance coordinates (`breakdownLat`, `breakdownLon`) are permanently recorded in the SHA-256 audit log for crew recovery.
- **Operational Reality:** Current implementation is breakdown-triggered re-dispatch (triggered via `/missions/:id/breakdown` or driver UI). Full automatic stall detection from zero-velocity telemetry streams is documented as a production roadmap item.
- **Test:** Validated in `server/src/dispatch.test.ts`.

### Q4: Green Corridor in Prototype
- **Decision:** `GET /control` serves a standalone traffic-authority dashboard receiving structured WebSocket notifications.
- **Approved Deck Wording:**
  > *"Green Corridor Coordination: Structured, simulated pre-clearance alerts for selected Ahmedabad junctions, displayed in the local traffic-authority dashboard."*
- **Constraint:** Strictly labelled as **ADVISORY NOTIFICATION ONLY (Simulated Pre-Clearance - No Direct Signal Actuation)** in code, UI, and audit logs. No claim of direct traffic signal actuation is made.

### Q5: Gazetteer Size & Address Precision
- **Decision:** 200-entry Ahmedabad gazetteer (`assets/gazetteer.json`) encodes localities as 2-character Base36 IDs ($36^2 = 1296 \ge 200$).
- **Explicit Semantics:** Locality centroid is an **address hint** for human dispatchers, not a street-level address. The token's Base36 coordinates remain the primary 1-metre location data.
- **Validation:** Bounds validation is enforced on both `encode()` and `decode()` (coordinates outside [-90, 90] / [-180, 180] throw RangeError on encode and return `ok: false` on decode).

### Q6: Expo Architecture
- **Decision:** Active tested prototype uses the root workspace runner with TypeScript dispatch server on port 3000 and Control Dashboard at `:3000/control`. Legacy apps in `frontend/` and `backend/` are retained for historical reference only.

### Q7: Ahmedabad Road Geometry
- **Decision:** Road network bundled in `assets/ahmedabad-roads.geojson` featuring 12 key arterial corridors (SG Highway, Ring Roads, Bridges, BRTS).
- **Labeling:** Explicitly labelled with `synthetic: true` in metadata and properties. Runtime map rendering works 100% offline without external Overpass API or tile server dependencies.

### Q8: DEMO_TIME_SCALE
- **Decision:** `DEMO_TIME_SCALE = 1` normally, set to `10` for demonstrations.
- **Timer Rescaling:** `setDemoTimeScale()` dynamically reschedules all active expansion timers proportionally to remaining nominal duration, so changing scale mid-mission immediately accelerates existing timeouts.
- **Test:** Validated in `server/src/dispatch.test.ts`.

### Q9: Simultaneous First Acceptance & 409 Conflict
- **Decision:** In-memory synchronous lock in Node.js guarantees that the first driver to accept atomically transitions mission status to `ASSIGNED`.
- **API Contract:** Winning driver receives `{ ok: true, won: true }` with HTTP 200. Any competing or late driver acceptance receives **HTTP 409 Conflict** with `{ error: 'Offer expired or mission already assigned to another unit', won: false }`.
- **Test:** Validated with concurrent acceptance test in `server/src/dispatch.test.ts` and `server/src/e2e-journey.test.ts`.

### Q10: Control Dashboard Endpoint
- **Decision:** Standalone Control Dashboard is served directly by Express at `http://localhost:3000/control`.
- **Capabilities:** Real-time mission tracking, ambulance fleet monitor, Green Corridor advisory alerts, SHA-256 chain verification, demo tamper button, and world reset.

