# SaHaay — Implementation Guide: Reuse Open-Source Instead of Building From Scratch

**Scope:** offline SMS telemetry, offline maps, and smooth ambulance-marker movement between low-frequency SMS pings, integrated into SaHaay's existing stack (Node/Express backend + Expo/React Native apps in `frontend/packages/`).
**Written:** 24 Oct 2026. Every repo below was cloned or contacted on that date; statements about file contents come from reading the code, not from READMEs. Items marked **(verify)** are things I could not confirm from here — spike them first.

---

## 0. Reality check (read this before cloning anything)

The earlier chat in your attachment recommended these repos with confidence. After actually opening them, **three of its claims are wrong** and one repo name doesn't exist. Building on them as-described would cost you days.

| Claim in the chat | What the repo actually is | Consequence |
|---|---|---|
| `traccar-client-android` "officially supports SMS-based tracking mode… silently sends custom SMS payloads" | An Apache-2.0 Android GPS client that posts to a Traccar server over **HTTP**. A grep for `sms` / `SmsManager` across both Traccar clients (the old Android one and the current Flutter one) returns **zero hits**. The Android repo is also legacy: its README points to the Flutter `traccar/traccar-client` (last commit 18 Oct 2026). | Use it for the **background-tracking skeleton only** (foreground service, boot receiver, battery-optimisation prompt, offline buffer). SMS must come from elsewhere. |
| `wandomium/SmsLoc` is adaptable "directly" | Real and relevant (SMS request/response location protocol, foreground services, SMS receiver, resend logic, OSMDroid map). **Licence: GPL-3.0.** | Copying its code makes your distributed app GPL-3.0. See §9. Safest path: use it as a **design reference** and write a small clean-room module. |
| `SaturnXIII/Dead-Reckoning-Pro` gives "interpolation math for the ambulance marker" | A **pedestrian** dead-reckoning app (step counter + gyro/magnetometer heading + Kalman filter), README says "Created with AI assistance". **No LICENSE file** (README only says "Open Source - feel free to contribute"), which in practice means you have no clear right to copy it. | Wrong problem and unclear licence. An ambulance needs *projection from last known speed/heading along a road*, which is ~60 lines with Turf (§7). Don't import this repo. |
| `organicmaps/organicmaps` renders ".pbf/.mbtiles" grids and can be embedded | Apache-2.0 (the `LICENSES/Apache-2.0.txt` file is in the repo) and genuinely 100 % offline — but it is a **complete standalone C++/Android/iOS app** with its **own `.mwm` map format**, not a library you can drop into React Native. | Don't embed it. Use **MapLibre** for the in-app map (§6) and optionally **launch Organic Maps via an intent for the driver's turn-by-turn** (§6.3). |
| `mapbox/turf` | **Does not exist** (git asks for credentials = repo not found). The real library is **`Turfjs/turf`** (MIT). `mapbox/turf-swift` exists but is iOS-only. | Use `@turf/*` from npm. |
| Geohash `tsg3fzy` for Ahmedabad (23.0225, 72.5714) | The real geohash is **`ts5dgrh`** (7 chars). | Never hard-code geohashes from chat answers — generate them (§5). |

**Three further hard constraints the chat skipped:**
1. **No internet ≠ no cell signal.** SMS needs at least 2G/GSM coverage. In true dead zones SMS fails too — pitch it as "works when data is down/congested/disaster-degraded", not "works anywhere".
2. **iOS cannot silently send or receive SMS.** The offline tier is **Android-only**. On iOS, the best you can do is pre-fill the Messages composer (user must tap Send).
3. **Google Play restricts `SEND_SMS`/`RECEIVE_SMS`** to apps whose core function qualifies and requires a declaration; sideloaded apps also hit Android's "restricted settings" for SMS permissions on recent versions **(verify on your test phone)**. For the hackathon, ship a signed APK; for production, a pilot via government/NGO distribution or a Play permissions exception.

---

## 1. Decision table — what to take from where

