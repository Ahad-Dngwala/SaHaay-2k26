# REALITY LEDGER — SaHaay Real Prototype Audit

This document catalogues every simulated, hardcoded, unwired, or faked component found in the SaHaay-2k26 codebase as of Step 0, along with the verified resolution for each item.
Nothing on the demo path remains simulated, hardcoded, or faked.

---

## 1. Active Stack Audit (`server/`, `src/core/`, `server/src/*.html`)

| # | Item / Feature | Exact File & Line | Original Problem (Simulated / Faked) | Real Replacement Plan | Milestone | Status | Resolution Details |
|---|---|---|---|---|---|---|---|
| 1 | **Driver Auto-Accept Timer** | `server/src/dispatch.ts:124-132` | `setTimeout(() => acceptMission(...), scaledMs(1.5))` auto-accepted nearest offer for driver. | Delete auto-accept timer. Only authenticated `POST /missions/:id/accept` from a registered driver can accept. | M10 | **RESOLVED** | Removed timer; strict driver authentication required in `dispatch.ts` (`c62e6d3`). |
| 2 | **Broadcast Offers to All Clients** | `server/src/dispatch.ts:110, 177, 234` | `broadcastToAll({ type: 'DRIVER_OFFER', ... })` leaked private offers to all clients. | Targeted WS delivery via `sendToAmbulance(id)` + push notifications only to the assigned driver. | M10 | **RESOLVED** | Offers dispatched strictly via `sendToAmbulance` to matching driver WS connection (`c62e6d3`, `b113f6e`). |
| 3 | **Static Seed Ambulances** | `server/src/seed.ts:1-77` | 25 ambulances with static synthetic coordinates seeded in-memory. | Drivers register via API; coordinates originate only from live device GPS telemetry. Mark static seeds `virtual: true` for load tests only. | M10 | **RESOLVED** | Seed ambulances marked virtual; live telemetry updates persist real GPS fixes to SQLite db (`0d39038`). |
| 4 | **Unauthenticated WebSocket Handshake** | `server/src/ws.ts:25-35` | `role`, `ambulanceId`, `missionId` extracted directly from URL query parameters without authentication. | Require signed JWT on WebSocket handshake (`?token=...` / protocols header) and derive identity/role server-side. | M10 | **RESOLVED** | Handshake enforces JWT verification via `verifyToken`, extracting actor identity and rejecting unauthenticated sockets (`2e547c8`). |
| 5 | **Missing Auth & Route Guards** | `server/src/routes.ts:144-245, 465` | `/api/missions/:id/accept`, `/breakdown`, `/status`, `/audit/tamper`, `/demo/reset` lacked JWT role-based guards. | Implement JWT middleware (`verifyDriver`, `verifyAdmin`, `verifyCitizen`) with strict actor ownership checks. | M10 | **RESOLVED** | Added `requireAuth`, `requireRole('driver' \| 'admin')`, and ownership validation across all mutable API endpoints (`2e547c8`). |
| 6 | **Copy-Pasted SMS Codec** | `server/src/routes.ts:44-93` | Duplicate copy of codec inside `routes.ts` instead of importing from `src/core/sosCodec.ts`. | Extract `@sahaay/core` workspace package (`packages/core`) holding all pure codecs and shared logic. | M10 | **RESOLVED** | `@sahaay/core` created; `sosCodec.ts` and `smsProtocol.ts` exported and used uniformly across server and mobile (`1b2f59e`). |
| 7 | **In-Memory Volatile Persistence** | `server/src/state.ts:1-35` | Server state (missions, audit chain, sessions) held purely in volatile JS Maps; reset on restart. | SQLite database via `better-sqlite3` with repository layer for users, drivers, missions, audit, and signals. | M10 | **RESOLVED** | Implemented `server/src/db.ts` with SQLite tables, WAL mode, migrations, and repository accessors (`0d39038`). |
| 8 | **Fake SMS Token & Patient in `/sos`** | `server/src/sos.html:436-458` | Hardcoded geohash `ts5e587pk`, fake CRC `f6`, hardcoded patient `'Aarav Sharma'`, fake 120s ETA display. | Replace `/sos` with real web client using browser geolocation, real `@sahaay/core` encoder, and dynamic ETA. | M10 / M17 | **RESOLVED** | Consolidated into `/console` with real device GPS, dynamic Base36 encoder, and real OSRM ETA routing (`71db7fd`). |
| 9 | **Hardcoded Green Corridor Junctions** | `server/src/dispatch.ts:360-420` | 10 hardcoded junction coordinates with straight-line distance, fixed 40 km/h, and static `alerted` state. | Real OSM Overpass signals dataset (`data/signals.json`), route-snagged within 25m, dynamic ETA per fix, PLANNED->ALERTED->PASSED lifecycle. | M15 | **RESOLVED** | Implemented `server/src/green-corridor.ts` with 20 real junctions, 25m polyline snapping, division filtering, and dynamic ETA state machine (`7f1e02d`). |
| 10 | **Unvalidated Mission Status Transitions** | `server/src/dispatch.ts:290-325` | Any status string accepted without state machine validation; missing `TRANSPORTING` / `AT_HOSPITAL` transitions. | Formal finite state machine with strict actor checks and transition matrix (`SEARCHING -> OFFERED -> ASSIGNED -> ... -> COMPLETED`). | M10 / M12 | **RESOLVED** | FSM transition validator in `dispatch.ts` enforces legitimate sequence and authorized actor checks (`2e547c8`, `5d41a4d`). |
| 11 | **No Driver Cancellation Flow** | `server/src/dispatch.ts:330-355` | Drivers can only report breakdown; no flow for a driver cancelling after accepting. | Add `driver-cancel` action with mandatory reason, auto-redispatching to next available in-range driver from live patient GPS. | M13 | **RESOLVED** | `POST /api/missions/:id/cancel` implemented; automatically puts mission back to `SEARCHING`, blacklists cancelling driver, and alerts citizen (`3db83a9`). |
| 12 | **Simulated SMS Carrier & Hack** | `src/core/transport/SmsTransport.ts:1-75` | Calls `SimulatedCarrier`; `TransportManager.ts` has a no-op hack `_transition({ ... _no: true })`. | Native Android `SmsManager` bridge + incoming `BroadcastReceiver`; remove no-op transition hack; real connectivity probe. | M16 | **RESOLVED** | Native `SmsReceiver` + `SmsBridge` Android hooks added; driver SMS Gateway server implemented; no-op hack removed (`e3fbf8b`). |
| 13 | **Unwired Crash Detector & Tracker** | `src/core/crash/CrashDetector.ts`, `src/core/tracking/DeadReckoningTracker.ts` | Fully tested in unit tests but wired to no real physical sensor or map layer in mobile apps. | Native Android Kotlin foreground service (`CrashMonitorService`) + Quick Settings tile + MapLibre integration. | M14 | **RESOLVED** | Kotlin `CrashMonitorService` background sensor listener created with tile toggle and countdown notification (`beeaa92`). |
| 14 | **Missing Map in Web Control Interface** | `server/src/control.html` | README and docs claim "fleet map (Leaflet/Canvas)", but `control.html` only contained HTML tables. | MapLibre GL JS interactive real map in consolidated Web Console (`/console`). | M11 / M17 | **RESOLVED** | Integrated MapLibre GL JS into `/console` with real vector tiles, hospital routing polyline, and live ambulance markers (`71db7fd`). |
| 15 | **Stale / Conflicting Rules** | `.agent/rules/sahaay.md` | Forbade native modules, APKs, and Gradle builds (superseded by `REAL_PROTOTYPE_SPEC.md`). | Replace rules with specification Section 10 rules permitting local Gradle & Expo native modules. | M10 | **RESOLVED** | Workspace rules updated to permit local Android SDK Gradle builds and native modules (`b1b5e25`). |

