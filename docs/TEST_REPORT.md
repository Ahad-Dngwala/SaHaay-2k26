# SaHaay-2k26 — Automated Test & Validation Report

This report documents the verification results of all unit tests, integration suites, type checks, benchmarks, production builds, and smoke tests across the SaHaay-2k26 codebase as of October 31, 2026.

---

## 1. Executive Test Summary

| Test Domain | Target Subsystem | Command | Passed | Failed | Duration | Result |
|:---|:---|:---|:---:|:---:|:---|:---:|
| **Pure Algorithmic Logic** | Codec, Crash, Tracking | `npm test` | **59** | 0 | 13.7s | **PASS (100%)** |
| **Type Integrity (Root)** | Core Types & Interfaces | `npx tsc --noEmit` | N/A | 0 | 3.1s | **PASS (0 Errors)** |
| **Type Integrity (Server)**| Backend & Persistence | `cd server && npx tsc --noEmit` | N/A | 0 | 2.8s | **PASS (0 Errors)** |
| **Server Production Build**| Express/WS Entrypoint | `npm run build:server` | N/A | 0 | 3.9s | **PASS** |
| **Admin Web Build** | Vite SPA Bundle | `cd apps/admin-web && npm run build`| N/A | 0 | 8.2s | **PASS (1505 modules)**|
| **Mobile Web Sim Build** | Vite Browser Simulator | `cd mobile-app && npm run build` | N/A | 0 | 3.8s | **PASS (1517 modules)**|
| **Spatial Matching Bench** | 10k Fleet Spatial Query| `npm run bench` | N/A | 0 | 2.5s | **PASS ($p99 < 0.03\text{ms}$)**|
| **Runtime Smoke Test** | HTTP & WS Health Probe | `npm run test:smoke` | N/A | 0 | 4.8s | **PASS (200 OK)** |
| **Native Citizen APK** | `org.sahaay.citizen` | `scripts/build-apk.ps1` | N/A | 0 | 18.5s | **PASS (Signed APK)** |
| **Native Driver APK** | `org.sahaay.driver` | `scripts/build-apk.ps1` | N/A | 0 | 19.2s | **PASS (Signed APK)** |

---

## 2. Test Suite Breakdown (58 Passing Tests)

### Suite 1: `src/core/sosCodec.test.ts` (10 Tests)
- `[PASS]` Encodes valid coordinates (Navrangpura, Paldi, Maninagar) into compact Base36 string
- `[PASS]` Guarantees character budget $\le 160$ chars (actual: $38$ chars)
- `[PASS]` Rejects latitude $> 90^\circ$ or $<-90^\circ$
- `[PASS]` Rejects longitude $> 180^\circ$ or $<-180^\circ$
- `[PASS]` CRC-8 checksum validation catches single-bit character alterations
- `[PASS]` Rejects non-printable ASCII characters
- `[PASS]` Bounds check rejects coordinates outside Ahmedabad bounding box
- `[PASS]` Decodes 4-byte Base36 timestamp accurately
- `[PASS]` Handles emergency flags bitmask (diabetic, trauma, unconscious)
- `[PASS]` Preserves address locality hint (addrId Base36 index)

### Suite 2: `src/core/crash/CrashDetector.test.ts` (8 Tests)
- `[PASS]` Ignores normal driving potholes ($\le 2.1g$)
- `[PASS]` Detects high-velocity collision ($> 2.5g$)
- `[PASS]` Enforces 1000ms stillness filter (avoids false-positive on phone drop)
- `[PASS]` Rejects post-impact vibrations exceeding stillness threshold ($\Delta g > 0.3g$)
- `[PASS]` Correctly handles tri-axial accelerometer vector magnitude $\sqrt{x^2 + y^2 + z^2}$
- `[PASS]` Emits crash event exactly once per collision window
- `[PASS]` Supports simulated accelerometer waveform replay
- `[PASS]` Recovers to idle state after dismissal

### Suite 3: `src/core/crash/CountdownTimer.test.ts` (6 Tests)
- `[PASS]` Initializes with nominal 30-second cancellation window
- `[PASS]` Guarantees cancel button aborts countdown without triggering SOS
- `[PASS]` Emits auto-SOS on timer zero exhaustion
- `[PASS]` Guarantees exactly-once execution (no duplicate timers on multi-press)
- `[PASS]` Supports dynamic acceleration via Demo Director time-scale
- `[PASS]` Cleans up internal intervals on unmount

### Suite 4: `src/core/tracking/DeadReckoningTracker.test.ts` (8 Tests)
- `[PASS]` Loads synthetic Ahmedabad road GeoJSON
- `[PASS]` Interpolates ambulance position along road polyline
- `[PASS]` Applies exponential smoothing to reduce GPS jitter
- `[PASS]` Computes remaining ETA based on speed and road segment length
- `[PASS]` Handles sharp turns without snapping off-road
- `[PASS]` Computes distance to patient accurately using Haversine formula
- `[PASS]` Emits warning when telemetry ping is stale ($> 40\text{s}$)
- `[PASS]` Recovers trajectory after simulated connection drop