| Need | Take this | How | Licence | Effort saved |
|---|---|---|---|---|
| Background location + boot restart + battery whitelist + offline queue | `traccar/traccar-client-android` (patterns/files) | Copy-adapt (Apache-2.0 allows it, keep notice) | Apache-2.0 | ~2 days |
| SMS request/response protocol, SMS receiver, resend/retry, sent-status tracking | `wandomium/SmsLoc` (reference) | **Clean-room rewrite** using its structure; or accept GPL | GPL-3.0 | ~1.5 days of design |
| Hardened "only react to whitelisted SMS" receiver | `aunchagaonkar/Anchor` `SmsReceiver.kt` (reference) | Clean-room (its pattern: whitelist + prefix + password) | GPL-3.0 | ~0.5 day |
| Receive SMS inside React Native | `maniac-tech/react-native-expo-read-sms` | `npm i` | MIT | ~1 day |
| In-app offline map | `maplibre/maplibre-react-native` + PMTiles/MBTiles | `npm i`, local tiles | MapLibre BSD-style licence | ~3 days vs native |
| Build the city tile file | `protomaps/PMTiles` tooling or `felt/tippecanoe` (and an OSM extract) | CLI | see each repo | n/a |
| Marker movement along road between pings | `Turfjs/turf` | `npm i @turf/…`, write ~60 lines | MIT | ~2 days |
| Geohash | `chrisveness/latlon-geohash` or `sunng87/node-geohash` (or the 30-line implementation in §5) | `npm i` or inline | check each LICENSE **(verify)** | trivial |
| SMS gateway without Twilio/DLT hassle (demo/pilot) | `capcom6/android-sms-gateway` | Run on a spare Android phone with a SIM; REST API | Apache-2.0 | ~2 days |
| Turn-by-turn offline for driver | Organic Maps via intent | Deep link / `geo:` intent | Apache-2.0 | ~5 days |
| Server-side routing (own it, no Google dependency) | `Project-OSRM/osrm-backend` or `valhalla/valhalla` | Docker | BSD-2 / MIT **(verify)** | optional (P2) |

---

## 2. Target architecture (what we are assembling)

```
                 ┌─────────────── PATIENT PHONE (Android) ────────────────┐
 crash/button →  │ RN UI (user-app)  ◄──events──  Kotlin module           │
                 │  • MapLibre offline map        "SahaayTelephony"       │
                 │  • DeadReckoningTracker(Turf)   ├ SmsSender (multipart-safe, sent/delivered intents)
                 │  • packet codec (shared pkg)    ├ SmsReceiver (manifest receiver, prefix+sender filter)
                 │                                 └ TrackingFgService (location, resend queue, boot)
                 └───────────────┬──────────────────────────▲─────────────┘
                       SOS packet │ S1|…                     │ T1|… tracking ping
                                  ▼                          │ A1|… assigned
                 ┌──── SMS gateway (Twilio / android-sms-gateway) ────┐
                                  ▼                          ▲
                 ┌──────────── Node backend (existing) ───────────────┐
                 │ sms.controller → packet decoder (shared pkg)        │
                 │ dispatch.service (ripple search) ──► driver app     │
                 │ tracking fan-out: every 15–30 s → patient SMS       │
                 └─────────────────────────────────────────────────────┘
        Driver app: normal Socket.io path; offline fallback = same Kotlin module (reverse direction)
```

Key design point: **the heavy lifting stays on the server.** The patient phone only needs (a) send one packet, (b) receive small packets, (c) render a local map and animate a marker. That is why this is feasible for a team of three.

---

## 3. Repo block 1 — Traccar client + SmsLoc (SMS telemetry & background scheduling)

### 3.1 What each one gives you
- **Traccar** (`traccar/traccar-client-android`, Apache-2.0) — a battle-tested Android *tracking service skeleton*. No SMS.
- **SmsLoc** (`wandomium/SmsLoc`, GPL-3.0) — a battle-tested *SMS location protocol*: request `Loc?`, response `Loc:LAT,LON,ASL,UTC_S,V_KMH,ACC_M,BAT_PCNT` (4-decimal lat/lon ≈ 11 m). It explicitly does **not** support multipart SMS, which is the right constraint for us too (one packet = one SMS).

### 3.2 Files to isolate

**From Traccar** — `app/src/main/java/org/traccar/client/`
| File (lines) | Take | SaHaay use |
|---|---|---|
| `TrackingService.kt` (118) | Foreground-service lifecycle, wake-lock handling | Base for `TrackingFgService` |
| `TrackingController.kt` (186) | Orchestration: position → buffer → send → retry | Replace "send over HTTP" with "send via SmsSender"; keep retry/backoff logic |
| `PositionProvider.kt` / `AndroidPositionProvider.kt` (83/83) | `LocationManager` updates with interval/distance, accuracy filter | GPS with **no network** (GPS provider only; no Fused/Google dependency) |
| `DatabaseHelper.kt` (159) | SQLite buffer of unsent positions | Outbox for SMS packets (survives reboot) |
| `AutostartReceiver.kt` (32) | Boot receiver | Resume an in-progress mission after reboot |
| `BatteryOptimizationHelper.kt` (102) | Ignore-battery-optimisation prompt | Needed on Indian OEMs (Xiaomi/Vivo/Oppo kill background work) |
| `ProtocolFormatter.kt` (45) | URL builder for OsmAnd protocol | **Discard**; replace with `PacketCodec` (§5) |
| `RequestManager.kt`, `NetworkManager.kt` | HTTP sending | **Discard** |

