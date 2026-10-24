# SaHaay — Project Context

> **"No patient left waiting."**
> SaHaay is an autonomous emergency-response layer for India: it detects or receives an SOS, finds the nearest available ambulance, tracks it live, re-dispatches automatically if it fails, and keeps working over plain SMS when the internet is down.

- **Repo:** https://github.com/Ahad-Dngwala/SaHaay-2k26
- **Target event:** MY Bharat — *Hack for Social Cause* (VBYLD 2026), theme **Healthcare, Wellbeing & Service Delivery**
- **Document basis:** the pitch deck (`organized.pdf`), the system brief, and a read-through of the repo as it stands on `main`. Everything marked ✅ / 🟡 / ❌ below was checked against the code, not the slides.

---

## 1. The problem

Calling an ambulance in India is a blind gamble.

| Missing data point | What the caller experiences today |
|---|---|
| **Time** | No ETA. Nobody knows when help arrives. |
| **Identity** | Which ambulance is coming is unverified. |
| **Location** | No visibility of where it is right now. |
| **Reliability** | If it breaks down or hits traffic there is no recovery path. |

Root causes from the deck: manual call-centre assignment with no "nearest unit" logic, no GPS tracking for the caller, no failover protocol, no audit trail. The deck backs this with headlines (newborn dies after ambulance breakdown; woman dies during 5-hour wait; 16-month-old dies with ambulance stuck 5 hours in traffic; etc.). **Before submission, add the exact article URLs and dates to the deck — judges will check.**

## 2. The solution (pitch)

Replace guesswork with software-driven orchestration:

| Feature | Current system | SaHaay |
|---|---|---|
| Dispatch logic | No nearest logic | Geospatial proximity |
| Operation | Manual call centre | Autonomous orchestration |
| Visibility | Blind waiting | Live GPS tracking |
| Reliability | No failover | Automatic recovery |
| Accountability | No audit trail | Full digital logs |

### End-to-end flow (9 steps from the deck)
1. **Offline SOS initiation** — user triggers distress via encoded SMS (no internet needed) or the app / crash detection.
2. **Signal reception & validation** — server receives, validates, handles retries, removes duplicates.
3. **Mission created & acknowledged** — unique Mission ID logged, confirmation SMS sent.
4. **Autonomous ripple dispatch** — search for nearest viable ambulance (availability, capability, distance).
5. **Does a unit accept?** — yes/no decision.
6A. **No →** radius "ripples" outward; if still none, escalate to a human operator.
6B. **Yes →** fastest route computed, live tracking shared with the user.
7. **"Green Wave"** — time-bound traffic-signal pre-clearance along the route.
8. **Ambulance navigates to scene** with real-time updates.
9. **Mission completion** — arrival logged, status "Completed", signals revert.

### Ripple Search Algorithm
Trigger → Phase 1: search within **500 m** → Phase 2: if no acceptance in **2 min**, expand to **1 km** → Phase 3: **2 km+** → first acceptance **locks** the mission, others are cancelled.

### Self-healing failover
If the active ambulance stops (breakdown / traffic halt), the backend captures its GPS position, finds the next-nearest unit, and transfers the mission with no human involved.

### Disaster-ready offline mode
Over 2G/GSM via an SMS gateway (Twilio). Protocol in the deck: `EMERGENCY#lat,long`. Brief target format: compact `SOS|UID:123|LAT:28.6|LON:77.2` (or base36 geohash) under the **160-character** limit.

## 3. Architecture

| Layer | Choice | Why |
|---|---|---|
| Mobile | React Native (user + driver variants) | Cross-platform |
| Backend | Node.js / Express | Non-blocking I/O, high concurrency |
| Real-time | Socket.io | Bi-directional tracking streams |
| Database | MongoDB (geospatial) | Flexible schema + proximity queries |
| Services | Google Maps Directions, Twilio SMS | Routing intelligence + SMS fallback |
| Infra (target) | Docker + Kubernetes | Containerised scale |
| Scale story | Microservices; state/region clusters (Gujarat, Delhi, Maharashtra in the deck); stateless services | National scale |

**Transport — dual pipeline:** primary Socket.io WebSockets; fallback compact SMS payloads.
**Crash detection (brief):** high-frequency accelerometer/gyroscope polling with a mandatory **5–10 s cancel window** before any alert goes out.
**Clockless state machine (brief):** the backend reassembles emergency state from asynchronous, possibly out-of-order packets without depending on wall-clock timing.

## 4. What the repo actually contains (verified)

