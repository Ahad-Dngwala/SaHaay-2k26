# SaHaay (सहाय) — Comprehensive Project Progress & Codebase State

**Project:** SaHaay — Offline-First Emergency Response & Autonomous Ambulance Dispatch  
**Event:** Hack for Social Cause (VBYLD 2026/2027) — *Healthcare, Wellbeing & Service Delivery*  
**Date:** October 2026  
**Status:** Core Dispatch Engine, Codec, Sensor Filter, Audit Chain, and Benchmarks Fully Operational  

---

## 1. Executive Summary

SaHaay is an autonomous emergency response orchestration system built specifically for the Indian healthcare landscape. It solves the life-threatening delays of the traditional 108/112 manual call-centre paradigm by replacing human phone dispatch with sub-millisecond proximity matching, live tracking, automated self-healing breakdown failovers, and a disaster-ready offline SMS fallback that functions when mobile data networks fail.

This document provides a complete account of everything implemented up to the latest commits, the current project contents, architectural layers, verification metrics, and the status of all sprint milestones.

---

## 2. Recent Updates & Implemented Capabilities

### ⚡ Milestone M1: Core Foundation, Single Source of Truth & SMS Codec
- **Single Source of Truth (`src/core/config.ts`)**: Eliminated all magic numbers across the system. All tunables (`CRASH_G = 2.5`, `COUNTDOWN_SEC = 30`, `SEARCH_RADIUS_M = 500`, `EXPAND_AFTER_S = 120`, `MAX_RADIUS_M = 8000`, `PING_INTERVAL_S = 20`, `DEMO_TIME_SCALE = 1`, ports, and Ahmedabad bounding box `AHM_BBOX`) are imported from one canonical module.
- **Ultra-Compact Base36 SMS Wire Protocol (`src/core/sosCodec.ts`)**:
  - Implemented the strict format: `S1|<uid36>|<lat36>|<lon36>|<ts36>|<addrId36>|<flags36>|<crc8>`.
  - Coordinate compression: $\text{lat36} = \text{base36}(\text{round}((\text{lat} + 90) \times 10^5))$, yielding ~1-metre physical resolution in only 5–6 characters.
  - Generates packets of **38–45 characters**, well within the conservative 100-character budget and the 160-character hard GSM-7 single-part SMS limit.
  - Custom CRC-8 polynomial checksum (`0x07`) ensures payload integrity.
  - Accompanied by comprehensive unit test suite (`src/core/sosCodec.test.ts`) validating 100% boundary conditions, CRC tamper rejection, and decode safety.
- **Ahmedabad Gazetteer (`assets/gazetteer.json`)**:
  - Curated database of ~200 Ahmedabad localities with name, centroid coordinates, and zone.
  - Locality IDs encoded as 2-character Base36 values ($36^2 = 1296 \ge 200$), providing immediate human-readable address hints to dispatchers without GPS reverse-geocoding overhead.

### 🧠 Milestone M2: High-Performance Spatial Index, Matching & Atomic First-Accept Lock
- **In-Memory Spatial Grid Index (`server/src/matching.ts`)**:
  - Fixed-size 2D spatial binning cell grid ($0.01^\circ \approx 1.11\text{ km}$ per cell) with Haversine distance ranking.
  - Sub-millisecond ambulance search that scales independently of fleet size.
- **Atomic First-Accept Lock (`server/src/dispatch.ts`)**:
  - Synchronous lock implementation leveraging Node.js's single-threaded event loop to eliminate race conditions.
  - When multiple drivers receive dispatch offers simultaneously, the first driver to confirm instantly wins; all competing offers are atomically cancelled via WebSocket (`OFFER_CANCELLED`).
- **Ripple Search Ladder**:
  - Progressive search rings: $500\text{ m} \to 1000\text{ m} \to 2000\text{ m} \to 4000\text{ m} \to 8000\text{ m}$ (governed by `EXPAND_FACTOR = 2` and `EXPAND_AFTER_S = 120`).
  - Controlled by configurable `DEMO_TIME_SCALE` (divides server timers by 10 for accelerated demonstrations while keeping nominal ETAs realistic).