**From SmsLoc (reference for structure)** — `app/src/main/java/io/github/wandomium/smsloc/`
| File (lines) | What to learn / reproduce |
|---|---|
| `SmsReceiver.java` (295) | Keep the receiver tiny: check `SMS_RECEIVED_ACTION`, check a **4-char prefix**, hand off to a service, hold a wake-lock only briefly |
| `SmsUtils.java` (162) | Prefix constants, `sendSms` with retry count, E.164 normalisation (uses libphonenumber) |
| `LocationRetriever.java` + `LocationRetrieverFgService.java` (188/165) | Request a single fix with timeout, in a foreground service of type `location` |
| `SmsResendFgService.java` (179) + `SmsSentStatusReceiver.java` (95) | Resend if the sent-status PendingIntent reports failure — this is your **retry loop** for flaky GSM |
| `AndroidManifest.xml` | Exact permission & foreground-service-type set: `SEND_SMS`, `RECEIVE_SMS`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`, `FOREGROUND_SERVICE_REMOTE_MESSAGING`, `RECEIVE_BOOT_COMPLETED`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` |
| `data/unit/GpsData.java` (160) | Minimal GPS fix model |

**From Anchor (reference)** — `app/src/main/java/com/supernova/anchor/receiver/SmsReceiver.kt`: **sender whitelist + command prefix** check. For SaHaay this means "only act on `A1|`/`T1|` packets from the SaHaay gateway number(s)" — otherwise anyone could spoof an ambulance position to a patient.

### 3.3 Merge plan into the React Native shell
`user-app` is **Expo ~49 / RN 0.72 managed** (see `frontend/packages/user-app/package.json`). Native SMS cannot run in Expo Go:
1. Add `expo-dev-client`, run `npx expo prebuild --platform android` to generate `android/` (commit it), build with `npx expo run:android`. (Consider upgrading Expo first — SDK 49 is old; do that in its own PR.)
2. Create a local native module `frontend/packages/offline-telemetry-android/` (Kotlin) exposing to JS:
   - `SahaayTelephony.sendSms(to, text): Promise<{id, status}>` (single-part only; reject >160 GSM-7 chars)
   - events: `onSmsPacket({sender, body, receivedAt})`
   - `startTracking(missionId)`, `stopTracking()`, `getLastFix()`
3. For *receiving*, you may start with `@maniac-tech/react-native-expo-read-sms` (MIT) to get JS-side events in an hour, then move to the manifest-registered receiver in step 2 so packets arrive when the app is not in the foreground.
4. JS side imports only `packages/shared/offline/packet.ts` (codec) and the module; screens never touch Android APIs.
5. The **driver app** reuses the same module (reverse direction: driver→server SMS when the driver has no data).

### 3.4 Minimal clean-room module (Kotlin) — write this instead of copying GPL code
```kotlin
// SahaayTelephonyModule.kt  — sketch; uses only public Android APIs
class SahaayTelephonyModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "SahaayTelephony"

  @ReactMethod fun sendSms(to: String, text: String, promise: Promise) {
    try {
      require(text.length <= 160 && text.all { it.code < 128 }) { "must be single-part GSM-7" }
      val sms = if (Build.VERSION.SDK_INT >= 31)
        reactApplicationContext.getSystemService(SmsManager::class.java)
      else @Suppress("DEPRECATION") SmsManager.getDefault()
      val id = System.currentTimeMillis().toString(36)
      val sent = PendingIntent.getBroadcast(reactApplicationContext, id.hashCode(),
        Intent("com.sahaay.SMS_SENT").setPackage(reactApplicationContext.packageName).putExtra("id", id),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      sms.sendTextMessage(to, null, text, sent, null)   // result delivered to SmsSentReceiver → retry/outbox
      promise.resolve(id)
    } catch (e: Exception) { promise.reject("SMS_SEND_FAILED", e) }
  }
}

// Manifest-registered: survives app being backgrounded
class SahaaySmsReceiver : BroadcastReceiver() {
  override fun onReceive(c: Context, i: Intent) {
    if (i.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    for (m in Telephony.Sms.Intents.getMessagesFromIntent(i)) {
      val body = m.messageBody ?: continue
      val from = m.originatingAddress ?: continue
      if (!(body.startsWith("A1|") || body.startsWith("T1|"))) continue       // prefix filter
      if (from !in Allowlist.gatewayNumbers(c)) continue                      // sender allowlist
      PacketStore.append(c, from, body, System.currentTimeMillis())            // persist first
      TrackingBridge.emitIfAlive(body)                                         // then notify JS if running
    }
  }
}
```
Rules: persist before notifying JS; dedupe by `seq`; never log full packets in release builds (they contain location).

