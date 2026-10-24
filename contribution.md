# SaHaay — Contribution Plan (3 contributors)

Companion to `project_context.md`. This lists **all remaining work** and splits it into three ownership lanes so nobody blocks anybody. Replace the placeholders with real names.

| Lane | Owner | Theme |
|---|---|---|
| **A** | `[Member 1]` | Backend core: dispatch, failover, data model, security |
| **B** | `[Member 2]` | Mobile + offline: citizen app, driver app, crash detection, SMS pipeline |
| **C** | `[Member 3]` | Web/admin, infra, QA, demo, deck, submission |

Priorities: **P0** = must be done before submission/demo · **P1** = should be done · **P2** = nice to have / "future work" slide.
Effort is a rough guess in hours for one person.

---

## Lane A — Backend core & security

### P0
| # | Task | Done when | Est. |
|---|---|---|---|
| A1 | **Rotate & remove secrets.** Rotate Google Maps key (restrict by API/app), `git rm --cached .env`, add `.env` to `.gitignore`, purge history if repo is public, set a ≥32-char random `JWT_SECRET` | `git log -p` shows no live keys; app boots from `env.template` + local `.env` | 1–2 |
| A2 | **Make first-accept-wins atomic.** Accept = single conditional update (`{_id, status:"searching", assignedDriverId:null}` → `assigned`); loser gets a clean 409 and a socket `request:cancelled` | Two simultaneous accepts in a test → exactly one winner | 3 |
| A3 | **Persist dispatch timers.** Replace in-memory `activeTimers` with `nextEscalationAt` on `Emergency` + a sweeper (or Redis/BullMQ); survive restart | Kill server mid-search, restart → escalation still fires | 4 |
| A4 | **Complete the ripple ladder:** 500 m → 1 km → 2 km (config-driven), 120 s per phase; on exhaustion set `status:"escalated"` and push to operator queue instead of silently `failed` | Test covers all three phases + escalation event | 3 |
| A5 | **Automatic failover trigger.** Detect "active ambulance zero-velocity for N seconds while `enroute`" from `GpsLog`/socket stream (+ heartbeat loss), then call the existing transfer logic. Include hysteresis so traffic lights don't cause false transfers; driver can "I'm fine" dismiss within X s | Simulated stall triggers transfer without human action; false-positive test passes | 6–8 |
| A6 | **Real geospatial model.** Store `location: {type:"Point", coordinates:[lng,lat]}` on `Driver` and `Emergency`, add `2dsphere` index, switch `geo.findDrivers` to `$nearSphere`/`$geoNear` with `$maxDistance`; keep Haversine only for display; migration script for existing docs | `explain()` shows index use; results identical to old Haversine path on seeded data | 4 |
| A7 | **Harden dispatch fan-out.** Replace `forEach(async…)` with `Promise.allSettled`, log every failed notification, never swallow errors silently | Failed SMS/socket sends visible in `MessageLog` | 2 |

### P1
| # | Task | Est. |
|---|---|---|
| A8 | Input validation (schema validation on every public endpoint), per-IP and per-phone rate limits on SOS, prank/abuse flags (repeat caller, cancelled-too-often) | 4 |
| A9 | Driver scoring: use `trustScore`, `totalBreakdowns`, vehicle capability (BLS/ALS) when ranking, not only distance | 3 |
| A10 | Unit + integration tests (Jest + `mongodb-memory-server` + supertest) for dispatch, ripple, lock, failover. Target ≥70 % on `services/` | 8 |
| A11 | Structured logging (pino) + request IDs; `/metrics` endpoint (dispatch latency, acceptance time, failovers) | 3 |

### P2
A12 Hospital selection (nearest with capacity) · A13 Idempotency keys on all mutating endpoints · A14 Multi-region config (Mongo per state, region routing).

---

## Lane B — Mobile apps, crash detection, offline SMS