### Repository layout
```
backend/            Node/Express API (≈4.1k lines)
  controllers/      auth, emergency, driver, sms, traffic
  services/         dispatch, geo, routing, sms, email, websocket, trafficNotification
  sockets/          tracking.socket.js (Socket.io rooms + GPS stream)
  models/           User, Driver, Emergency, Assignment, EmergencyEvent,
                    EmergencyMetrics, GpsLog, MessageLog, TrafficAuthority
  middleware/       auth (JWT), rateLimiter
  config/           db, env, redis (optional)
frontend/
  src/pages/        Vite web app: HomePage, UserEmergency, DriverApp, AdminDashboard
  packages/
    user-app/       Expo / React Native citizen app (Redux; "gearo" crash-detect modules)
    ambulance-app/  Expo / React Native driver app (missions, navigation, live tracking)
    shared/         common components, hooks, validators, coordinate utils
```

### Feature status vs. the pitch

| Capability | Status | Evidence / gap |
|---|---|---|
| Emergency creation + dispatch start | ✅ | `emergency.controller`, `dispatch.service` |
| Nearest-first driver search (500 m → 1 km) | ✅ | `geo.service` bounding box + Haversine, sorted by distance |
| 2-minute auto-expansion timer | ✅ | `setTimeout(120000)` in `dispatch.service` |
| 2 km phase | ❌ | Code stops at 1 km, then marks the emergency `failed` |
| Escalation to human operator on depletion | ❌ | No operator hand-off; failure just emits `emergency:<id>:failed`. An admin dashboard exists but is not wired as an escalation queue |
| First-accept-wins lock | 🟡 | `driver.accept` uses `findOneAndUpdate`; **verify it is conditional on `status: "pending"` / emergency unassigned** and test with two simultaneous accepts |
| Live GPS tracking (Socket.io) | ✅ | `tracking.socket.js` persists `GpsLog`, emits `track:<emergencyId>` |
| Route + ETA | ✅ | `routing.service` (Google Directions) with fallback |
| Failover / transfer | 🟡 | `POST /api/emergency/transfer` (JWT) re-dispatches from the ambulance's last GPS. It is **triggered by a person**, not by automatic zero-velocity detection |
| Automatic zero-velocity anomaly detection | ❌ | Not implemented — this is the "self-healing" claim, so it matters |
| Audit trail | ✅ | `EmergencyEvent`, `MessageLog`, `EmergencyMetrics`, `GpsLog` |
| Inbound SMS SOS | 🟡 | `/api/sms` parses `EMERGENCY#lat,lng[#address]` only |
| Compact `SOS\|UID\|LAT\|LON` / base36 geohash / 160-char budgeting | ❌ | Not implemented |
| "Clockless" state machine (dedupe, retries, out-of-order packets) | ❌ | No sequence numbers, idempotency keys or reassembly. README claims it; code doesn't have it |
| Client sends SMS without internet | 🟡 | `smsService.js` uses `Linking.openURL('sms:…')`, which **opens the composer — the user must press Send**; Android-only per its comment |
| Confirmation SMS with Mission ID | 🟡 | `sendUserConfirmation` exists; inbound handler replies with plain text (Twilio normally expects TwiML for auto-replies) — verify end-to-end |
| Driver SMS accept (`ACCEPT` reply) | ❌ | Dispatch SMS says "reply ACCEPT" but no handler parses it |
| Crash detection (accelerometer) | 🟡 | `useGearo.js` triggers at magnitude > 50 using `react-native-sensors`; that dependency is **not in** `user-app/package.json`; `vibrationThresholds.js` defines different thresholds (1.2–4.0) that the hook doesn't use |
| 5–10 s cancel window | 🟡 | `useCancelTimer`, `cancelService`, `CancelConfirmScreen` exist — verify the timer gates the dispatch call |
| Green-corridor / traffic pre-clearance | 🟡 | Extracts route checkpoints and **emails** registered traffic authorities (`trafficNotification.service`, nodemailer). It does not control signals. README itself marks "Traffic Light Integration (API Pending)" |
| MongoDB 2D geospatial indexes (`$nearSphere`/`$geoWithin`) | ❌ | Schema stores plain `lat`/`lng` with a compound index; no `2dsphere`. Works at demo scale, won't match the "geospatial index" claim |
| JWT auth + rate limiting | 🟡 | Present; emergency creation is intentionally public; `JWT_SECRET` in the committed `.env` is only 6 chars |
| Redis | 🟡 | Optional; dispatch timers live in an **in-memory `Map`** |
| Docker / Kubernetes | ❌ | No Dockerfile, compose or manifests in the repo |
| Automated tests | ❌ | `npm test` is a stub |
| Multi-region clusters / "millions of concurrent emergencies" | ❌ | Architectural intent only; no benchmark or load test |
| "< 200 ms dispatch" (README) | ❌ | Unmeasured |