### 3.5 Fork / clone commands (do this today)
```bash
mkdir -p third_party && cd third_party
git clone --depth 1 https://github.com/traccar/traccar-client-android.git        # Apache-2.0
git clone --depth 1 https://github.com/wandomium/SmsLoc.git                       # GPL-3.0  (reference only)
git clone --depth 1 https://github.com/aunchagaonkar/Anchor.git                   # GPL-3.0  (reference only)
# keep these OUT of the app repo — add to .gitignore, or use git submodules under /third_party for reading only
echo "third_party/" >> ../.gitignore
```
When you adapt Apache-2.0 files: keep the file header, add `NOTICE`/`THIRD_PARTY_NOTICES.md` entry (§9).

---

## 4. Repo block 2 — Organic Maps (what to do with it) and the map stack that actually fits

### 4.1 Verdict
Organic Maps is excellent software and you should use it — **but as a companion app, not as embedded source.** It cannot be imported into RN; its data are `.mwm` files built by its own toolchain; its codebase is a large C++ project. The effort to extract the renderer exceeds the effort of the whole hackathon.

### 4.2 What to build instead (in-app offline map)
`@maplibre/maplibre-react-native` (`maplibre/maplibre-react-native`, verified present) renders vector tiles on-device.

Pipeline for one city (e.g. Ahmedabad):
1. Get an OSM extract (regional extract or custom bounding box) — **do not bulk-scrape tile.openstreetmap.org**, that violates its usage policy.
2. Convert to vector tiles (OpenMapTiles-schema or Protomaps basemap) and pack as **PMTiles** or **MBTiles** (`protomaps/PMTiles` and `felt/tippecanoe` are the repos to start from; verified present).
3. Ship the file in the APK `assets/` (or download once on Wi-Fi) and copy to app storage on first launch.
4. Point a MapLibre style's vector source at the local file.
   - **Spike this first (verify):** local `mbtiles://` / `pmtiles://` source support differs between MapLibre Native versions. If it doesn't work cleanly in RN, use the **fallback** below instead of burning days.
5. Size: city-scale vector packs are typically tens of MB — **measure yours**; don't quote "30–50 MB" in the pitch until you have.

**Fallback (guaranteed path):** a thin native Android view built on **osmdroid** (`osmdroid/osmdroid`, Apache-2.0, verified present) reading an offline MBTiles/SQLite raster archive. SmsLoc and Dead-Reckoning-Pro both use osmdroid, so you have working reference code for offline tile display. Wrap it as a RN native UI component. Uglier map, certain to work.

### 4.3 Driver navigation: delegate to Organic Maps (very cheap win)
Drivers need turn-by-turn offline. Instead of building it, fire an intent from the driver app:
```ts
import { Linking } from 'react-native';
// Standard geo: URI — any installed maps app can handle it; Organic Maps does (verify on device)
Linking.openURL(`geo:${lat},${lon}?q=${lat},${lon}(Patient)`);
```
Ship a one-line instruction: "Install Organic Maps and download the Gujarat map once." That gives offline navigation with zero integration code. The tracking/dispatch UI stays in SaHaay.

### 4.4 Optional server-side routing
Today `routing.service.js` calls Google Directions. For an offline-capable, API-key-free server you can self-host `Project-OSRM/osrm-backend` or `valhalla/valhalla` in Docker (P2 — do this only after everything else works).

---

## 5. Wire protocol (shared package) — the part you really must write yourself

Put in `frontend/packages/shared/offline/` and import from the backend too (or duplicate the file; keep one source of truth).

**Design rules:** ASCII only (GSM-7, 160 chars), one packet = one SMS, pipe-delimited, every packet has a sequence number and a CRC, decoder is total (never throws on garbage).

