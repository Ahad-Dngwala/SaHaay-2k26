# SaHaay — Test Cases & Sample Data

## 1. Test Suite Summary

All tests are pure, deterministic, and execute locally without external database, cloud, or network connections:
- Command: `npm test`
- Current Status: **58 passed / 58 total** across **7 test suites**.
- Typecheck: `npx tsc --noEmit` (**0 errors**).

---

## 2. Test Suite Breakdown

### Suite 1: `src/core/crash/CountdownTimer.test.ts` (6 Tests)
- **Default Duration:** Verifies that timer defaults to 30 seconds (`COUNTDOWN_SEC = 30`).
- **Demo Override Range:** Clamps duration overrides strictly between `COUNTDOWN_MIN` (5s) and `COUNTDOWN_MAX` (30s).
- **Per-Second Ticks:** Emits tick events every second with accurate remaining seconds.
- **Exactly-Once SOS:** Emits `expired` and triggers callback exactly once at expiry.
- **Cancellation Guarantee:** Calling `cancel()` prevents expiration and guarantees zero SOS transmissions.
- **Safe State Handling:** Prevents double-cancellation or cancelling after expiration.

### Suite 2: `src/core/transport/TransportManager.test.ts` (9 Tests)
- **Initial State:** Starts in `ONLINE` state.
- **Degradation Trigger:** 3 consecutive HTTP failures transition to `DEGRADED`.
- **Blackout Threshold:** 6 consecutive HTTP failures transition to `OFFLINE_SMS`.
- **Manual Blackout:** Operator toggle `FORCE_BLACKOUT(true)` immediately forces `OFFLINE_SMS`.
- **Recovery Transition:** Disabling `FORCE_BLACKOUT` restores `ONLINE` state and resets failure counters.
- **Transport Routing:** In `OFFLINE_SMS`, payloads are routed through `SmsTransport` / `SimulatedCarrier`.
- **Outbox Persistence:** Failed transmissions enqueue into outbox with exponential backoff.
- **Outbox Draining:** Queued messages retry upon connectivity restoration.
- **Deduplication:** Repeated transmissions with the same idempotency key are deduplicated.

### Suite 3: `src/core/crash/CrashDetector.test.ts` (8 Tests)
- **Phone Drop Rejection:** Brief sharp spike ($3.5\text{--}4.0\text{ g}$ for $40\text{ ms}$) without post-impact stillness does not trigger crash.
- **Pothole Rejection:** Road bump waveform ($2.3\text{ g}$) does not trigger crash.
- **3G Crash Confirmation:** Sustained $\ge 2.5\text{ g}$ impact for $\ge 100\text{ ms}$ followed by $1000\text{ ms}$ stillness triggers `CRASH_CONFIRMED`.
- **Threshold 2.5G Crash:** Impact at the exact $2.5\text{ g}$ threshold with stillness triggers detection.
- **State Machine Phases:** Accurately cycles `IDLE` $\to$ `IMPACT_DETECTED` $\to$ `WAITING_STILLNESS` $\to$ `CRASH_CONFIRMED` $\to$ `IDLE`.
- **Reset on Cancel:** Cleanly resets to `IDLE` on manual cancellation.
- **Stillness Variance Filter:** Enforces $\Delta g < 0.3\text{ g}$ during the post-impact window.
- **Absence of Stillness:** Continuous movement or oscillation after impact prevents crash confirmation.

### Suite 4: `src/core/tracking/DeadReckoningTracker.test.ts` (8 Tests)
- **Cold State:** Frame returns null before first telemetry fix is received.
- **Fix Acquisition:** Centers marker on first received fix coordinates.
- **Monotonicity:** Fixes with `seq <= lastSeq` are discarded to prevent telemetry jitter.
- **Heading Extrapolation:** Advances marker along heading vector using `@turf/destination` when off-route.
- **Polyline Route Extrapolation:** Projects marker along route coordinates using `@turf/along`.
- **Exponential Smoothing:** Filters position jumps with smoothing constant ($\tau = 0.7\text{s}$).
- **Horizon Freezing:** Freezes marker projection after 45 seconds of signal silence; sets `predicting: false`.
- **Stale Telemetry Reporting:** Correctly tracks and reports `staleS` elapsed seconds since last valid fix.