### P0
| # | Task | Done when | Est. |
|---|---|---|---|
| B1 | **Fix crash detection.** Add the missing sensor dependency (or use `expo-sensors`, since the app is Expo 49), compute magnitude in **g** correctly, reuse `vibrationThresholds.js` instead of the hard-coded `> 50`, add a sustained-impact + post-impact-stillness check to cut false positives | Phone-shake test below threshold ignored; simulated impact fires | 6 |
| B2 | **Cancel window gates dispatch.** 5–10 s countdown (configurable), loud/haptic prompt, one-tap cancel; only after expiry is the SOS sent. Add a "dispatched" confirmation state | Cancelling inside the window sends nothing (verify in server logs) | 3 |
| B3 | **Offline SOS encoder/decoder** (shared module used by app *and* backend): `SOS\|UID:<id>\|LAT:<5dp>\|LON:<5dp>\|T:<code>\|S:<seq>` with a hard ≤160-char check; optional base36 geohash form; checksum char. Unit tests for round-trip and for 160-char limit with worst-case values | Encoder output always ≤160; decoder rejects corrupt/duplicate packets | 5 |
| B4 | **Send SMS when offline.** Detect no-network (`useNetworkStatus`), auto-fall back to SMS. `sms:` deep-link needs a manual Send tap — either (a) pre-fill and make the Send step unmistakable, or (b) on Android use a native SMS-send module under a dev build. Document the OS limitation honestly in the deck | Airplane-mode-with-SMS test on a real phone produces a mission | 6 |
| B5 | **Driver app polish for the demo path:** request popup, accept/reject, popup auto-dismiss when another driver wins, navigation screen, "breakdown / need transfer" button, location streaming every ~5 s with background permission handling | Full driver journey works on a physical Android | 8 |
| B6 | **Citizen tracking screen:** live map, ETA, driver name/vehicle no., status timeline, "call driver" | Matches backend socket events end-to-end | 5 |

### P1
| # | Task | Est. |
|---|---|---|
| B7 | Local queue for unsent SOS (retry with back-off, dedupe via sequence number) | 4 |
| B8 | Emergency contacts: auto-SMS selected contacts with live-track link | 3 |
| B9 | Hindi + Gujarati strings (i18n) — directly serves "underserved communities" in the theme | 4 |
| B10 | Accessibility: large-tap SOS, TalkBack labels, high contrast | 2 |

### P2
B11 Wearable/IoT trigger stub · B12 Medical-ID card (allergies, blood group) shared with crew *only after explicit consent*.

---

## Lane C — Web/admin, infra, QA, demo & submission