| Direction | Packet | Example (S1 and T1 generated by the codec below: 32 and 39 chars; A1/X1 illustrative) |
|---|---|---|
| Patient → server | `S1\|<seq>\|<uid>\|<geohash9>\|<type>\|<t36>\|<crc>` | `S1\|0\|k2m9x\|ts5dgrhgu\|C\|tnevg3\|16` |
| Server → patient (assigned) | `A1\|<mid>\|<seq>\|<driverGeohash9>\|<eta_s>\|<plateShort>\|<crc>` | `A1\|9f3\|1\|ts5dgrk2b\|240\|GJ01AB1234\|1c` |
| Server → patient (tracking) | `T1\|<mid>\|<seq>\|<geohash9>\|<kmh>\|<hdg>\|<eta_s>\|<fixT36>\|<crc>` | `T1\|9f3\|7\|ts5e587pk\|38\|112\|180\|tnevik\|f6` |
| Patient → server (cancel) | `X1\|<mid or uid>\|<seq>\|<crc>` | |

Geohash precision: 7 chars ≈ ±76 m, 8 ≈ ±19 m, **9 ≈ ±2.4 m** — use 9 for SOS (the ambulance must find the patient) and 8 for tracking if you need to save characters. Typical packets above are **under 60 characters**, so you have ~100 spare characters; don't fill them (longer messages → higher failure rate and cost), and **don't** use concatenated multipart SMS.

Legacy `EMERGENCY#lat,lng` stays supported in `sms.controller.js` so the existing demo doesn't break.

```ts
// packages/shared/offline/packet.ts
const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function geohashEncode(lat: number, lon: number, precision = 9): string {
  let latR: [number, number] = [-90, 90], lonR: [number, number] = [-180, 180];
  let out = '', bit = 0, ch = 0, even = true;
  const bits = [16, 8, 4, 2, 1];
  while (out.length < precision) {
    const r = even ? lonR : latR, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
    if (v > mid) { ch |= bits[bit]; r[0] = mid; } else { r[1] = mid; }
    even = !even;
    if (bit < 4) bit++; else { out += B32[ch]; bit = 0; ch = 0; }
  }
  return out;
}

export function geohashDecode(h: string): { lat: number; lon: number } | null {
  let latR: [number, number] = [-90, 90], lonR: [number, number] = [-180, 180], even = true;
  for (const c of h) {
    const idx = B32.indexOf(c); if (idx < 0) return null;
    for (const mask of [16, 8, 4, 2, 1]) {
      const r = even ? lonR : latR, mid = (r[0] + r[1]) / 2;
      if (idx & mask) r[0] = mid; else r[1] = mid;
      even = !even;
    }
  }
  return { lat: (latR[0] + latR[1]) / 2, lon: (lonR[0] + lonR[1]) / 2 };
}

export function crc8(s: string): string {            // poly 0x07
  let c = 0;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i);
    for (let b = 0; b < 8; b++) c = (c & 0x80) ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
  }
  return c.toString(16).padStart(2, '0');
}

export type Packet =
  | { kind: 'S1'; seq: number; uid: string; lat: number; lon: number; type: string; t: number }
  | { kind: 'T1'; mid: string; seq: number; lat: number; lon: number; kmh: number; hdg: number; etaS: number; fixT: number }
  | { kind: 'A1'; mid: string; seq: number; lat: number; lon: number; etaS: number; plate: string };

const seal = (body: string) => `${body}|${crc8(body)}`;
const SMS_MAX = 160;
const t36 = (ms: number) => Math.floor(ms / 1000).toString(36);
const fromT36 = (s: string) => parseInt(s, 36) * 1000;

export function encodeSos(p: { seq: number; uid: string; lat: number; lon: number; type: 'C' | 'M'; now?: number }): string {
  const s = seal(`S1|${p.seq}|${p.uid}|${geohashEncode(p.lat, p.lon, 9)}|${p.type}|${t36(p.now ?? Date.now())}`);
  if (s.length > SMS_MAX || /[^\x20-\x7e]/.test(s)) throw new Error('SOS packet violates SMS limits');
  return s;
}

export function encodeTracking(p: { mid: string; seq: number; lat: number; lon: number; kmh: number; hdg: number; etaS: number; fixMs: number }): string {
  const s = seal(`T1|${p.mid}|${p.seq}|${geohashEncode(p.lat, p.lon, 9)}|${Math.round(p.kmh)}|${Math.round(p.hdg) % 360}|${Math.round(p.etaS)}|${t36(p.fixMs)}`);
  if (s.length > SMS_MAX) throw new Error('tracking packet too long');
  return s;
}

export function decode(raw: string): Packet | null {           // total function: returns null on anything bad
  const s = raw.trim(); const i = s.lastIndexOf('|'); if (i < 0) return null;
  const body = s.slice(0, i); if (crc8(body) !== s.slice(i + 1)) return null;
  const f = body.split('|');
  try {
    if (f[0] === 'S1' && f.length === 6) {
      const g = geohashDecode(f[3]); if (!g) return null;
      return { kind: 'S1', seq: +f[1], uid: f[2], ...g, type: f[4], t: fromT36(f[5]) };
    }
    if (f[0] === 'T1' && f.length === 8) {
      const g = geohashDecode(f[3]); if (!g) return null;
      return { kind: 'T1', mid: f[1], seq: +f[2], ...g, kmh: +f[4], hdg: +f[5], etaS: +f[6], fixT: fromT36(f[7]) };
    }
    if (f[0] === 'A1' && f.length === 6) {
      const g = geohashDecode(f[3]); if (!g) return null;
      return { kind: 'A1', mid: f[1], seq: +f[2], ...g, etaS: +f[4], plate: f[5] };
    }
  } catch { /* fall through */ }
  return null;
}
```
**Receiver rules (this is the "clockless state machine" in practice):** keep `lastSeq` per mission; accept `seq > lastSeq`; drop duplicates/older packets silently; SMS can arrive late and out of order, so never rely on arrival time — rely on `seq` and the fix time inside the packet. Add unit tests for: round-trip, 160-char bound, bad CRC, truncated packet, duplicate, out-of-order.