---

## 2. Legacy Code & Dual Dashboard Retirement Plan

| Subsystem | Location | Current State | Retirement / Migration Plan | Milestone | Status |
|---|---|---|---|---|---|
| **Legacy Backend** | `backend/` | Obsolete Node/Mongo/Twilio/Redis architecture. | Moved to `legacy/backend/`, excluded from workspaces and CI. | M10 | **RESOLVED** (`bf14aa5`) |
| **Legacy Frontend** | `frontend/` | Old Vite/Expo 49 sketches with broken imports (`@emergency/shared`, invalid `Card` import). | Moved to `legacy/frontend/`, excluded from workspaces. | M10 | **RESOLVED** (`bf14aa5`) |
| **Dual Admin Dashboards** | `frontend/src/pages/AdminDashboard.jsx` & `server/src/control.html` | Two disconnected admin dashboards built for different architectures. | Consolidate into single role-based Web Console at `/console` (Operator, Traffic Authority, Admin). | M10 / M17 | **RESOLVED** (`71db7fd`) |

---

## 3. Discrepancies Between Docs and Reality

1. **Endpoint Discrepancy:** `docs/walkthrough.md` documented `/ambulance/accept` and `/ambulance/breakdown`. Fixed: All documentation and code aligned to RESTful `/api/missions/:id/accept`, `/api/missions/:id/breakdown`, and `/api/missions/:id/cancel`.
2. **Missing Fleet Map:** Addressed in M11/M17: Full MapLibre GL map deployed in `apps/admin-web/` and served at `/console` with live GPS markers and OSRM routing.
3. **SMS Inbound Incompatibility:** Addressed in M16: Compact Base36 protocol (`smsProtocol.ts`) unified across client and server with CRC-8 error detection and zero hardcoded payloads.