## 5. Known issues to fix before anyone outside the team sees the repo

1. **Secrets are committed.** `.env` is tracked (`.gitignore` ignores `.env.local`, not `.env`) and contains a real-looking Google Maps API key and Mongo URI. **Rotate the Maps key now**, restrict it by API + referrer/app, `git rm --cached .env`, add `.env` to `.gitignore`, and ship only `env.template`. Purge from history if the repo is public (`git filter-repo` / BFG).
2. **Timers in process memory** (`activeTimers` Map) are lost on restart and break with more than one backend instance. Move to a persisted job (Redis/BullMQ, or a `nextEscalationAt` field + a sweeper).
3. **`drivers.forEach(async …)`** in `dispatch.start` fires un-awaited SMS/logging work; errors are swallowed (`catch (e) {}`). For a safety-critical path, await with `Promise.allSettled` and log failures.
4. **README is stale:** quick-start clones a different repo (`SAHAAY.github.io`) and references `citizen.html`, which isn't here. `PORT_3000_RESOLUTION.md` is a dev scratch note — delete it.
5. **Git history is a single commit by one author**, which looks bad if the organisers ask for contribution proof. From now on every member commits under their own identity via branches + PRs.
6. Stray file `frontend/--yes` (a CLI mistake) should be deleted.
7. Slide typo: **"Tnte Ripple Search Algorithm"** and a stray "Logic / Inter Tight" label (font name leaked into slide). Slide 5 also prints "IBM Plex Sans" under each step title — fonts leaked as text.

## 6. Fit for hackathon

**Verdict:** strong thematic fit with "Healthcare, Wellbeing & Service Delivery" — emergency response is service delivery, the problem is documented, and the SMS fallback speaks directly to underserved/rural access, which is the theme's own wording. Its weak points are *claims that outrun the code* (§4). Close those gaps, or word the pitch honestly ("prototype with …, designed for …"), and it is competitive.

**Strengths to lead with:** real, evidenced problem; offline SMS path (rare in student projects); audit trail; working end-to-end dispatch → accept → track → transfer demo; Indian-context framing (108/112, GSM, Gujarat pilot).
**Risks judges will probe:** "India's first" (unprovable — soften to "an autonomous…"); traffic-signal control (requires government integration — present as *notification to traffic control rooms*, which is what you built); integration/consent path with 108/112 (GVK EMRI) and state health departments; privacy & consent for location data (DPDP Act 2023); false-positive crash alerts; abuse/prank SOS; who pays and who operates.

## 7. Demo plan (what must work live)

1. Citizen triggers SOS (app button **and** crash simulation with cancel window).
2. Three seeded ambulances at different distances; nearest receives the request first.
3. Driver B accepts → driver A's popup disappears (lock).
4. Citizen sees live ambulance + ETA.
5. Driver taps "breakdown" (or auto-detect) → new ambulance dispatched from the stalled position.
6. Kill internet on the phone → send SMS SOS → mission created → confirmation SMS back.
7. Admin dashboard shows the full timeline of the mission (audit trail).
Have a **recorded fallback video** of steps 1–7.

## 8. Glossary
- **Mission / Emergency:** one SOS from creation to completion; one Mission ID.
- **Ripple search:** progressive radius expansion for ambulance discovery.
- **Failover / transfer:** re-dispatch from the current vehicle's GPS when it can't continue.
- **Green corridor / green wave:** pre-clearing traffic signals along the route.
- **DIL:** disconnected, intermittent, limited networks (README's "Disaster-Ready Offline Mode").
- **Gearo (code name):** the crash-detection modules in `user-app`.

## 9. Environment variables (names only — never commit values)
`NODE_ENV, PORT, MONGODB_URI, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, JWT_SECRET, JWT_EXPIRE, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SMS_API_KEY, SMS_API_URL, GOOGLE_MAPS_API_KEY` (plus email credentials for traffic notifications and `CORS_ORIGIN` in production).

## 10. Run locally
```bash
cp env.template .env          # fill in values; never commit
npm install
npm run dev                   # backend on :3000  (needs MongoDB; Redis optional)
cd frontend && npm install && npm run dev      # web app on :5173
cd frontend/packages/user-app && npm i && npx expo start       # citizen app
cd frontend/packages/ambulance-app && npm i && npx expo start  # driver app
```
Health check: `GET /health`.