**Backend changes (existing repo):**
- `backend/controllers/sms.controller.js` — try `decode()` first; on `S1` create the Emergency (store `uid`, `seq`, dedupe key `(phone, seq)`), fall back to legacy `EMERGENCY#lat,lng`. Reply with an `A1` as soon as a driver accepts.
- `backend/services/sms.service.js` — add `sendTrackingPing(phone, mission)` called from the tracking socket handler, throttled per mission (see cost note in §10).
- Add a `lastSeq` + `lastSmsAt` field to `Emergency` for throttling and dedupe.

---

## 6. Map layer integration checklist (details in §4)
- `frontend/packages/user-app/src/components/OfflineMap.jsx`: MapLibre `MapView` + local style JSON referencing the bundled tiles; props: `patient`, `ambulance` (from tracker), `route?`.
- Fallback component `OsmdroidMapView` if the MapLibre local-tile spike fails after **one day**.
- Don't ship an API-key-dependent style; the whole point is zero network.

---

## 7. Repo block 3 — Dead-Reckoning-Pro (concept only) + Turf (the actual implementation)

### 7.1 Why not Dead-Reckoning-Pro
Its `DeadReckoningEngine.java` (455 lines), `KalmanFilter.java`, `PreciseHeadingEstimator.java`, `EnhancedStepCounter.java` estimate *a walking person's* position from steps and phone sensors. The ambulance marker problem is different: **we already know speed and heading from the packet**; we just need to project forward and gently correct. Also no LICENSE file → no clear right to copy. Take only the idea: *predict between fixes, blend when a real fix arrives*.

### 7.2 Turf modules to use (`Turfjs/turf`, MIT)
`npm i @turf/helpers @turf/destination @turf/distance @turf/bearing @turf/along @turf/length @turf/nearest-point-on-line @turf/line-slice`
(`mapbox/turf` does not exist; `mapbox/turf-swift` is iOS only — ignore.)

### 7.3 Tracker (drop into `frontend/packages/user-app/src/services/deadReckoning.ts`)
Two modes, same API:
- **V1 (ship first):** no road geometry → project along the packet's heading with `destination()`.
- **V2:** a route polyline is available (see 7.4) → advance along the line with `along()`, so the icon follows roads.

