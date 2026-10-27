# SaHaay — Contribution Plan & Progress Tracker

Companion to `project_context.md` and [docs/progress.md](progress.md). This tracks work across three ownership lanes.

| Lane | Focus |
|---|---|
| **A** | Server Core: in-memory dispatch, spatial matching, atomic lock, failover, audit |
| **B** | Telemetry & Mobile: crash detection, Base36 codec, transport state machine, maps |
| **C** | Control dashboard, benchmarks, documentation, demo orchestration |

---

## Lane A — Server Core & Dispatch Engine

| # | Task | Status | Delivery |
|---|---|---|---|
| A1 | **Single source of truth**: create `src/core/config.ts` without magic numbers | ✅ DONE | All tunables consolidated (`COUNTDOWN_SEC = 30`) |
| A2 | **Atomic first-accept lock**: synchronously lock assignment on first driver accept (HTTP 200 / 409) | ✅ DONE | Synchronous lock in `server/src/dispatch.ts` + tests |
| A3 | **In-memory state store & timers**: dynamic ripple expansion timers with demo scale | ✅ DONE | `server/src/state.ts` + `setDemoTimeScale()` active reschedule |
| A4 | **Complete ripple ladder**: $500\text{ m} \to 1\text{ km} \to 2\text{ km} \to 4\text{ km} \to 8\text{ km}$ | ✅ DONE | Governed by `EXPAND_FACTOR = 2` |
| A5 | **Self-healing failover**: auto-redispatch to **patient's live GPS** upon breakdown | ✅ DONE | `reportBreakdown` in `server/src/dispatch.ts` + audit log |
| A6 | **High-performance spatial grid**: $0.01^\circ$ spatial cell binning + Haversine lookup | ✅ DONE | `server/src/matching.ts` |
| A7 | **Tamper-evident audit trail**: append-only SHA-256 cryptographic hash chain | ✅ DONE | `server/src/audit.ts` (`verifyChain`, `tamperEntry`) |
| A8 | **Inbound SMS webhook**: handle compact Base36 tokens via `/sms/inbound` | ✅ DONE | Implemented in `server/src/routes.ts` |
| A9 | **Driver simulation & fast triage APIs**: auto-accept nearest offer in 1.5s, `/missions/:id/expand`, `/missions/:id/quick-assign` | ✅ DONE | `dispatch.ts` & `routes.ts` |

---

## Lane B — Mobile, Sensors & Transport

| # | Task | Status | Delivery |
|---|---|---|---|
| B1 | **Crash detection filter**: $\ge 2.5\text{ g}$ sustained impact + $1000\text{ ms}$ post-impact stillness | ✅ DONE | `src/core/crash/CrashDetector.ts` (9 tests) |
| B2 | **Countdown safety timer**: 30s default, clamp 5-30s, cancel guarantee, exactly-once SOS | ✅ DONE | `src/core/crash/CountdownTimer.ts` (5 tests) |
| B3 | **Crash waveform simulator**: synthetic waveforms for drops, potholes, 2.5g, and 3g | ✅ DONE | `src/core/crash/CrashSimulator.ts` |
| B4 | **Ultra-compact SMS codec**: Base36 fixed-point formula with CRC-8 ($\le 45$ chars) | ✅ DONE | `src/core/sosCodec.ts` (23 tests, strict bounds) |
| B5 | **Ahmedabad gazetteer**: ~200 locality centroids with 2-character Base36 IDs | ✅ DONE | `assets/gazetteer.json` |
| B6 | **4-state transport machine**: `ONLINE` $\to$ `DEGRADED` $\to$ `OFFLINE_SMS` $\to$ `RECOVERED` | ✅ DONE | `src/core/transport/TransportManager.ts` (10 tests) |
| B7 | **Road geometry & dead-reckoning marker**: Turf.js marker projection along road graph | ✅ DONE | `DeadReckoningTracker.ts` (6 tests) |

---

## Lane C — Control Dashboard, Benchmarks & Demo

| # | Task | Status | Delivery |
|---|---|---|---|
| C1 | **Live Control & Authority Dashboard**: served at `:3000/control` | ✅ DONE | `server/src/control.html` |
| C2 | **Green Corridor junction alerts**: calculate ETAs with advisory disclaimer | ✅ DONE | `_generateGreenCorridor` in `dispatch.ts` |
| C3 | **Spatial matching benchmark**: measure $1\text{k}$ and $10\text{k}$ fleet latencies | ✅ DONE | `server/src/bench.ts` → `docs/BENCHMARK.md` ($3.3\ \mu\text{s}$) |
| C4 | **Seed simulator**: seed realistic ambulances across Ahmedabad coordinates | ✅ DONE | `server/src/seed.ts` |
| C5 | **Automated test suite**: verify pure logic across all modules | ✅ DONE | **58 automated tests passing (7 suites)** via `npm test` |
| C6 | **Demo Director & Time Scale**: scale timers by $10\times$ with dynamic rescheduling | ✅ DONE | `DEMO_TIME_SCALE` + `/demo/time-scale` |
| C7 | **System status & documentation audit**: record all decisions, specs, and claims | ✅ DONE | `docs/STATUS.md`, `progress.md`, `README.md` |
| C8 | **E2E golden path test**: automated 8-stage journey validation | ✅ DONE | `server/src/e2e-journey.test.ts` (1 test covering 8 stages) |
| C9 | **Citizen SOS web interface & badge updates**: live testing portal at `:3000/sos` with hotspot presets | ✅ DONE | `server/src/sos.html` + `server/src/control.html` |

---

## Verification Summary

- **TypeScript Typecheck:** `npx tsc --noEmit` — 0 errors across root and server.
- **Unit & Journey Tests:** `npm test` — **58 / 58 tests passing** across 7 test suites.
- **Benchmark:** `npm run bench` — measured **$3.3\ \mu\text{s}$ ($0.0033\text{ ms}$)** spatial search at 10,000 units.
