# SaHaay Architecture Specification (Real Prototype Ecosystem)

## 1. System Overview
SaHaay is an offline-first emergency ambulance response ecosystem designed for India (Hack for Social Cause 2027, Healthcare, Wellbeing & Service Delivery).

The production architecture consists of four tightly-coupled components:
1. **SaHaay Citizen Android Application** (`org.sahaay.citizen`): Native Android APK featuring background sensor crash monitoring (`CrashMonitorService`), Quick Settings arm/disarm tile (`CrashTileService`), real GPS tracking, and GSM SMS fallback (`SmsReceiver`, `SmsBridge`).
2. **SaHaay Ambulance Driver Android Application** (`org.sahaay.driver`): Native Android APK featuring duty management, targeted dispatch offers with TTL, real OSRM routing, stall telemetry detection, breakdown reporting, and in-app SMS-to-HTTP Gateway Mode.
3. **SaHaay Central Web Console** (`/console`): Unified control room with live MapLibre GL JS vector map, mission timeline, operator manual overrides, traffic authority advisory cards, driver verification review, news CMS, and cryptographic SHA-256 audit explorer.
4. **Authoritative Central Backend** (`server/`): Node 22 + Express + WebSocket + SQLite engine providing geospatial indexing across Ahmedabad, atomic first-accept locks, self-healing re-dispatch, and SMS gateway adapter.

---

## 2. Shared Data Model & Self-Healing State Machine
**One Emergency → One Mission Record → One Assigned Ambulance → Shared Real-Time Telemetry**

- Citizen, Driver, and Admin all reference the identical mission ID (`missionId`).
- Driver acceptance utilizes a synchronous atomic lock preventing race conditions or double-dispatch.
- **Mission Lifecycle States:**
  `SEARCHING` ➔ `DISPATCHING` ➔ `ASSIGNED` ➔ `ON_SCENE` ➔ `TRANSPORTING` ➔ `COMPLETED`
- **Self-Healing Exits:**
  - `REDISPATCH`: Triggered by driver cancellation, breakdown (`POST /missions/:id/breakdown`), or in-flight telemetry stall (>90s stationary without driver acknowledgement). Excludes previous vehicle (`previousAmbulanceIds`), resets search ring, and re-dispatches from patient's **live GPS coordinates**.
  - `CANCELLED_BY_PATIENT`: Patient marks safe (`POST /missions/:id/patient-cancel`), immediately releasing assigned unit.
  - `FAILED`: Radius expands (500m ➔ 1000m ➔ 2000m ➔ 4000m ➔ 8000m). When exhausted beyond 8 km, broadcasts 108/112 emergency helpline instructions.

---

## 3. Route-Aware Green Corridor Advisory Pre-Clearance
- **Dataset:** 20 real traffic signal junctions in Ahmedabad (`data/signals.json`) derived from OpenStreetMap.
- **Route-Snapping Engine (`server/src/green-corridor.ts`):** Calculates perpendicular distance from each junction to the driving polyline. Junctions within 25 m are selected as corridor checkpoints.
- **Signal Lifecycle States:**
  `PLANNED` ➔ `ALERTED` (when ETA ≤ 60 s) ➔ `PASSED` (within 30 m) ➔ `CANCELLED` (on breakdown or abort).
- **Traffic Authority Scoping:** Filters upcoming checkpoints by municipal police division bounding box (West, Central, North).
- **Advisory Notice:** All green corridor payloads carry the mandatory legal notice: `ADVISORY PRE-CLEARANCE NOTIFICATION ONLY (No Direct Signal Actuation)`.

---

## 4. Dual-Path GSM SMS Fallback Architecture
- **Protocol Codec (`src/core/smsProtocol.ts`):** Compact Base36 GSM-7 encoding (all packets ≤ 160 characters) with CRC-8 validation:
  - `S1`: Citizen SOS (`S1|<uid>|<lat>|<lon>|<ts>|<addrId>|<flags>|<crc>`)
  - `A1`: Unit Assigned (`A1|<missionId>|<vehicleNo>|<driverName>|<etaS>|<lat>|<lon>|<crc>`)
  - `T1`: Live Telemetry Ping (`T1|<seq>|<lat>|<lon>|<speed>|<heading>|<etaS>|<ts>|<crc>`)
  - `O1`: Driver Offer (`O1|<missionId>|<patientLat>|<patientLon>|<distanceM>|<ttlS>|<crc>`)
  - `D1`: Driver Reply (`D1|<missionId>|<action>|<seq>|<lat>|<lon>|<crc>`)
  - `X1`: Abort / Cancel (`X1|<missionId>|<reasonCode>|<crc>`)
- **Android Native Bridge:** `SmsManager.sendTextMessage()` with `SmsReceiver` BroadcastReceiver for incoming packets.
- **In-App Driver Gateway Mode:** A driver phone with cellular data relays incoming citizen `S1/D1` SMS to the central server via HTTP and transmits server reply packets via SIM card SMS.

---

## 5. Background Crash Detection Architecture
- **Dual-Mode Acceleration Filter (`src/core/crash/CrashDetector.ts`):**
  - `IMPACT` Mode: Sustained impact ≥ 2.5 g for ≥ 100 ms followed by post-impact stillness filter.
  - `SUSTAINED_SHAKE` Mode: Continuous shaking ≥ 1.8 g for ≥ 3 s (for verifiable physical hardware demos).
- **Android Foreground Service (`CrashMonitorService.java`):** Holds a partial wake lock, samples `TYPE_ACCELEROMETER` at ~50 Hz (`SENSOR_DELAY_GAME`), manages high-priority countdown notifications, and triggers automatic emergency dispatch upon countdown expiry.
- **Quick Settings Tile (`CrashTileService.java`):** Allows 1-tap arm/disarm directly from the Android system drawer.

---

## 6. Android Build Architecture
- **Target Platform:** Android 14 (API 34), Min SDK 29.
- **Compiler Pipeline:** `javac` (Java 8 target) ➔ `d8` (DEX) ➔ `aapt2` (resource compilation & packaging) ➔ `zipalign` (4-byte alignment) ➔ `apksigner` (v1/v2 release signing).
- **Outputs:**
  - `artifacts/apk/SaHaay-Citizen.apk` (`org.sahaay.citizen`)
  - `artifacts/apk/SaHaay-Driver.apk` (`org.sahaay.driver`)