```ts
import destination from '@turf/destination';
import along from '@turf/along';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { point, lineString } from '@turf/helpers';

type Fix = { lat: number; lon: number; kmh: number; hdg: number; fixT: number; seq: number };
const MAX_PREDICT_S = 45;     // don't invent motion forever
const TAU_S = 0.7;            // correction smoothing time constant

export class AmbulanceTracker {
  private anchor?: Fix;
  private route?: ReturnType<typeof lineString>;
  private routeOffsetM = 0;                 // metres along route at the anchor
  private shown?: { lat: number; lon: number };
  private lastSeq = -1;

  setRoute(coords: [number, number][] | undefined) {        // [lon,lat][]
    this.route = coords && coords.length > 1 ? lineString(coords) : undefined;
  }

  onFix(f: Fix): boolean {
    if (f.seq <= this.lastSeq) return false;                // drop duplicate / out-of-order
    this.lastSeq = f.seq;
    this.anchor = f;
    if (this.route) {
      const np = nearestPointOnLine(this.route, point([f.lon, f.lat]), { units: 'meters' });
      this.routeOffsetM = (np.properties as any).location ?? 0;
    }
    return true;
  }

  /** call every animation frame; returns where to draw the marker and how stale the data is */
  frame(nowMs: number, dtS: number): { lat: number; lon: number; staleS: number; predicting: boolean } | null {
    const a = this.anchor; if (!a) return null;
    const ageS = Math.max(0, (nowMs - a.fixT) / 1000);
    const horizon = Math.min(ageS, MAX_PREDICT_S);
    const ramp = ageS > MAX_PREDICT_S ? 0 : 1;              // beyond horizon: freeze, UI shows "last seen"
    const distM = (a.kmh / 3.6) * horizon * ramp;

    let target: { lat: number; lon: number };
    if (this.route) {
      const p = along(this.route, this.routeOffsetM + distM, { units: 'meters' }).geometry.coordinates;
      target = { lat: p[1], lon: p[0] };
    } else {
      const p = destination([a.lon, a.lat], distM, a.hdg, { units: 'meters' }).geometry.coordinates;
      target = { lat: p[1], lon: p[0] };
    }
    if (!this.shown) this.shown = target;
    const k = 1 - Math.exp(-dtS / TAU_S);                   // exponential smoothing = no visible "snap"
    this.shown = { lat: this.shown.lat + (target.lat - this.shown.lat) * k,
                   lon: this.shown.lon + (target.lon - this.shown.lon) * k };
    return { ...this.shown, staleS: ageS, predicting: ageS > 1 && ramp === 1 };
  }
}
```
Wire it with `requestAnimationFrame` (or `Animated`/MapLibre `ShapeSource` updates at ~15–30 fps — marker position doesn't need 60). Always show a **"last update 18 s ago"** label; honesty about data age is a safety feature, not a nicety.

### 7.4 Giving the patient app road geometry (V2)
Options, cheapest first:
1. **Don't** — V1 projection is fine for a 10-minute demo.
2. Server sends a **second SMS** after assignment containing the last ~1.5 km of the route as an encoded polyline (Google/precision-5 polyline ≈ 4–6 chars per point → ~20 points in ~100 chars). Treat as optional/best-effort: if it doesn't arrive, V1 keeps working.
3. On-device snapping against the offline map's road layer (needs queryable tile geometry — **don't** attempt in the hackathon).

---

## 8. Supporting repos worth adding (verified to exist on 24 Oct 2026)

| Repo | Why | Notes |
|---|---|---|
| `maplibre/maplibre-react-native` | In-app offline vector map | Spike local tile source first |
| `maniac-tech/react-native-expo-read-sms` | JS events for incoming SMS in the first prototype | MIT |
| `briankabiro/react-native-get-sms-android` | Send/list SMS from JS (quick prototype) | Licence file not found at the tested paths — check before use **(verify)**; our Kotlin module replaces it |
| `capcom6/android-sms-gateway` | Turns a spare Android phone + SIM into your SMS gateway with a REST API — avoids paid-gateway registration while demoing | Apache-2.0; a hobby setup, not carrier-grade |
| `Turfjs/turf` | Geometry | MIT |
| `chrisveness/latlon-geohash`, `sunng87/node-geohash` | Geohash if you'd rather not keep §5's functions | check licences **(verify)** |
| `protomaps/PMTiles`, `felt/tippecanoe` | Build the city tile pack | |
| `Project-OSRM/osrm-backend`, `valhalla/valhalla` | Optional own routing engine | P2 |
| `traccar/traccar` (server, Java) | Mentioned in the chat; **not recommended** — you already have a Node backend and GpsLog model |

**Gateway reality (verify before promising anything in the pitch):** sending commercial SMS to Indian numbers via global providers generally requires TRAI **DLT registration** (entity, sender ID, templates). Allow lead time, or use the `android-sms-gateway` phone/SIM for the demo and describe DLT registration as a pilot prerequisite.

---

## 9. Licence compliance (do this now, not the night before)

