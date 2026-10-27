# SaHaay — Project Context

> **"No patient left waiting."**  
> SaHaay is an autonomous emergency-response layer for India: it detects or receives an SOS, finds the nearest available ambulance, tracks it live, re-dispatches automatically if it fails, and keeps working over plain SMS when the internet is down.

- **Repo:** https://github.com/Ahad-Dngwala/SaHaay-2k26
- **Target event:** MY Bharat — *Hack for Social Cause* (VBYLD 2026/2027), theme **Healthcare, Wellbeing & Service Delivery**
- **Document basis:** Pitch deck (`organized.pdf`), system brief, and code analysis. Everything marked below is verified against working code.
- **Progress Report:** See [docs/progress.md](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/docs/progress.md) for full implementation details.

---

## 1. The Problem

Calling an ambulance in India is a blind gamble.

| Missing data point | What the caller experiences today |
|---|---|
| **Time** | No ETA. Nobody knows when help arrives. |
| **Identity** | Which ambulance is coming is unverified. |
| **Location** | No visibility of where it is right now. |
| **Reliability** | If it breaks down or hits traffic there is no recovery path. |

Root causes: manual call-centre assignment with no "nearest unit" logic, no GPS tracking for the caller, no failover protocol, no tamper-evident audit trail.

---

## 2. The Solution (Pitch)

Replace guesswork with software-driven orchestration:

| Feature | Current system | SaHaay |
|---|---|---|
| Dispatch logic | No nearest logic | Geospatial proximity ($p99 = 3.3\ \mu\text{s}$ search latency) |
| Operation | Manual call centre | Autonomous orchestration |
| Visibility | Blind waiting | Live GPS tracking + dead-reckoning |
| Reliability | No failover | Automatic recovery to patient live location |
| Accountability | No audit trail | Cryptographic SHA-256 hash chain |

### End-to-End Flow (9 steps from the deck)
1. **Offline SOS initiation** — user triggers distress via encoded SMS (no internet needed), app button, or crash detection with 30s countdown.
2. **Signal reception & validation** — server receives, validates CRC-8, deduplicates by `sosUid`.
3. **Mission created & acknowledged** — unique Mission ID assigned, confirmation SMS simulated.
4. **Autonomous ripple dispatch** — spatial grid search for nearest available ambulance within 500m.
5. **Does a unit accept?** — driver confirms.
6. **A. No →** radius "ripples" outward (1 km $\to$ 2 km $\to$ 4 km $\to$ 8 km); if still none, marked FAILED.  
   **B. Yes →** atomic first-accept lock triggers (winner gets HTTP 200, competing get HTTP 409 Conflict), route computed, tracking stream shared.
7. **Green Corridor Pre-Clearance** — structured advisory alerts sent to traffic control rooms for upcoming junctions.
8. **Ambulance navigates to scene** with real-time updates and dead-reckoning.
9. **Mission completion** — arrival logged, status "Completed", ambulance returns to available pool.

---

## 3. Architecture

| Layer | Choice | Why |
|---|---|---|
| Mobile / Web | Expo (React Native) + react-native-web | Universal cross-platform |
| Server | Node.js / Express / ws (TypeScript) | Zero-external-dependency local runner |
| Spatial Index | In-memory cell grid ($0.01^\circ$ cells) | Sub-millisecond lookup, no external DB needed |
| Real-time | WebSockets (`ws`) | Bidirectional telemetry stream |
| Offline | Base36 compact SMS protocol ($\le 45$ chars) | Guaranteed single-part GSM-7 delivery |
| Audit Ledger | Cryptographic SHA-256 hash chain | Tamper-evident accountability |

---

## 4. What the Repo Contains (Verified Status)