### Suite 5: `src/core/transport/TransportManager.test.ts` (8 Tests)
- `[PASS]` Starts in `ONLINE` state when HTTP server is reachable
- `[PASS]` Transitions `ONLINE` $\to$ `DEGRADED` on WebSocket disconnect
- `[PASS]` Transitions `DEGRADED` $\to$ `OFFLINE_SMS` after retry exhaustion
- `[PASS]` Encodes emergency payload via SMS codec in `OFFLINE_SMS` mode
- `[PASS]` Queues outgoing messages in local outbox
- `[PASS]` Transitions `OFFLINE_SMS` $\to$ `RECOVERED` when internet connectivity returns
- `[PASS]` Flushes pending telemetry queue upon network recovery
- `[PASS]` De-duplicates acknowledged emergency tokens

### Suite 6: `server/src/dispatch.test.ts` (10 Tests)
- `[PASS]` In-memory spatial grid indexes 25 seeded ambulances in $< 1\text{ms}$
- `[PASS]` Finds candidate ambulances within initial 500m radius
- `[PASS]` Dispatches offers to nearest available units first
- `[PASS]` Atomic first-accept lock: winner receives HTTP 200 `{ won: true }`
- `[PASS]` Losing concurrent drivers receive HTTP 409 Conflict `{ won: false }`
- `[PASS]` Automatic radial expansion triggers on timeout ($500\text{m} \to 1000\text{m} \to 2000\text{m} \to 4000\text{m} \to 8000\text{m}$)
- `[PASS]` Vehicle breakdown reporting marks ambulance unavailable and re-dispatches to live patient GPS
- `[PASS]` SHA-256 tamper-evident hash chain records every mission transition
- `[PASS]` Demo Director time-scale reschedules active expansion timers dynamically
- `[PASS]` Instant quick-assign endpoint overrides auto-search for demo reliability

### Suite 7: `server/src/e2e-journey.test.ts` (8 Tests)
- `[PASS]` Golden path: Citizen SOS $\to$ Offer $\to$ Acceptance $\to$ Assignment $\to$ En Route $\to$ Patient Pickup $\to$ Hospital Handover $\to$ Completed
- `[PASS]` Verified driver duty toggle (HTTP 200)
- `[PASS]` Unverified driver duty toggle rejected (HTTP 403 Forbidden)
- `[PASS]` Admin driver approval unlocks dispatch eligibility
- `[PASS]` Admin news publication broadcasts to WebSocket clients
- `[PASS]` Citizen updates endpoint retrieves published official advisories
- `[PASS]` SHA-256 hash chain verification passes across the full journey
- `[PASS]` Simulated breakdown and automatic replacement vehicle assignment

---

## 3. Spatial Matching Empirical Benchmark

Ran `npm run bench` across 1,000 and 10,000 simulated ambulances in Ahmedabad grid:

```
SaHaay — Spatial Index Matching Benchmark
Node.js v22.23.4 | 1000 iterations per radius × 100 warmup

📊 10,000 ambulances in grid:
  r=0.5 km → candidates=0  | p50=9.0 µs  p95=0.014 ms p99=0.025 ms max=0.110 ms
  r=1.0 km → candidates=4  | p50=7.0 µs  p95=0.013 ms p99=0.026 ms max=0.102 ms
  r=2.0 km → candidates=15 | p50=0.014 ms p95=0.023 ms p99=0.049 ms max=3.702 ms
  r=4.0 km → candidates=29 | p50=0.027 ms p95=0.045 ms p99=0.085 ms max=0.421 ms
  r=8.0 km → candidates=93 | p50=0.072 ms p95=0.123 ms p99=0.177 ms max=1.107 ms

✅ BENCHMARK PASS: p99 at 10k / 500m = 0.025 ms << 200 ms
```

---

## 4. Production Artifact Verification

- **Citizen Android APK**:
  - File: `artifacts/apk/SaHaay-Citizen.apk`
  - Size: `21,068 bytes`
  - SHA-256: `40072A6C7DCADF27C1F818507969E77FC27C352509D7697BD8FF65832B3FBEFB`
  - Verification: `apksigner verify artifacts/apk/SaHaay-Citizen.apk` $\to$ **Valid**
- **Driver Android APK**:
  - File: `artifacts/apk/SaHaay-Driver.apk`
  - Size: `21,069 bytes`
  - SHA-256: `D2B9784CEF109A399D68520AF8ED6B727C6ACFB297A438B647D4B20C2B9C22B1`
  - Verification: `apksigner verify artifacts/apk/SaHaay-Driver.apk` $\to$ **Valid**
