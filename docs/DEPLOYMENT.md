# SaHaay Deployment & Build Guide

## 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Java**: OpenJDK 17+ (or Android Studio JBR OpenJDK 25)
- **Android SDK**: Build-tools 34.0.0, Platform API 34
- **Emulator / Device**: Connected via ADB (`adb devices`)

---

## 2. Running Central Server & Admin Portal

### Authoritative Backend (Port 3000)
```bash
# Start backend REST API, WebSocket server, and APK download hosting
npm run dev:server
```
Endpoints:
- REST API: `http://localhost:3000/`
- Health: `http://localhost:3000/health`
- Control Dashboard: `http://localhost:3000/control`
- APK Downloads: `http://localhost:3000/downloads/SaHaay-Citizen.apk`

### Website & Admin Control Room (Port 5174)
```bash
cd apps/admin-web
npm run dev
```
Open `http://localhost:5174` in browser:
- Public download portal: `/download/citizen` and `/download/driver`
- Admin Control Room: Login with `admin@sahaay.gov.in` / `SaHaayAdmin2026!`

---

## 3. Building Separate Native Android APKs

Run the build script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
```

Generated Signed Deliverables:
- `artifacts/apk/SaHaay-Citizen.apk`
  - Application ID: `org.sahaay.citizen`
  - SHA-256: `57B35C49B7E3A68FF04C7C06056C01FFB9AEC7B91C87215831A005371EDD4763`
- `artifacts/apk/SaHaay-Driver.apk`
  - Application ID: `org.sahaay.driver`
  - SHA-256: `9C160D5A49CE4E9EC8824EE7AFD8C1B19455B6BCDBFE3E336A71DFEAB2ED7865`

### Installing on Connected Emulator or Device
```bash
adb install -r artifacts/apk/SaHaay-Citizen.apk
adb install -r artifacts/apk/SaHaay-Driver.apk
```

### Launching Native Apps on Android
```bash
# Launch Citizen App
adb shell am start -n org.sahaay.citizen/.MainActivity

# Launch Driver App
adb shell am start -n org.sahaay.driver/.MainActivity
```

