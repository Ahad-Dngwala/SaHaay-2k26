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
- **Pitch / Project Context:** Mentions **5–10 seconds** cancellation window.
- **Resolution:** Set `COUNTDOWN_SEC = 10` by default in [`src/core/config.ts`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/src/core/config.ts), configurable between 5 and 30 seconds. This provides quick demo responsiveness while remaining realistic for road safety.

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

## Questions

Below are all ambiguities, collisions, and unresolved design questions detected during analysis of the spec vs. existing docs:

### Q1: Countdown duration (COUNTDOWN_SEC) — Deck vs Prompt
- **Deck (USP slide):** 30-second countdown before SOS.
- **Earlier pitch brief (project_context.md):** 5–10 second cancellation window.
- **This prompt (S5):** "30-second countdown" explicitly, configurable 5–30 in config.ts.
- **Decision:** `COUNTDOWN_SEC = 30` matches the slide and this prompt. Configurable via `config.ts`. Demo Director can set it lower for faster demos.

### Q2: "200 ms dispatch" — what exactly is measured?
- The slide states "under 200 ms". This cannot mean end-to-end over network; only the in-process spatial search is consistently sub-200 ms.
- **Decision:** `docs/BENCHMARK.md` (generated by `npm run bench`) will explicitly state: "dispatch *search* latency (in-process only, excluding network I/O)". Slide text must be annotated accordingly. Any claim is validated by actual measured numbers.

### Q3: Breakdown → search from breakdown location vs patient's live GPS (S2 vs U1 collision)
- **S2 (slide):** "replacement dispatched to the breakdown location."
- **U1 (USP):** "restarts from the patient's LIVE GPS location."
- **Conflict:** These say different things about where the replacement ambulance is sent.
- **Decision (this prompt explicitly resolves it):** Implement BOTH. (a) Replacement ambulance routes to the patient's **latest known GPS position**. (b) The breakdown coordinates are **logged** in the audit trail (for crew recovery). Reword the slide to one sentence: "Replacement sent to patient's live location; breakdown site logged for crew recovery."

### Q4: Green Corridor — what does "traffic authority" mean in a demo without real signal APIs?
- The slide claims "alerts registered traffic authorities about junctions and ETA."
- There is no real signal control API integration possible without government backend access.
- **Decision:** Authorities are registered WebSocket clients receiving structured alerts (junction name, ETA in seconds, updated as ETAs change, cleared when passed). Control dashboard at `/control` acts as the authority view. This is labelled clearly as a "pre-clearance alert notification" — NOT signal actuation. Spec says "describe it as notification to traffic control rooms, which is what you built."

### Q5: `addrId36` in the SMS token — gazetteer size vs precision
- Spec requires bundling `assets/gazetteer.json` (~200 Ahmedabad localities) and encoding nearest locality as `addrId36` in the SMS token.
- A 200-entry gazetteer requires only 2 base36 characters (36² = 1296 > 200). Token stays well under 100 chars.
- **Decision:** Gazetteer with ~200 entries, addrId encoded as 2 base36 chars. Document in LIMITATIONS.md that production uses a larger national gazetteer. Precision: nearest locality centroid, documented as human-readable address hint, not street-level accuracy.

### Q6: Expo SDK version — legacy apps on SDK 49, spec says "latest SDK"
- `frontend/packages/user-app/package.json` declares `expo: "~49.0.0"` (very old).
- This prompt requires latest SDK + expo-router.
- **Decision:** Build a NEW top-level Expo app at repo root (`app/`) with the latest Expo SDK. Legacy `frontend/packages/` folders are kept but not run by `npm run dev`. Legacy backend is kept in `backend/` but the new in-memory server lives in `server/`.

### Q7: Road GeoJSON — Overpass API network dependency at build time
- Spec says: "fetch once via Overpass API via curl; if it fails, generate a labelled SYNTHETIC grid."
- Committing the GeoJSON solves the runtime dependency; but the initial fetch needs network.
- **Decision:** Attempt Overpass fetch during setup (`scripts/fetch-roads.js`). If it fails or times out, auto-generate a `SYNTHETIC` 8×8 road grid for Ahmedabad, label it in the file and UI. The file is committed so the app never needs internet for the map.

### Q8: DEMO_TIME_SCALE — 120 s expansion → 12 s in demo
- Spec says "DEMO_TIME_SCALE so 120 s can be shown in 12 s."
- This affects all time-based logic (expansion timers, ETA calculations, etc.).
- **Decision:** `DEMO_TIME_SCALE = 1` normally; Demo Director panel sets it to 10. All timers in the server divide by `DEMO_TIME_SCALE`. Document that ETA display values remain nominal (not scaled) to avoid confusing the audience.

### Q9: Simultaneous "first accept wins" — race condition handling
- Two drivers accept at the exact same millisecond; in-memory server must guarantee exactly one winner.
- **Decision:** Use a synchronous lock around the mission state update (`acceptMission()` function checks status === 'DISPATCHING', atomically sets to 'ASSIGNED', returns winner boolean). Since Node is single-threaded, this is safe with pure in-memory state. Tested with a unit test that fires two concurrent `acceptMission()` calls.

### Q10: `/control` endpoint — served by Node server or Expo web?
- Spec says "Control also served at /control on the server as a web page."
- **Decision:** The Node/Express server serves a self-contained static HTML Control dashboard at `GET /control`. It connects back to the same server's WebSocket for live data. This way it works without launching Expo — judges can just open `http://localhost:3000/control`.

