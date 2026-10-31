# REALITY LEDGER — SaHaay Real Prototype Audit

This document catalogues every simulated, hardcoded, unwired, or faked component found in the SaHaay-2k26 codebase as of Step 0.
Nothing on the demo path may remain simulated, hardcoded, or faked.

---

## 1. Active Stack Audit (`server/`, `src/core/`, `server/src/*.html`)

| # | Item / Feature | Exact File & Line | Current Problem (Simulated / Faked) | Real Replacement Plan | Milestone | Status |
|---|---|---|---|---|---|---|
| 1 | **Driver Auto-Accept Timer** | `server/src/dispatch.ts:124-132` | `setTimeout(() => acceptMission(...), scaledMs(1.5))` auto-accepts nearest offer for driver. | Delete auto-accept timer. Only authenticated `POST /missions/:id/accept` from a registered driver can accept. | M10 | OPEN |
| 2 | **Broadcast Offers to All Clients** | `server/src/dispatch.ts:110, 177, 234` | `broadcastToAll({ type: 'DRIVER_OFFER', ... })` leaks private offers to all clients. | Targeted WS delivery via `sendToAmbulance(id)` + push notifications only to the assigned driver. | M10 | OPEN |
| 3 | **Static Seed Ambulances** | `server/src/seed.ts:1-77` | 25 ambulances with static synthetic coordinates seeded in-memory. | Drivers register via API; coordinates originate only from live device GPS telemetry. Mark static seeds `virtual: true` for load tests only. | M10 | OPEN |
| 4 | **Unauthenticated WebSocket Handshake** | `server/src/ws.ts:25-35` | `role`, `ambulanceId`, `missionId` extracted directly from URL query parameters without authentication. | Require signed JWT on WebSocket handshake (`?token=...` / protocols header) and derive identity/role server-side. | M10 | OPEN |
| 5 | **Missing Auth & Route Guards** | `server/src/routes.ts:144-245, 465` | `/api/missions/:id/accept`, `/breakdown`, `/status`, `/audit/tamper`, `/demo/reset` lack JWT role-based guards. | Implement JWT middleware (`verifyDriver`, `verifyAdmin`, `verifyCitizen`) with strict actor ownership checks. | M10 | OPEN |
| 6 | **Copy-Pasted SMS Codec** | `server/src/routes.ts:44-93` | Duplicate copy of codec inside `routes.ts` instead of importing from `src/core/sosCodec.ts`. | Extract `@sahaay/core` workspace package (`packages/core`) holding all pure codecs and shared logic. | M10 | OPEN |
| 7 | **In-Memory Volatile Persistence** | `server/src/state.ts:1-35` | Server state (missions, audit chain, sessions) held purely in volatile JS Maps; reset on restart. | SQLite database via `better-sqlite3` with repository layer for users, drivers, missions, audit, and signals. | M10 | OPEN |
| 8 | **Fake SMS Token & Patient in `/sos`** | `server/src/sos.html:436-458` | Hardcoded geohash `ts5e587pk`, fake CRC `f6`, hardcoded patient `'Aarav Sharma'`, fake 120s ETA display. | Replace `/sos` with real web client using browser geolocation, real `@sahaay/core` encoder, and dynamic ETA. | M10 / M17 | OPEN |
| 9 | **Hardcoded Green Corridor Junctions** | `server/src/dispatch.ts:360-420` | 10 hardcoded junction coordinates with straight-line distance, fixed 40 km/h, and static `alerted` state. | Real OSM Overpass signals dataset (`data/signals.json`), route-snagged within 25m, dynamic ETA per fix, PLANNED->ALERTED->PASSED lifecycle. | M15 | OPEN |
| 10 | **Unvalidated Mission Status Transitions** | `server/src/dispatch.ts:290-325` | Any status string accepted without state machine validation; missing `TRANSPORTING` / `AT_HOSPITAL` transitions. | Formal finite state machine with strict actor checks and transition matrix (`SEARCHING -> OFFERED -> ASSIGNED -> ... -> COMPLETED`). | M10 / M12 | OPEN |
| 11 | **No Driver Cancellation Flow** | `server/src/dispatch.ts:330-355` | Drivers can only report breakdown; no flow for a driver cancelling after accepting. | Add `driver-cancel` action with mandatory reason, auto-redispatching to next available in-range driver from live patient GPS. | M13 | OPEN |
| 12 | **Simulated SMS Carrier & Hack** | `src/core/transport/SmsTransport.ts:1-75` | Calls `SimulatedCarrier`; `TransportManager.ts` has a no-op hack `_transition({ ... _no: true })`. | Native Android `SmsManager` bridge + incoming `BroadcastReceiver`; remove no-op transition hack; real connectivity probe. | M16 | OPEN |
| 13 | **Unwired Crash Detector & Tracker** | `src/core/crash/CrashDetector.ts`, `src/core/tracking/DeadReckoningTracker.ts` | Fully tested in unit tests but wired to no real physical sensor or map layer in mobile apps. | Native Android Kotlin foreground service (`CrashMonitorService`) + Quick Settings tile + MapLibre integration. | M14 | OPEN |
| 14 | **Missing Map in Web Control Interface** | `server/src/control.html` | README and docs claim "fleet map (Leaflet/Canvas)", but `control.html` only contains HTML tables. | MapLibre GL JS interactive real map in consolidated Web Console (`/console`). | M11 / M17 | OPEN |
| 15 | **Stale / Conflicting Rules** | `.agent/rules/sahaay.md` | Forbids native modules, APKs, and Gradle builds (superseded by `REAL_PROTOTYPE_SPEC.md`). | Replace rules with specification Section 10 rules permitting local Gradle & Expo native modules. | M10 | OPEN |

---

## 2. Legacy Code & Dual Dashboard Retirement Plan

| Subsystem | Location | Current State | Retirement / Migration Plan | Milestone |
|---|---|---|---|---|
| **Legacy Backend** | `backend/` | Obsolete Node/Mongo/Twilio/Redis architecture. | Move to `legacy/backend/`, exclude from workspaces and CI. | M10 |
| **Legacy Frontend** | `frontend/` | Old Vite/Expo 49 sketches with broken imports (`@emergency/shared`, invalid `Card` import). | Move to `legacy/frontend/`, exclude from workspaces. | M10 |
| **Dual Admin Dashboards** | `frontend/src/pages/AdminDashboard.jsx` & `server/src/control.html` | Two disconnected admin dashboards built for different architectures. | Consolidate into single role-based Web Console at `/console` (Operator, Traffic Authority, Admin). | M10 / M17 |

---

## 3. Discrepancies Between Docs and Reality

1. `docs/walkthrough.md` documents endpoints `/ambulance/accept` and `/ambulance/breakdown` which do not exist in `server/src/routes.ts` (actual routes are `/api/missions/:id/accept` and `/api/missions/:id/breakdown`).
2. Multiple docs claim a Leaflet/Canvas fleet map exists; zero Leaflet or MapLibre code exists in `server/src/control.html` or `server/src/index.ts`.
3. SMS fallback in `server/src/sos.html` claims 9-field geohash protocol with hardcoded CRC `f6`; server's `decodeSmsToken` expects 7 fields Base36 and rejects the payload.
