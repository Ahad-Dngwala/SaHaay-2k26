# SaHaay-2k26 — Configuration & Environment Reference

This document provides a single source of truth for all runtime configuration, environment variables, build flags, and offline tunables in the SaHaay-2k26 emergency response ecosystem.

---

## 1. Master Configuration Table

| Variable | Required | Default Value | Purpose | Example Format | Consumed By |
|:---|:---:|:---|:---|:---|:---|
| `NODE_ENV` | Optional | `development` | Node.js execution environment (`development`, `production`, `test`). | `development` | Server, Vite |
| `PORT` | Optional | `3000` | HTTP and WebSocket port for the authoritative dispatch server. | `3000` | `server/src/index.ts` |
| `HOST` | Optional | `0.0.0.0` | Network binding interface. | `0.0.0.0` | `server/src/index.ts` |
| `DEMO_TIME_SCALE` | Optional | `1` | Global timer divisor for hackathon demonstrations ($10\times$ acceleration). | `1` or `10` | `server/src/dispatch.ts` |
| `SEARCH_RADIUS_M` | Optional | `500` | Initial search radius in metres around the patient's GPS coordinates. | `500` | `src/core/config.ts` |
| `EXPAND_AFTER_S` | Optional | `120` | Interval in seconds before expanding to the next radial search ring. | `120` | `src/core/config.ts` |
| `EXPAND_FACTOR` | Optional | `2` | Multiplier for radial expansion (e.g. $500\text{ m} \to 1000\text{ m} \to 2000\text{ m}$). | `2` | `src/core/config.ts` |
| `MAX_RADIUS_M` | Optional | `8000` | Upper limit for dispatch search perimeter (8 km cap). | `8000` | `src/core/config.ts` |
| `CRASH_G` | Optional | `2.5` | Minimum impact threshold in $g$-force to trigger crash workflow. | `2.5` | `src/core/crash/CrashDetector.ts` |
| `STILLNESS_WINDOW_MS`| Optional | `1000` | Duration in ms of required immobility post-impact to confirm true crash. | `1000` | `src/core/crash/CrashDetector.ts` |
| `COUNTDOWN_SEC` | Optional | `30` | Duration in seconds of the crash cancellation countdown before auto-SOS. | `30` | `src/core/crash/CountdownTimer.ts` |
| `SAHAAY_ADMIN_EMAIL` | Optional | `admin@sahaay.gov.in` | Seed email address for the state emergency control room. | `admin@sahaay.gov.in` | `server/src/auth.ts` |
| `SAHAAY_ADMIN_PASSWORD` | Optional | `SaHaayAdmin2026!` | Seed password for the state emergency control room. | `SaHaayAdmin2026!` | `server/src/auth.ts` |
| `VITE_API_URL` | Optional | `http://localhost:3000` | Backend API base URL for browser-based clients (`apps/admin-web`). | `http://localhost:3000` | `apps/admin-web/` |
| `ANDROID_EMU_API_URL` | Optional | `http://10.0.2.2:3000` | Host loopback URL for Android emulator WebViews. | `http://10.0.2.2:3000` | `apps/citizen-app/`, `apps/driver-app/` |

---

## 2. Android Build Configuration

| Property | Value | Location | Notes |
|:---|:---|:---|:---|
| **Citizen App ID** | `org.sahaay.citizen` | `apps/citizen-app/AndroidManifest.xml` | Standalone native APK |
| **Driver App ID** | `org.sahaay.driver` | `apps/driver-app/AndroidManifest.xml` | Standalone native APK |
| **Target SDK** | `34` (Android 14) | `scripts/build-apk.ps1` | AAPT2 platform link flag |
| **Min SDK** | `26` (Android 8.0) | `AndroidManifest.xml` | Supports 95%+ active Android devices |
| **Java Target** | Java 8 (`-source 8 -target 8`) | `scripts/build-apk.ps1` | Guaranteed compatibility with D8 |
| **Keystore Alias** | `sahaay` | `artifacts/sahaay-release-key.jks` | RSA 2048-bit release signature |
| **Keystore Pass** | `sahaay2026` | `scripts/build-apk.ps1` | Development & demonstration key |

---

## 3. Ahmedabad Locality Bounding Box

The single source of truth for geographic constraints is defined in [`src/core/config.ts`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/src/core/config.ts):

- **West**: $72.47^\circ\text{ E}$
- **South**: $22.94^\circ\text{ N}$
- **East**: $72.68^\circ\text{ E}$
- **North**: $23.12^\circ\text{ N}$

Coordinates outside this bounding box are rejected during SMS token decoding and base36 coordinate validation to prevent accidental spoofing.