### P0
| # | Task | Done when | Est. |
|---|---|---|---|
| C1 | **Operator dashboard = escalation queue.** Live list of missions by status, map with all ambulances, "needs operator" lane fed by A4, manual assign button, full per-mission timeline from `EmergencyEvent` | Escalated mission appears within 1 s and can be assigned manually | 8 |
| C2 | **SMS gateway wiring.** Twilio (or Indian provider) number → webhook `/api/sms/incoming`; verify TwiML response so the confirmation SMS actually reaches the user; ngrok for local; implement the driver `ACCEPT` reply parser with Lane A | Real SMS in → mission → real SMS out, demonstrated on video | 5 |
| C3 | **Dockerise.** `Dockerfile` for backend, `docker-compose.yml` (api + mongo + redis), `.dockerignore`, healthchecks; K8s manifests only if time allows (don't claim K8s otherwise) | `docker compose up` brings the whole system up cold | 4 |
| C4 | **Seed & simulator.** Script that creates N ambulances around a chosen city (Ahmedabad) and moves them along routes; "stall" button to demo failover | One command starts a repeatable demo | 5 |
| C5 | **Fix the deck.** Correct "Tnte Ripple Search Algorithm", remove leaked font names, add article URLs/dates for the headlines, replace unprovable claims ("India's first", "millions of concurrent") with measured/qualified ones, add a **"built vs. roadmap"** slide, add a privacy/consent slide | Reviewed by all three | 4 |
| C6 | **Demo video (≤3 min) + live-demo script + fallback.** Follow section 7 of `project_context.md` | Rehearsed twice end-to-end | 5 |
| C7 | **Submission admin.** Confirm live dates/stage with LIC; all three register individually on MY Bharat; lead registers team; verify age (18–29) and same-institution rule; collect required docs | Checklist ticked, confirmation screenshots saved | 2 |

### P1
| # | Task | Est. |
|---|---|---|
| C8 | **Load test** (k6/Artillery): 1k concurrent SOS creates, 5k socket clients; publish real numbers in the deck instead of the "<200 ms" claim | 4 |
| C9 | CI (GitHub Actions: lint + tests on PR) | 2 |
| C10 | Rewrite `README.md` (correct clone URL, real quick-start, architecture diagram, honest status table); delete `PORT_3000_RESOLUTION.md` and `frontend/--yes` | 2 |
| C11 | **Traffic pre-clearance honesty pass:** keep the notification pipeline (email → add SMS/WhatsApp to traffic control rooms), label it "pre-clearance alert", and show a mock traffic-control-room screen as the integration contract | 4 |
| C12 | Impact one-pager: pilot proposal (one district), stakeholders (108/112, district health office, traffic police), success metrics (dispatch-to-accept time, response time, failover recoveries) | 3 |

### P2
C13 Kubernetes manifests + HPA · C14 Grafana dashboard on `/metrics` · C15 Data-protection notes (DPDP Act 2023: consent, retention, purpose limitation).

---

## Cross-lane contracts (agree these first — 1 hour, all three)

1. **Mission state enum:** `searching → assigned → enroute → reached → hospital → completed`, plus `escalated`, `failed`, `cancelled`. Lane A owns it; B and C consume it.
2. **Socket events** (names + payloads) written into `docs/socket-events.md`: `driver:<id>:request`, `emergency:<id>:assigned`, `track:<id>`, `emergency:<id>:failed`, `request:cancelled`, `transfer:started`.
3. **Offline packet spec** (B3) shared as a package in `frontend/packages/shared` and imported by the backend SMS controller.
4. **Env var list** — only names in `env.template`; values never in git.

## Dependencies / order of work
```
Day 1   A1 (secrets) ── all: contracts ── C3 (docker) ── B1 (sensors dep)
Day 2   A2, A6 ─────────┐       B3 (packet spec) ─┐   C4 (seed+sim)
Day 3   A3, A4 ─────────┼──► C1 (operator queue)  ├──► B4 / C2 (real SMS loop)
Day 4   A5 (auto-failover) ► B5 / B6 (driver+citizen demo path)
Day 5   Integration + bug-bash, C8 load test, C5 deck, C6 video
Day 6   Buffer, rehearsal, C7 submission
```
Compress or stretch this to the real deadline once C7 confirms it.

## Working agreement
- **Branches + PRs only.** `main` is protected; each member commits under their own GitHub identity (so the history shows all three contributors).
- Branch naming: `a/<topic>`, `b/<topic>`, `c/<topic>`. One reviewer from another lane per PR.
- Commit messages: `type(scope): summary` — e.g. `fix(dispatch): make accept atomic`.
- Definition of done: works on the demo path, has a test or a recorded manual check, no secrets, docs updated.
- Daily 10-minute sync: blockers, interface changes, who demos what.

## Final checklist before submitting
- [ ] No secrets in repo or history; Maps key rotated
- [ ] `docker compose up` works from a clean clone
- [ ] Demo path 1–7 works on a physical phone, plus recorded fallback
- [ ] Deck matches the code ("built" vs "roadmap" is explicit)
- [ ] README accurate; all three members have commits
- [ ] All three registered individually + team registered on MY Bharat
- [ ] Deadline and required submission format re-confirmed on the portal
