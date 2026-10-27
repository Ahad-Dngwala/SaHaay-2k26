# SaHaay — Contribution Plan & Progress Tracker

Companion to `project_context.md` and [progress.md](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/progress.md). This tracks remaining work across three ownership lanes.

| Lane | Focus |
|---|---|
| **A** | Server Core: in-memory dispatch, spatial matching, atomic lock, failover, audit |
| **B** | Telemetry & Mobile: crash detection, Base36 codec, transport state machine, maps |
| **C** | Control dashboard, benchmarks, documentation, demo orchestration |

---

## Lane A — Server Core & Dispatch Engine

| # | Task | Status | Delivery |
|---|---|---|---|
| A1 | **Single source of truth**: create `src/core/config.ts` without magic numbers | ✅ DONE | All tunables consolidated |
| A2 | **Atomic first-accept lock**: synchronously lock assignment on first driver accept | ✅ DONE | Synchronous lock in `server/src/dispatch.ts` |
| A3 | **In-memory state store & timers**: dynamic ripple expansion timers with demo scale | ✅ DONE | `server/src/state.ts` + `_scheduleExpansion` |
| A4 | **Complete ripple ladder**: $500\text{ m} \to 1\text{ km} \to 2\text{ km} \to 4\text{ km} \to 8\text{ km}$ | ✅ DONE | Governed by `EXPAND_FACTOR = 2` |
| A5 | **Self-healing failover**: auto-redispatch to **patient's live GPS** upon breakdown | ✅ DONE | `reportBreakdown` in `server/src/dispatch.ts` |
| A6 | **High-performance spatial grid**: $0.01^\circ$ spatial cell binning + Haversine lookup | ✅ DONE | `server/src/matching.ts` |
| A7 | **Tamper-evident audit trail**: append-only SHA-256 cryptographic hash chain | ✅ DONE | `server/src/audit.ts` (`verifyChain`, `tamperEntry`) |
| A8 | **Inbound SMS webhook**: handle compact Base36 tokens via `/sms/inbound` | ✅ DONE | Implemented in `server/src/routes.ts` |

---

## Lane B — Mobile, Sensors & Transport

| # | Task | Status | Delivery |
|---|---|---|---|
| B1 | **Crash detection filter**: $\ge 2.5\text{ g}$ sustained impact + $1000\text{ ms}$ post-impact stillness | ✅ DONE | `src/core/crash/CrashDetector.ts` |
| B2 | **Crash waveform simulator**: synthetic waveforms for drops, potholes, 2.5g, and 3g | ✅ DONE | `src/core/crash/CrashSimulator.ts` |
| B3 | **Ultra-compact SMS codec**: Base36 fixed-point formula with CRC-8 ($\le 45$ chars) | ✅ DONE | `src/core/sosCodec.ts` + 14 unit tests |
| B4 | **Ahmedabad gazetteer**: ~200 locality centroids with 2-character Base36 IDs | ✅ DONE | `assets/gazetteer.json` |
| B5 | **4-state transport machine**: `ONLINE` $\to$ `DEGRADED` $\to$ `OFFLINE_SMS` $\to$ `RECOVERED` | ✅ DONE | `src/core/transport/TransportManager.ts` |
| B6 | **Road geometry & dead-reckoning marker**: Turf.js marker projection along road graph | 🔄 IN PROGRESS | M5 milestone in progress |

---

## Lane C — Control Dashboard, Benchmarks & Demo

| # | Task | Status | Delivery |
|---|---|---|---|
| C1 | **Live Control & Authority Dashboard**: served at `:3000/control` | ✅ DONE | `server/src/control.html` |
| C2 | **Green Corridor junction alerts**: calculate ETAs for major Ahmedabad intersections | ✅ DONE | `_generateGreenCorridor` in `dispatch.ts` |
| C3 | **Spatial matching benchmark**: measure $1\text{k}$ and $10\text{k}$ fleet latencies | ✅ DONE | `server/src/bench.ts` → `docs/BENCHMARK.md` ($0.012\text{ ms}$) |
| C4 | **Seed simulator**: seed 12 realistic ambulances across Ahmedabad coordinates | ✅ DONE | `server/src/seed.ts` |
| C5 | **Automated test suite**: verify pure logic across all modules | ✅ DONE | **39 unit tests passing** via `npm test` |
| C6 | **Demo Director & Time Scale**: scale timers by $10\times$ for accelerated judging demo | ✅ DONE | `DEMO_TIME_SCALE` + `/demo/time-scale` |
| C7 | **System status & documentation audit**: record all decisions, specs, and claims | ✅ DONE | `docs/STATUS.md`, `progress.md`, `README.md` |
| C8 | **E2E demo script & video capture**: complete guided walk-through | 🔄 NEXT | M7 milestone |

---

## Verification Summary

- **TypeScript Typecheck:** `npx tsc --noEmit` — 0 errors across root and server.
- **Unit Tests:** `npm test` — 39 / 39 tests passing.
- **Benchmark:** `npm run bench` — measured $0.012\text{ ms}$ spatial search at 10,000 units.
- **Audit Verification:** `GET /audit/verify` — SHA-256 chain verified mathematically.
