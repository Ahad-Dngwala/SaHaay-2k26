# SaHaay — Test Cases & Sample Data

## 1. Test Suite Summary

All tests are pure, deterministic, and execute locally without external database, cloud, or network connections:
- Command: `npm run test:ci` or `npm test`
- Current Status: **58 passed / 58 total** across **7 test suites**.
- Execution: `--runInBand` in ~3 seconds with zero leaks or open handles.
- Typecheck: `npm run typecheck` (**0 errors**).

---

## 2. Test Suite Breakdown (Exact Jest Discovered Test Counts)

### Suite 1: `src/core/crash/CountdownTimer.test.ts` (5 Tests)
1. **Default Duration:** Defaults to 30-second countdown duration (`COUNTDOWN_SEC = 30`).
2. **Override Clamp:** Clamps override strictly between `COUNTDOWN_MIN` (5s) and `COUNTDOWN_MAX` (30s).
3. **Per-Second Ticks:** Emits tick events every second with decreasing `remainingSeconds`.
4. **Exactly-Once Expiry:** Emits `expired` and executes `onExpired` callback exactly once when reaching 0.
5. **Cancellation Guarantee:** Calling `cancel()` emits `cancelled` and guarantees expired callback is never triggered (prevents SOS).

### Suite 2: `src/core/transport/TransportManager.test.ts` (10 Tests)
1. **Initial State:** Starts in `ONLINE` state.
2. **Degradation Trigger:** Transitions to `DEGRADED` after 3 consecutive HTTP failures.
3. **Blackout Fallback:** Transitions to `OFFLINE_SMS` after 6 consecutive failures.
4. **Manual Operator Blackout:** Transitions to `OFFLINE_SMS` immediately on `FORCE_BLACKOUT(true)`.
5. **Recovery Transition:** Recovers to `ONLINE` on `FORCE_BLACKOUT(false)`.
6. **Transport Routing:** Routes to `SmsTransport` when in `OFFLINE_SMS` state.
7. **Outbox Enqueue:** Enqueues message to outbox on HTTP failure.
8. **Outbox Retry:** Retries queued messages on recovery.
9. **Deduplication:** Deduplicates identical messages by idempotency key.
10. **Error Recovery:** Handles unexpected network drops gracefully.

### Suite 3: `src/core/crash/CrashDetector.test.ts` (9 Tests)
1. **Phone Drop Rejection:** Brief sharp spike ($3.5\text{--}4.0\text{ g}$ for $40\text{ ms}$) without post-impact stillness does not trigger crash.
2. **Pothole Rejection:** Road bump waveform ($2.3\text{ g}$) does not trigger crash.
3. **3G Crash Confirmation:** Sustained $\ge 2.5\text{ g}$ impact for $\ge 100\text{ ms}$ followed by $1000\text{ ms}$ stillness triggers `CRASH_CONFIRMED`.
4. **Threshold 2.5G Crash:** Impact at the exact $2.5\text{ g}$ threshold with stillness triggers detection.
5. **State Lifecycle:** Cycles `IDLE` $\to$ `IMPACT_DETECTED` $\to$ `WAITING_STILLNESS` $\to$ `CRASH_CONFIRMED` $\to$ `IDLE`.
6. **Reset on Cancel:** Cleanly resets to `IDLE` on manual cancellation.
7. **Stillness Variance Filter:** Enforces $\Delta g < 0.3\text{ g}$ during the post-impact window.
8. **Absence of Stillness:** Continuous movement or oscillation after impact prevents crash confirmation.
9. **Waveform Feed Processing:** Safely handles high-frequency stream of simulated sensor samples.

### Suite 4: `src/core/tracking/DeadReckoningTracker.test.ts` (6 Tests)
1. **Cold State:** Frame returns null before first telemetry fix is received.
2. **Fix Acquisition:** Centers marker on first received fix coordinates.
3. **Monotonicity Filter:** Discards out-of-order telemetry fixes (`seq <= lastSeq`).
4. **Heading Extrapolation:** Advances marker along heading vector using `@turf/destination` when off-route.
5. **Polyline Route Extrapolation:** Projects marker along route coordinates using `@turf/along`.
6. **Exponential Smoothing & Horizon Freeze:** Applies exponential filter ($\tau = 0.7\text{s}$) to prevent visual snaps and freezes projection after 45s signal silence (`predicting: false`, reports `staleS`).

### Suite 5: `src/core/sosCodec.test.ts` (23 Tests)
1. **CRC Determinism & Integrity (2 tests):** Checks CRC-8 calculation determinism and distinguishes different input strings.
2. **ASCII Wire Format (4 tests):** Generates single-part SMS token ($< 160$ chars), verified ASCII printable, starts with `S1|`, and stays within budget under worst-case coordinates.
3. **Precision & Idempotency (4 tests):** Round-trip preserves coordinates to $\le 1\text{ m}$ precision, replay idempotency, rejects empty string, and rejects malformed delimiters.
4. **Corruption & Tamper Rejection (3 tests):** Rejects mutated CRC checksums, truncated tokens, and non-ASCII bytes with `ok: false`.
5. **Version & Bounds Validation (8 tests):** Rejects invalid protocol versions, enforces strict latitude $[-90, 90]$ and longitude $[-180, 180]$ bounds on encode (throws `RangeError`), rejects negative timestamps and out-of-range address IDs on encode, rejects invalid coordinate fields on decode, and rejects oversized strings $> 160$ characters.
6. **Gazetteer Validation (1 test):** Validates all ~200 entries in `assets/gazetteer.json` have valid centroid coordinates and fit within the 2-character Base36 range ($< 1296$).
7. **UID Generation (2 tests):** Returns 8-character Base36 string and verifies unique collision resistance.

### Suite 6: `server/src/dispatch.test.ts` (4 Tests)
1. **Concurrent Driver Race:** Two drivers accepting the same mission concurrently; exactly one driver wins, competing driver receives losing status (HTTP 409 Conflict at router level).
2. **Breakdown Re-Dispatch:** Re-dispatch routes replacement ambulance to patient's latest live GPS, while permanently preserving stranded ambulance coordinates in the SHA-256 audit ledger.
3. **Dynamic Time Scale Rescheduling:** Calling `setDemoTimeScale` actively recalculates remaining duration and reschedules running expansion timers.
4. **Advisory Disclaimer:** Green Corridor computation carries explicit advisory pre-clearance disclaimer (*No direct signal actuation*).

### Suite 7: `server/src/e2e-journey.test.ts` (1 Test covering 8 Stages)
1. **End-to-End Golden Path User Journey:**
   - *Stage 1:* Citizen initiates SOS; 30s countdown executes or manual SOS fires.
   - *Stage 2:* Inbound token creates mission and queries spatial index.
   - *Stage 3:* Driver 1 accepts (winning lock with HTTP 200); Driver 2 rejected with HTTP 409 Conflict.
   - *Stage 4:* Citizen receives assigned driver and real-time telemetry stream.
   - *Stage 5:* Data network outage triggers SMS fallback.
   - *Stage 6:* Reported breakdown re-dispatches nearest unit to patient's live coordinates.
   - *Stage 7:* Breakdown location recorded in SHA-256 audit ledger.
   - *Stage 8:* Mission completes successfully and SHA-256 audit chain validates.

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