### Repository Layout
```
server/              In-memory TypeScript dispatch server (zero cloud dependencies)
  src/               audit.ts, bench.ts, dispatch.ts, matching.ts, routes.ts, seed.ts, ws.ts
src/core/            Pure TypeScript shared logic (single source of truth in config.ts)
  crash/             CrashDetector.ts (stillness filter), CountdownTimer.ts, CrashSimulator.ts
  transport/         TransportManager.ts (4-state reducer: ONLINE/DEGRADED/OFFLINE_SMS/RECOVERED)
  sosCodec.ts        Compact Base36 SMS encoder/decoder with CRC-8 and unit tests
  tracking/          DeadReckoningTracker.ts (Turf.js interpolation & exponential smoothing)
assets/              gazetteer.json (~200 Ahmedabad localities with Base36 centroids)
                     ahmedabad-roads.geojson (12 arterial corridors, marked SYNTHETIC)
docs/                STATUS.md, BENCHMARK.md, CLAIMS_MATRIX.md, progress.md, HANDOFF.md
backend/             Legacy MongoDB + Socket.io backend (reference implementation)
frontend/            Legacy Vite web app + Expo 49 sketches
```

### Feature Status vs. the Pitch

| Capability | Status | Evidence in Code |
|---|---|---|
| Emergency creation + dispatch start | ✅ | `server/src/dispatch.ts` (`createMission`) |
| Nearest-first driver search ($500\text{ m} \to 1\text{ km}$) | ✅ | `server/src/matching.ts` (`findAvailable`, spatial cell grid) |
| Auto-expansion timer ($120\text{ s}$) | ✅ | `_scheduleExpansion` in `server/src/dispatch.ts` |
| 2 km to 8 km ripple phases | ✅ | Full ladder implemented up to `MAX_RADIUS_M = 8000` |
| Synchronous first-accept lock | ✅ | Atomic state change in `server/src/dispatch.ts` (HTTP 200 winner, 409 conflict loser) |
| Live telemetry stream | ✅ | WebSocket broadcast in `server/src/ws.ts` |
| Self-healing breakdown failover | ✅ | `reportBreakdown` re-dispatches to **patient's live GPS** |
| Cryptographic audit trail | ✅ | SHA-256 hash chain in `server/src/audit.ts` (`verifyChain`, `tamperEntry`) |
| Compact Base36 SMS protocol | ✅ | `src/core/sosCodec.ts` ($\le 45$ chars, Base36 lat/lon, CRC-8) |
| Deterministic transport state machine | ✅ | `src/core/transport/TransportManager.ts` (4 states, outbox, backoff) |
| Crash detection with stillness filter | ✅ | `src/core/crash/CrashDetector.ts` ($2.5\text{ g}$ impact + $1000\text{ ms}$ stillness) |
| 30s Countdown Safety Timer | ✅ | `src/core/crash/CountdownTimer.ts` (cancel guarantee, exactly-once SOS) |
| Green corridor junction pre-clearance | ✅ | `_generateGreenCorridor` in `server/src/dispatch.ts` + `/control` dashboard |
| Automated test suite | ✅ | **58 automated tests passing across 7 suites** via `npm test` |
| "< 200 ms dispatch" claim | ✅ | **$0.0033\text{ ms}$ ($3.3\ \mu\text{s}$) measured** via `npm run bench` (`docs/BENCHMARK.md`) |

---

## 5. Running the System

### Primary Zero-Config Stack (Node + TypeScript)
```bash
npm install
npm run dev:server    # Starts dispatch server on :3000
# Control dashboard: http://localhost:3000/control
# Health endpoint:   http://localhost:3000/health

npm test              # Executes all 58 automated tests across 7 test suites
npm run bench         # Runs 1k and 10k fleet spatial matching benchmarks
```

### Legacy Stack (Optional, requires local MongoDB)
```bash
cd backend && npm install && node server.js
cd frontend && npm install && npm run dev
```

---

## 6. Glossary
- **Mission:** One SOS lifecycle from initiation to hospital admission.
- **Ripple search:** Progressive expansion of search rings ($500\text{ m} \to 8000\text{ m}$).
- **Failover:** Automatic replacement dispatch to the patient's live location upon breakdown.
- **Green Corridor:** Structured advisory notifications delivered to traffic control rooms.
- **DIL:** Disconnected, Intermittent, Limited network conditions.
- **Base36 Codec:** Compact coordinate encoding with ~1m precision in $\le 45$ ASCII characters.