- **Sub-Millisecond Benchmark Verification (`server/src/bench.ts` & `docs/BENCHMARK.md`)**:
  - Verified through automated benchmark (`npm run bench`) over 1,000 iterations per radius:
    - **1,000 ambulances**: $p50 = 2.9\ \mu\text{s}$, $p99 = 5.9\ \mu\text{s}$ at $500\text{ m}$.
    - **10,000 ambulances**: $p50 = 4.2\ \mu\text{s}$, $p99 = 12.0\ \mu\text{s}$ ($0.012\text{ ms}$) at $500\text{ m}$.
  - Proves the slide claim *"Under 200 ms dispatch search"* with measured empirical data ($< 0.02\text{ ms}$).

### 📡 Milestone M3: Dual Transport State Machine & Simulated Carrier
- **4-State Transport Reducer (`src/core/transport/TransportManager.ts`)**:
  - Deterministic state machine: `ONLINE` $\to$ `DEGRADED` $\to$ `OFFLINE_SMS` $\to$ `RECOVERED`.
  - Automatically handles connectivity degradation after 3 HTTP retries, falling back to SMS after 6 failures or an instant operator blackout toggle (`FORCE_BLACKOUT`).
  - Outbox queue with exponential backoff and message deduplication.
- **Inbound SMS Gateway Endpoint (`/sms/inbound`)**:
  - Supports both standard JSON payloads (`{ token }`) and Twilio-style form webhook format (`Body=<token>`).
  - Decodes compact Base36 SOS tokens, enforces idempotency per `sosUid`, logs to the audit chain, auto-creates the mission, and responds with a simulated carrier confirmation SMS.

### 💥 Milestone M4: Intelligent Vehicular Crash Detection with Stillness Filter
- **Crash Detector (`src/core/crash/CrashDetector.ts`)**:
  - Continuously samples accelerometer data ($20\text{ ms}$ interval, $50\text{ Hz}$).
  - Two-stage detection filter:
    1. **Impact Window**: Magnitude $g \ge 2.5\text{ g}$ sustained for $\ge 100\text{ ms}$.
    2. **Post-Impact Stillness Verification**: Checks post-impact window for $\Delta g < 0.3\text{ g}$ and mean $g < 1.5\text{ g}$ over a $1000\text{ ms}$ stillness window.
    3. Eliminates false positives from phone drops, rapid turns, and pothole strikes.
- **Crash Waveform Simulator (`src/core/crash/CrashSimulator.ts`)**:
  - Injects synthetic waveforms (`PHONE_DROP`, `POTHOLE`, `CRASH_3G`, `CRASH_2_5G`) for deterministic testing on browser, node, and emulator environments.
  - 100% unit test coverage in `src/core/crash/CrashDetector.test.ts`.

### 🧭 Milestone M5: Road Network & Dead-Reckoning Interpolation
- **Bundled Ahmedabad Road Network (`assets/ahmedabad-roads.geojson`)**:
  - Features major corridors: SG Highway, 132 Feet Ring Road, Ashram Road, CG Road, Drive-In Road, Satellite Road, Ellis Bridge, Nehru Bridge, Gandhi Road, and BRTS Spines.
- **Turf.js Dead-Reckoning Marker Engine (`src/core/tracking/DeadReckoningTracker.ts`)**:
  - Extrapolates position along road polyline (`@turf/along`) or heading vector (`@turf/destination`).
  - Smooth exponential filtering ($\tau = 0.7\text{s}$) prevents visual snapping upon fix arrival.
  - Enforces sequence monotonicity (drops out-of-order packets) and caps prediction at 45 seconds.

### 🛡️ Milestone M6: Cryptographic Audit Trail, Green Corridor & Control Dashboard
- **Cryptographic SHA-256 Hash Chain (`server/src/audit.ts`)**:
  - Append-only blockchain-style audit ledger where every event record contains:  
    $\text{hash}_n = \text{SHA-256}(\text{hash}_{n-1} + \text{timestamp} + \text{event} + \text{JSON}(\text{data}))$.
  - Genesis block verification and `/audit/verify` validation endpoint.
  - Interactive demonstration tool (`/audit/tamper`) to prove tamper detection live to judges.
- **Self-Healing Breakdown Failover**:
  - Breakdown trigger (`/missions/:id/breakdown`) instantly transitions the active unit to `BREAKDOWN`.
  - Dispatches replacement ambulance to the **patient's latest live GPS coordinates**, while permanently recording the stranded ambulance's breakdown coordinates in the audit log for crew recovery.