### Suite 5: `src/core/sosCodec.test.ts` (11 Tests)
- **Sub-Metre Coordinate Accuracy:** Fixed-point encoding preserves coordinate resolution within $\le 1\text{ m}$.
- **Packet Length Ceilings:** Generates tokens of $38\text{--}45$ characters (well below the 100-character budget and 160 GSM-7 ceiling).
- **CRC-8 Integrity:** Computes polynomial `0x07` checksum; rejects intentionally mutated bytes.
- **Truncation Resilience:** Truncated tokens fail gracefully with `ok: false` without throwing.
- **Malformed Delimiters:** Missing or excessive pipe delimiters return safe error results.
- **Idempotency UID:** Preserves client-generated unique IDs across encode/decode cycles.
- **Gazetteer Centroid IDs:** Resolves 2-character Base36 IDs to Ahmedabad locality names.
- **Gazetteer Data Sanity:** Validates all ~200 gazetteer entries are within Gujarat geographic boundaries ($20^\circ\text{N}\text{--}25^\circ\text{N}, 68^\circ\text{E}\text{--}76^\circ\text{E}$).
- **Encode Bounds Validation:** Latitude outside $[-90, 90]$ or longitude outside $[-180, 180]$ throws `RangeError` before encoding.
- **Timestamp & Address Bounds:** Rejects negative timestamps and address IDs $\ge 1296$ on encode.
- **Decode Bounds Validation:** Out-of-range coordinate tokens return `ok: false`.

### Suite 6: `server/src/dispatch.test.ts` (8 Tests)
- **Spatial Grid Proximity:** Matches closest available ambulance to patient within the search radius.
- **Concurrent Driver Acceptance:** When multiple drivers accept concurrently, exactly one driver wins.
- **HTTP 409 Conflict:** Losing or invalid driver acceptance receives HTTP 409 Conflict.
- **Live GPS Replacement Routing:** Breakdown re-dispatch routes replacement ambulance to patient's latest live GPS.
- **Stranded Coordinates Preservation:** Preserves stranded ambulance breakdown coordinates in audit log for recovery.
- **Dynamic Time Scale Rescheduling:** Calling `setDemoTimeScale` actively reschedules running expansion timers.
- **Advisory Corridor Disclaimer:** Green Corridor alerts contain explicit advisory disclaimer.
- **Cryptographic Audit Validation:** Verifies SHA-256 audit ledger integrity and tamper detection.

### Suite 7: `server/src/e2e-journey.test.ts` (8 Tests)
- **Stage 1 (SOS Initiation):** Citizen initiates SOS; 30s countdown executes or manual SOS fires.
- **Stage 2 (Mission & Spatial Query):** Inbound token creates mission and queries spatial index.
- **Stage 3 (Atomic Acceptance Race):** Driver 1 accepts, Driver 2 rejected with HTTP 409 Conflict.
- **Stage 4 (Assignment & Tracking):** Citizen receives assigned driver and real-time telemetry stream.
- **Stage 5 (Network Outage Fallback):** Data network outage triggers SMS fallback.
- **Stage 6 (Breakdown Re-dispatch):** Reported breakdown re-dispatches nearest unit to patient's live coordinates.
- **Stage 7 (Stranded Recovery Record):** Breakdown location is permanently recorded in audit chain.
- **Stage 8 (Mission Completion & Audit):** Mission completes successfully and SHA-256 audit chain validates.

---

## 3. Sample Test Payloads

### Sample Base36 SOS Token
```text
S1|k2m9x|77ov8|21v7k|1y3k9|0a|0|3f
```
- Protocol Version: `S1`
- Unique ID: `k2m9x`
- Latitude: `77ov8` (Base36 $\to 23.0225^\circ\text{ N}$)
- Longitude: `21v7k` (Base36 $\to 72.5714^\circ\text{ E}$)
- Timestamp: `1y3k9` (Base36 unix seconds)
- Locality Address ID: `0a` (centroid index in `gazetteer.json`)
- Flags: `0`
- CRC-8 Checksum: `3f`
- Total Characters: **35 characters** (65 characters of headroom remaining under 100-char budget).

### Sample Inbound SMS Payload (Twilio Webhook Style)
```json
{
  "From": "+919876543210",
  "Body": "S1|k2m9x|77ov8|21v7k|1y3k9|0a|0|3f",
  "MessageSid": "SM_SIMULATED_001"
}
```

### Sample Seeded Ambulance (Ahmedabad Navrangpura)
```json
{
  "id": "AMB-01",
  "driverName": "Ramesh Patel",
  "vehicleNo": "GJ-01-AX-1008",
  "lat": 23.0330,
  "lon": 72.5607,
  "heading": 90,
  "speedKmh": 45,
  "status": "AVAILABLE"
}
```
