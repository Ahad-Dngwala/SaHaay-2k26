# SaHaay: India's First Autonomous Emergency Response Grid

![Status](https://img.shields.io/badge/Status-Operational-success?style=for-the-badge)
[![CI](https://github.com/Ahad-Dngwala/SaHaay-2k26/actions/workflows/sahaay-ci.yml/badge.svg)](https://github.com/Ahad-Dngwala/SaHaay-2k26/actions/workflows/sahaay-ci.yml)
[![License](https://img.shields.io/badge/License-FSL--1.1--ALv2-blue?style=for-the-badge)](LICENSE.md)
![Platform](https://img.shields.io/badge/Platform-NationScale-orange?style=for-the-badge)
![Mode](https://img.shields.io/badge/Mode-Online%20%2B%20Offline%20(SMS)-red?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-58%20Passing-brightgreen?style=for-the-badge)
![Bench](https://img.shields.io/badge/Matching-0.003ms-purple?style=for-the-badge)

> **"No patient left waiting."**
>
> SaHaay transforms emergency response from a manual, opaque phone-system into a **real-time, data-driven, and fully autonomous rescue capability**.
>
> 📖 **Judges & Evaluators:** See [walkthrough.md](walkthrough.md) for the complete 8-stage interactive demonstration guide and scriptable scenario controls.

---

## 📉 The Critical Gap

In the Golden Hour, certainty saves lives. Yet, India's current emergency infrastructure (108/112) relies on manual call-centre coordination, leading to fatal delays, untracked routes, and zero recovery when an ambulance breaks down.

| Current System (108/112) ❌ | SaHaay Autonomous Grid ✅ |
| :--- | :--- |
| **Manual Dispatch** via Call Centers | **Instant Proximity Dispatch** ($p99 = 3.3\ \mu\text{s}$ search latency) |
| **Blind Waiting** (No Tracking) | **Live Tracking with Dead-Reckoning** |
| **Single Point of Failure** | **Self-Healing Failover** (Auto-Redispatch to Patient Live GPS) |
| **Network Dependent** | **Offline SMS-First Mechanism** ($\le 45$ char Base36 packets) |
| **Opaque Operations** | **Cryptographic SHA-256 Audit Trail** |

---

## 🏗️ Autonomous Architecture

SaHaay replaces human guesswork with intelligent orchestration. The system autonomously manages the entire lifecycle of an emergency—from detection to hospital admission.

```mermaid
graph TD
    %% Nodes
    User([User / IoT Crash Sensor])
    SOS_Btn{Accident Detected?}
    
    subgraph "Decision Core (The Brain)"
        Locate[Locate GPS / Locality Hint]
        Scan500[Search Ring 1: 500m]
        Scan1km[Search Ring 2: 1km]
        Scan2km[Search Ring 3: 2km - 8km]
        Dispatch[Dispatch Offers to Candidate Drivers]
    end

    subgraph "Driver Network"
        DriverMobile[Driver Interfaces]
        Accept{Driver Confirms?}
        Lock[🔒 Synchronous First-Accept Lock]
        Reject[Decline / Auto-Timeout]
    end

    subgraph "Live Operations"
        Routing[⚡ Route Calculation & Dead-Reckoning]
        Track[📡 Telemetry & Socket Stream]
        Traffic[🚦 Green Corridor Advisory Notifications]
        Breakdown{Breakdown Reported?}
    end

    subgraph "Self-Healing Failover"
        Transfer[🔄 Re-dispatch to Patient Live GPS]
    end

    Hospital([🏥 Hospital Admission])

    %% Flows
    User --> SOS_Btn
    SOS_Btn -- Yes --> Locate
    Locate --> Scan500
    Scan500 -- Found --> Dispatch
    Scan500 -- None --> Scan1km
    Scan1km -- Found --> Dispatch
    Scan1km -- None --> Scan2km
    Scan2km --> Dispatch
    
    Dispatch --> DriverMobile
    DriverMobile --> Accept
    
    Accept -- No --> Reject
    Reject --> Scan1km
    
    Accept -- Yes --> Lock
    Lock --> Routing
    Routing --> Track
    Track --> Traffic
    
    Track --> Breakdown
    Breakdown -- Yes --> Transfer
    Transfer --> Scan500
    
    Breakdown -- No --> Hospital
```

---

## 🔥 Key Capabilities

### 1. ⚡ High-Performance Dispatch Engine ($< 0.01\text{ ms}$ search latency)
- **In-Memory Spatial Grid Index**: Uses fixed $0.01^\circ$ (~1.11 km) spatial cell hashing to index thousands of ambulances.
- **Empirically Measured Benchmark**: Measured with `npm run bench` (1,000 iterations per radius):
  - **1,000 ambulances**: $p50 = 2.1\ \mu\text{s}$, $p99 = 3.3\ \mu\text{s}$ at $500\text{ m}$.
  - **10,000 ambulances**: $p50 = 2.1\ \mu\text{s}$, $p99 = 3.3\ \mu\text{s}$ ($0.0033\text{ ms}$) at $500\text{ m}$.
  - *Full benchmark report: [docs/BENCHMARK.md](docs/BENCHMARK.md)*.
- **Synchronous First-Accept Lock**: Atomically locks assignment on the first driver acceptance (HTTP 200); any competing or late acceptances receive **HTTP 409 Conflict** and are cancelled.

### 2. 🛡️ Self-Healing Failover (Breakdown Protection)
- When a breakdown is reported for an active ambulance:
  - The vehicle is transitioned to `BREAKDOWN` and its stranded coordinates are logged in the SHA-256 audit ledger for crew recovery.
  - The dispatch system **automatically restarts search from the patient's LIVE GPS coordinates** (not the stranded vehicle's location).
  - No human call-centre intervention required.

### 3. 📡 Disaster-Ready Offline Mode (DIL)
- **Ultra-Compact Base36 SMS Protocol**:
  - Format: `S1|<uid36>|<lat36>|<lon36>|<ts36>|<addrId36>|<flags36>|<crc8>`
  - Encodes 1-metre GPS precision in **under 45 characters** (safe within 160-char GSM-7 limit).
  - Strict boundary checking on encoding (latitude $[-90, 90]$, longitude $[-180, 180]$).
  - Includes a 2-char Base36 address hint from a bundled 200-locality Ahmedabad gazetteer (`assets/gazetteer.json`).
  - Protected with a polynomial CRC-8 checksum (`0x07`).
- **Deterministic 4-State Transport Machine**: `ONLINE` $\to$ `DEGRADED` $\to$ `OFFLINE_SMS` $\to$ `RECOVERED` with an asynchronous outbox queue and exponential backoff.

### 4. 💥 Intelligent Crash Detection & Countdown Safety
- Continuously polls accelerometer ($20\text{ ms}$ interval, $50\text{ Hz}$).
- Requires $\ge 2.5\text{ g}$ sustained impact for $\ge 100\text{ ms}$, followed by a $1000\text{ ms}$ post-impact stillness filter ($\Delta g < 0.3\text{ g}$).
- Prevents false triggers from potholes, sharp braking, and phone drops.
- **30-Second Safety Countdown**: Defaults to 30 seconds (`COUNTDOWN_SEC = 30`), configurable 5–30s. Cancellation guarantees zero SOS emissions; countdown completion triggers exactly one SOS.

### 5. 🔐 Tamper-Evident SHA-256 Audit Chain
- Cryptographic hash chain: each log entry hashes the previous hash, timestamp, event, and data payload.
- Real-time verification via `GET /audit/verify`.
- Includes a live tamper demonstration API (`POST /audit/tamper`) to prove mathematical integrity to judges.

### 6. 🚦 Green Corridor Coordination (Advisory)
- Broadcasts structured advisory pre-clearance notifications about approaching emergency vehicles at major junctions.
- Displayed on the live authority dashboard served at `http://localhost:3000/control`.
- Explicitly labelled: *Advisory notification (simulated pre-clearance; no physical signal actuation)*.

---

## 🛠️ Technology Stack

| Layer | Component | Technology |
| :--- | :--- | :--- |
| **Server** | Dispatch Engine & WebSocket | **Node.js, Express, ws, TypeScript** (Zero external dependencies) |
| **Core Logic** | Codec, State Machine, Sensors | **Pure TypeScript** (Single source of truth in `src/core/config.ts`) |
| **Spatial Index** | Proximity Matching | **Spatial Cell Hashing Grid + Haversine** |
| **Audit Trail** | Tamper-Evident Ledger | **SHA-256 Cryptographic Hash Chain** |
| **Control Dashboard** | Authority & Fleet Monitor | **Real-Time HTML5 + WebSocket** (`:3000/control`) |
| **Client / Mobile** | Citizen & Driver Apps | **Expo (React Native) + react-native-web** |
| **Legacy Subsystems** | Full-Stack Reference | **backend/** (MongoDB + Socket.io) & **frontend/** (Vite + React) |

---

## 🚀 Quick Start (Zero-Config Runner)

No cloud accounts, no API keys, and no MongoDB installation required.

### 1. Install Dependencies
```bash
git clone https://github.com/Ahad-Dngwala/SaHaay-2k26.git
cd SaHaay-2k26
npm install
```

### 2. Start the Dispatch Server & Control Dashboard
```bash
npm run dev:server
```
- **Control Dashboard:** [http://localhost:3000/control](http://localhost:3000/control)
- **Health Endpoint:** [http://localhost:3000/health](http://localhost:3000/health)
- **Fleet List:** [http://localhost:3000/ambulances](http://localhost:3000/ambulances)

### 3. Run Quality, Build & Verification Commands
```bash
npm run typecheck    # Verifies TypeScript compiler across core and server (0 errors)
npm run build:server # Builds production server to dist/ and copies static assets
npm test             # Runs test suite locally (58 tests across 7 suites)
npm run test:ci      # Deterministic CI runner (--runInBand; fails if 0 tests discovered)
npm run test:smoke   # Cross-platform runtime smoke test (polls /health and /control on isolated port)
npm run bench        # Spatial grid benchmark (<200ms assertion on 10k fleet)
```

---

## 🏆 Project Status

- [x] **Single Source of Truth (`src/core/config.ts`)**
- [x] **Compact Base36 SMS Codec with CRC8 & Bounds Checking (`src/core/sosCodec.ts`)**
- [x] **In-Memory Spatial Index Matching (`server/src/matching.ts`)**
- [x] **Synchronous First-Accept Lock with HTTP 409 Conflict (`server/src/dispatch.ts`)**
- [x] **Dynamic Ripple Search Ladder (500m $\to$ 8km)**
- [x] **Empirical Benchmark Suite (`docs/BENCHMARK.md`: $0.003\text{ ms}$ search latency)**
- [x] **Vehicular Crash Detector with Stillness Filter (`src/core/crash/CrashDetector.ts`)**
- [x] **30-Second Countdown Timer with Cancel & Exactly-Once SOS (`src/core/crash/CountdownTimer.ts`)**
- [x] **Deterministic Transport State Machine (`src/core/transport/TransportManager.ts`)**
- [x] **Cryptographic Tamper-Evident Audit Chain (`server/src/audit.ts`)**
- [x] **Self-Healing Failover to Live Patient GPS with Breakdown Coordinates Preserved**
- [x] **Traffic Authority Control Dashboard (`http://localhost:3000/control`)**
- [x] **Demo Director Dynamic Time Scaling with Active Timer Rescheduling**
- [x] **58 / 58 Automated Tests Passing across 7 Test Suites**
- [x] **Zero TypeScript Errors (`npx tsc --noEmit`)**

---

> Made with ❤️ by Team SECRET CODERS. **Built for India.** Saving lives, one millisecond at a time.