- **Green Corridor Authority Pre-Clearance**:
  - Calculates ETA and distance to key Ahmedabad traffic junctions along the route (e.g., CG Road, Navrangpura, Ashram Road, SG Highway).
  - Broadcasts structured pre-clearance notifications to traffic authority WebSocket clients.
- **Standalone Live Control Dashboard (`server/src/control.html`)**:
  - Served directly by Express at `http://localhost:3000/control`.
  - Real-time mission tracking, active ambulance fleet monitor, live corridor notifications, interactive chain verification, and demo world reset.

---

## 3. Detailed Repository Layout & Contents

```
SaHaay-2k26/
├── .agent/
│   └── rules/
│       └── sahaay.md                    # Core operational rules & verification requirements
├── assets/
│   ├── ahmedabad-roads.geojson          # Ahmedabad arterial road graph for offline tracking
│   └── gazetteer.json                   # ~200 Ahmedabad localities with centroids & IDs
├── docs/
│   ├── BENCHMARK.md                     # Measured spatial matching latencies (1k & 10k fleets)
│   ├── CLAIMS_MATRIX.md                 # Complete verification matrix for all slide claims
│   └── STATUS.md                        # Architectural audit, legacy gap analysis, Q1-Q10 decisions
├── scripts/
│   ├── emu.sh                           # Android emulator helper commands (GPS, crash, SMS, screencap)
│   └── generate-roads.js                # Road GeoJSON generator for Ahmedabad
├── server/                              # In-memory TypeScript Dispatch & Telemetry Server
│   ├── src/
│   │   ├── audit.ts                     # Cryptographic SHA-256 tamper-evident hash chain
│   │   ├── bench.ts                     # Benchmark runner measuring sub-millisecond search
│   │   ├── config-server.ts             # Server configuration wrapper
│   │   ├── control.html                 # Web Control & Traffic Authority dashboard (:3000/control)
│   │   ├── dispatch.ts                  # Mission lifecycle, ripple ladder, breakdown failover
│   │   ├── index.ts                     # Express + WebSocket HTTP server entrypoint
│   │   ├── matching.ts                  # Spatial cell grid index (0.01 deg cells) & Haversine
│   │   ├── routes.ts                    # REST API (/health, /missions, /sms/inbound, /audit)
│   │   ├── seed.ts                      # 12 realistic ambulances seeded across Ahmedabad
│   │   ├── state.ts                     # In-memory reactive state store
│   │   ├── types.ts                     # Domain interfaces (Mission, Ambulance, AuditEntry)
│   │   └── ws.ts                        # WebSocket subscription & real-time broadcast engine
│   ├── package.json
│   └── tsconfig.json
├── src/                                 # Pure Shared TypeScript Core (Expo Go / Web Compatible)
│   ├── config/
│   │   └── env.js                       # Environment variable loader
│   └── core/
│       ├── config.ts                    # Single source of truth for all project tunables
│       ├── crash/
│       │   ├── CrashDetector.ts         # Accelerometer magnitude + stillness filter
│       │   ├── CrashDetector.test.ts    # Waveform test suite (drops, potholes, 2.5g, 3g)
│       │   └── CrashSimulator.ts        # Synthetic sensor waveforms for web/emulator
│       ├── sosCodec.ts                  # Base36 fixed-point SMS encoder/decoder with CRC8
│       ├── sosCodec.test.ts             # Comprehensive codec test suite
│       ├── tracking/
│       │   ├── DeadReckoningTracker.ts  # Turf.js dead-reckoning marker projection
│       │   └── DeadReckoningTracker.test.ts # Extrapolation & smoothing tests
│       └── transport/
│           ├── HttpTransport.ts         # REST transport implementation
│           ├── SmsTransport.ts          # GSM/SMS simulated transport implementation
│           ├── TransportManager.ts      # 4-state network resilience state machine
│           ├── TransportManager.test.ts # Reducer transition unit tests
│           └── types.ts                 # Transport interfaces
├── backend/                             # Legacy MongoDB + Twilio + Socket.io backend
├── frontend/                            # Legacy Vite + React 18 Web Dashboard & Expo 49 sketches
├── AI_DISCLOSURE.md                     # Transparent AI contribution breakdown & compliance
├── ARCHITECTURE.md                      # System architecture, Mermaid diagrams, & mapping strategy
├── contribution.md                      # Team division of responsibilities & task matrix
├── HANDOFF.md                           # Sprint handoff notes & milestone checklist
├── implementation.md                    # Technical guide on open-source reuse & constraints
├── LICENSE.md                           # MIT License
├── LIMITATIONS.md                       # Physical, cellular, OS, and regulatory boundaries
├── package.json                         # Unified workspace script runner (concurrent server + Expo)
├── PORT_3000_RESOLUTION.md              # Port conflict troubleshooting and background process kill guide
├── project_context.md                   # Hackathon brief, problem statement, pitch deck correlation
├── README.md                            # Primary project presentation & architecture guide
├── TEST_CASES.md                        # Test specifications & sample test data
└── tsconfig.json                        # Root TypeScript project configuration
```

