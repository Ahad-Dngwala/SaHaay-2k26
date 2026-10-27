# SaHaay — Test Cases & Sample Data

## 1. Test Suite Summary

All tests are pure, deterministic, and execute locally without database or network connections:
- Command: `npm test`
- Current Status: **45 passed / 45 total** across 4 test suites.

---

## 2. Test Suite Breakdown

### Suite 1: `src/core/sosCodec.test.ts` (14 Tests)
- **Round-Trip Precision:** Encodes arbitrary GPS coordinates within Ahmedabad bounding box and verifies decode produces $\le 1\text{ m}$ deviation.
- **Length Constraint:** Validates that worst-case coordinates produce tokens $\le 100$ characters (actual: $38\text{--}45$ characters), well below the 160-character GSM-7 ceiling.
- **Integrity & Checksum:** Validates CRC-8 checksum calculation (`poly 0x07`). Intentionally mutated payloads fail CRC verification and return `ok: false`.
- **Truncation & Malformed:** Truncated strings, missing delimiter pipes, non-ASCII characters, and out-of-range coordinates are rejected gracefully without exceptions.
- **Idempotency:** Token decoding produces identical `uid` values for deduplication.

### Suite 2: `src/core/crash/CrashDetector.test.ts` (7 Tests)
- **Phone Drop Rejection:** Brief sharp spike ($3.5\text{--}4.0\text{ g}$ for $40\text{ ms}$) without stillness does NOT trigger crash.
- **Pothole Rejection:** Bump waveform ($2.3\text{ g}$) does NOT trigger crash.
- **3G Crash Confirmation:** Sustained $\ge 2.5\text{ g}$ impact for $\ge 100\text{ ms}$ followed by $1000\text{ ms}$ stillness triggers `CRASH_CONFIRMED`.
- **Threshold 2.5G Crash:** Exactly $2.5\text{ g}$ impact with stillness triggers detection.
- **State Lifecycle:** Phase transitions properly between `IDLE` $\to$ `IMPACT_DETECTED` $\to$ `WAITING_STILLNESS` $\to$ `CRASH_CONFIRMED` $\to$ `IDLE`.

### Suite 3: `src/core/transport/TransportManager.test.ts` (18 Tests)
- **Reducer State Transitions:**
  - Initial state is `ONLINE`.
  - 3 consecutive HTTP failures transition to `DEGRADED`.
  - 6 consecutive HTTP failures transition to `OFFLINE_SMS`.
  - `FORCE_BLACKOUT(true)` immediately transitions to `OFFLINE_SMS`.
  - `FORCE_BLACKOUT(false)` recovers state to `ONLINE`.
  - HTTP success while degraded transitions to `RECOVERED` until outbox drains.
- **Outbox Queue & Backoff:** Retries queued messages with exponential backoff and message deduplication.

### Suite 4: `src/core/tracking/DeadReckoningTracker.test.ts` (6 Tests)
- **Initialization:** Frame returns null before first telemetry fix is received.
- **Initial Fix:** Marker centers on fix coordinates.
- **Out-of-Order Rejection:** Fixes with `seq <= lastSeq` are rejected; out-of-order pings do not corrupt position.
- **Heading Extrapolation:** Advances marker along heading vector when no road geometry is attached.
- **Route Polyline Extrapolation:** Advances marker along route coordinates using `@turf/along`.
- **Horizon Freezing:** Freezes marker position after 45 seconds of signal silence; marks `predicting: false` and increments `staleS`.

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
- Total Characters: **35 characters** (65 characters of headroom remaining).

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
