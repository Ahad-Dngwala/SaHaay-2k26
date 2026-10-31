# SaHaay Architecture Specification (M11 Master Ecosystem)

## 1. System Overview
SaHaay is an offline-first emergency ambulance response ecosystem designed for India (Hack for Social Cause).

The ecosystem consists of:
1. **SaHaay Citizen Android Application** (`org.sahaay.citizen`): Native Android APK for citizens to trigger manual SOS, monitor impact crash detection, track approaching ambulances, and read official updates.
2. **SaHaay Ambulance Driver Android Application** (`org.sahaay.driver`): Native Android APK for emergency responders to manage duty availability, receive dispatch offers, navigate to patients and hospitals, update mission milestones, and report vehicle breakdowns.
3. **SaHaay Central Website & Admin Dashboard**: Public portal for APK downloads and system documentation, plus an authenticated Control Room for emergency dispatchers and fleet administrators.
4. **Authoritative Central Backend** (`server/`): Node.js + Express + WebSocket + Persistent Store managing atomic dispatch locking, geospatial matching across Ahmedabad, driver verification, announcement CMS, release management, and tamper-evident audit logs.

> **Scope Boundary**: Green Corridor traffic signal pre-emption and junction actuation are excluded in this version.

---

## 2. Shared Data Model & The "Single Mission" Rule
**One Emergency → One Mission Record → One Accepted Ambulance → Shared Real-Time Telemetry**

- Citizen, Driver, and Admin all reference the identical mission ID (`missionId`).
- Driver acceptance utilizes an atomic lock preventing double-dispatch.
- Mission lifecycle milestones:
  `OFFERED` ➔ `ACCEPTED` ➔ `EN_ROUTE_TO_PATIENT` ➔ `ARRIVED_AT_PATIENT` ➔ `PATIENT_PICKED_UP` ➔ `EN_ROUTE_TO_HOSPITAL` ➔ `ARRIVED_AT_HOSPITAL` ➔ `COMPLETED`
- On breakdown (`BREAKDOWN`): Mission reverts to `SEARCHING`, triggers replacement dispatch around patient location, and records audit trail.

---

## 3. Design Reference Attribution
| Application Screen | Stitch Reference Source | Visual Purpose in SaHaay |
|---|---|---|
| **Citizen Home** | `05_visual_reference_social_ui` | High-contrast dark shell, emergency contact avatar rail, readiness showcase card |
| **Citizen SOS** | `03_citizen_sos` | Tactile 112 Govt hotline & Red SOS hold-to-confirm trigger plate |
| **Citizen Updates** | `04_driver_dispatch` | Repurposed for official alerts, road safety advisories, and disaster bulletins |
| **Shared Tracking** | `02_citizen_tracking` | Ahmedabad road canvas (Navrangpura, Usmanpura, Paldi), ETA dashboard, driver card |
| **Driver Home** | `06_visual_reference_dark_explore_ui` | Ambient dark UI, central duty radar dome, modular driver operational tiles |

---

## 4. Android Build Architecture
- **Target Platform**: Android 14 (API 34)
- **Compiler Pipeline**: `javac` (OpenJDK 25) ➔ `d8` (DEX) ➔ `aapt2` (resource compilation & packaging) ➔ `zipalign` (4-byte alignment) ➔ `apksigner` (v2/v3 APK signing)
- **Outputs**:
  - `artifacts/apk/SaHaay-Citizen.apk` (`org.sahaay.citizen`)
  - `artifacts/apk/SaHaay-Driver.apk` (`org.sahaay.driver`)