---

## 4. Verification & Testing Status

Every component is validated continuously using strict TypeScript typechecking and automated test suites:

| Check | Target | Status | Output Details |
|---|---|---|---|
| **Root Typecheck** | `npx tsc --noEmit` | ✅ PASS | 0 errors |
| **Server Typecheck** | `cd server && npx tsc --noEmit` | ✅ PASS | 0 errors |
| **Pure Logic Tests** | `npm test` | ✅ PASS | **45 / 45 tests passing** across 4 test suites: <br>• `sosCodec.test.ts` (14 tests)<br>• `CrashDetector.test.ts` (7 tests)<br>• `TransportManager.test.ts` (18 tests)<br>• `DeadReckoningTracker.test.ts` (6 tests) |
| **Spatial Benchmarking** | `npm run bench` | ✅ PASS | **$0.012\text{ ms}$ ($12\ \mu\text{s}$)** at 10k fleet ($< 200\text{ ms}$ claim verified) |
| **Audit Verification** | `GET /audit/verify` | ✅ PASS | Valid SHA-256 chain verified end-to-end |

---

## 5. Milestone Completion Table

| # | Milestone | Target Deliverables | Current Status |
|---|---|---|---|
| **M1** | Core Foundation & Codec | `src/core/config.ts`, `sosCodec.ts`, `assets/gazetteer.json`, unit tests | ✅ **DONE** |
| **M2** | Matching & Atomic Lock | In-memory spatial index, first-accept lock, ripple search ladder, `bench.ts` | ✅ **DONE** |
| **M3** | Dual Transport State Machine | 4-state reducer, outbox queue, `/sms/inbound` token handler, `SimulatedCarrier` | ✅ **DONE** |
| **M4** | Intelligent Crash Detection | `CrashDetector.ts`, stillness verification filter, `CrashSimulator.ts`, waveform tests | ✅ **DONE** |
| **M5** | Road Geometry & Dead-Reckoning | `assets/ahmedabad-roads.geojson`, `DeadReckoningTracker.ts`, unit tests | ✅ **DONE** |
| **M6** | Self-Healing Failover & Dashboard | Breakdown re-dispatch, green corridor alerts, `/control` dashboard, tamper tool | ✅ **DONE** |
| **M7** | Demo Director & E2E Flow | One-command orchestrated demo flow, time scale controls | ✅ **DONE** |
| **M8** | Verification & Final Docs | `STATUS.md`, `BENCHMARK.md`, `PROGRESS.md`, `CLAIMS_MATRIX.md`, `ARCHITECTURE.md`, `TEST_CASES.md`, `LIMITATIONS.md`, `AI_DISCLOSURE.md`, `scripts/emu.sh` | ✅ **DONE** |

---

## 6. How to Run & Demonstrate

### 1. Zero-Config Local Launch
```bash
# Clone the repository
git clone https://github.com/Ahad-Dngwala/SaHaay-2k26.git
cd SaHaay-2k26

# Install dependencies
npm install

# Run the in-memory dispatch server
npm run dev:server
```

### 2. View Mission Control & Authority Dashboard
Open your browser to:
- **Control Dashboard:** `http://localhost:3000/control`
- **System Health:** `http://localhost:3000/health`
- **Fleet List:** `http://localhost:3000/ambulances`

### 3. Run Automated Tests & Benchmarks
```bash
# Run all unit tests
npm test

# Run the spatial matching benchmark
npm run bench
```