| Code | Licence | What it means for SaHaay |
|---|---|---|
| Traccar client (Android + Flutter), Organic Maps, osmdroid, android-sms-gateway | Apache-2.0 | May be copied/modified; keep copyright headers, include the licence text, note changes. |
| Turf, react-native-expo-read-sms | MIT | Keep copyright notice. |
| SmsLoc, Anchor | **GPL-3.0** | Copying any of their code into the app means the **distributed app must be released under GPL-3.0**. Safe options: (a) clean-room — use only public Android APIs and your own protocol, treat these repos as reading material; or (b) knowingly license the Android module (and, in practice, the APK) as GPL-3.0 and publish source. |
| Dead-Reckoning-Pro | **No licence file** | Default copyright applies → do not copy. |

Housekeeping: SaHaay's README badge says **MIT** but `package.json` says **ISC** — pick one, add a real `LICENSE`, and create `THIRD_PARTY_NOTICES.md` listing every dependency/adapted file with its licence. I'm not a lawyer; if you plan commercial deployment, get a proper review.

---

## 10. Cost, latency and reliability notes you should put in the design doc
- Tracking SMS cost scales with mission length: at one ping per 20 s, a 10-minute mission ≈ **30 SMS** to one patient. Use **adaptive cadence** (e.g. 30 s far, 15 s inside 1 km, event pings on "assigned", "2 min away", "arrived") — the dead-reckoning tracker makes slower cadence acceptable.
- SMS is store-and-forward: delivery can take seconds to minutes and arrive out of order → `seq`, CRC, stale-data label (already designed above).
- Never send medical data in SMS. Packets carry location + type only; hospital-facing details go over the internet path.
- Privacy: SMS is not encrypted end-to-end. Minimise (no names), keep mission IDs random, document retention/consent under India's DPDP Act 2023 in the deck.
- Anti-spoofing: allowlist gateway numbers on the phone (Anchor-style), rate-limit SOS per number on the server.

---

## 11. Work plan — spikes first, then integration (maps onto `contribution.md`)

| Order | Task | Lane (contribution.md) | Time-box | Exit criterion |
|---|---|---|---|---|
| 1 | Clone repos into `third_party/`; add `THIRD_PARTY_NOTICES.md`; fix `.env` leak | A1 / C10 | 0.5 d | Notices file merged |
| 2 | **Spike A:** `expo prebuild` + Kotlin `sendSms`/receiver on a real phone | B4 | 1 d | SOS text sent and a reply SMS shown in JS with app backgrounded |
| 3 | **Spike B:** MapLibre with local PMTiles/MBTiles on airplane-mode phone | B6 | 1 d | City map renders offline; else switch to osmdroid fallback |
| 4 | Packet codec + tests (§5) | B3 | 1 d | Tests green, ≤160 chars |
| 5 | Backend decode + `A1`/`T1` sender + dedupe | A | 1 d | Real SMS → mission → `A1` back |
| 6 | Foreground tracking service + outbox (Traccar patterns) | B | 1.5 d | Reboot mid-mission resumes |
| 7 | `AmbulanceTracker` + marker + "last update" label | B6 | 1 d | Marker glides between pings on the simulator |
| 8 | Driver: `geo:` intent to Organic Maps | B5 | 0.25 d | Opens offline navigation |
| 9 | Demo hardening, recorded fallback video | C6 | 1 d | Airplane-mode-with-SMS demo repeatable |

If spike A or B fails, **cut scope, don't push on**: the demo "patient sends SMS SOS → server dispatches → patient gets SMS with ETA" is already compelling without the animated offline map.

---

## 12. Quick command reference
```bash
# packages
cd frontend/packages/user-app
npm i @maplibre/maplibre-react-native @maniac-tech/react-native-expo-read-sms \
      @turf/helpers @turf/destination @turf/along @turf/nearest-point-on-line @turf/distance @turf/bearing
npx expo install expo-dev-client
npx expo prebuild --platform android        # then: npx expo run:android  (physical device; SIM required for SMS)

# shared codec tests (from repo root)
npm i -D jest ts-jest typescript @types/jest
npx jest packages/shared/offline

# tile pack tooling (for the map spike)
git clone --depth 1 https://github.com/protomaps/PMTiles.git third_party/PMTiles
git clone --depth 1 https://github.com/felt/tippecanoe.git third_party/tippecanoe
```

*Everything above marked (verify) is a deliberate flag: confirm on a physical Android phone before it appears in the pitch deck.*
