# SaHaay-2k26 — Bug, Fault & Vulnerability Audit Report

This document records all confirmed bugs, runtime risks, data integrity defects, and architectural omissions identified across the SaHaay-2k26 ecosystem, along with their root causes, severity ratings, implemented fixes, and verification evidence.

---

## 1. Summary of Audit Findings

| Bug ID | Severity | Subsystem | File / Component | Summary | Status |
|:---|:---|:---|:---|:---|:---|
| **BUG-01** | **P0** | Android Bridge | `SaHaayDriverBridge.java`, `SaHaayCitizenBridge.java` | Non-UI thread execution of `Toast.makeText().show()` crashes WebView bridge. | **FIXED & VERIFIED** |
| **BUG-02** | **P0** | Android Build | `scripts/build-apk.ps1`, Java Bridge classes | D8 compiler crash (`NullPointerException`) on Java 25 anonymous inner classes (`$1.class`). | **FIXED & VERIFIED** |
| **BUG-03** | **P1** | Backend / Static | `server/src/index.ts` | Missing `import fs from 'fs'` caused crash when serving `/downloads` static APKs. | **FIXED & VERIFIED** |
| **BUG-04** | **P1** | Mobile APK | `apps/citizen-app/assets/app.js` | SOS trigger susceptible to double-submission on rapid multi-taps. | **FIXED & VERIFIED** |
| **BUG-05** | **P1** | Driver App | `apps/driver-app/assets/app.js` | Driver offer modal was static and did not poll real backend emergency missions. | **FIXED & VERIFIED** |
| **BUG-06** | **P2** | Storage Store | `server/src/storage.ts`, `server/data/sahaay-store.json` | Placeholder zero-hashes for release APKs instead of real SHA-256 build checksums. | **FIXED & VERIFIED** |
| **BUG-07** | **P2** | Citizen Tracking| `apps/citizen-app/assets/app.js` | Polling loop did not handle terminal `COMPLETED` stage gracefully. | **FIXED & VERIFIED** |
| **BUG-08** | **P2** | Android Haptics | `SaHaayDriverBridge.java`, `SaHaayCitizenBridge.java` | Deprecated single-shot vibrator API call on Android O+ without `VibrationEffect`. | **FIXED & VERIFIED** |
| **BUG-09** | **P3** | IDE Classpath | `.vscode/settings.json` | Missing `referencedLibraries` path to `android-34/android.jar` caused false editor errors. | **FIXED & VERIFIED** |

---

## 2. Detailed Bug Reports & Verifications

### BUG-01 (P0): Background Thread Toast Exception in Android Native Bridge
- **Affected File**: [`apps/driver-app/src/org/sahaay/driver/SaHaayDriverBridge.java`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/apps/driver-app/src/org/sahaay/driver/SaHaayDriverBridge.java), [`apps/citizen-app/src/org/sahaay/citizen/SaHaayCitizenBridge.java`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/apps/citizen-app/src/org/sahaay/citizen/SaHaayCitizenBridge.java)
- **Component**: `@JavascriptInterface public void showToast(String message)`
- **Impact**: Any invocation of `window.SaHaayNativeBridge.showToast(...)` from web JavaScript crashed the Android application with `java.lang.RuntimeException: Can't toast on a thread that has not called Looper.prepare()`.
- **Root Cause**: In Android, JavaScript interfaces execute on an off-UI background thread named `JavaBridge`. Toast widgets require main Looper UI-thread scheduling.
- **Fix**: Wrapped toast dispatch inside a static nested `ToastRunnable` posted to `new Handler(Looper.getMainLooper())`.
- **Verification**: Verified on Android 14 emulator (`emulator-5554`) without exceptions.

---

### BUG-02 (P0): D8 Compiler NullPointerException on JDK 25 Inner Classes
- **Affected File**: `scripts/build-apk.ps1`, Java Bridge classes
- **Component**: D8 dexing step in raw Android build pipeline
- **Impact**: `scripts/build-apk.ps1` failed at step `[4/6] Compiling DEX with d8...` with `java.lang.NullPointerException: Cannot invoke "String.length()" because "<parameter1>" is null`.
- **Root Cause**: JDK 25 bytecode emitted enclosing method metadata on anonymous inner classes (`Bridge$1.class`) that Android D8 version 8.2.2 cannot parse. Furthermore, `android.app.Activity` was missing from D8's library classpath during desugaring.
- **Fix**: Replaced anonymous inner classes with static top-level member classes and passed `--lib $ANDROID_JAR` to D8 in [`scripts/build-apk.ps1`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/scripts/build-apk.ps1).
- **Verification**: `scripts/build-apk.ps1` builds both APKs with return code 0.

---

### BUG-03 (P1): Missing Node.js `fs` Module Import in Server Entrypoint
- **Affected File**: [`server/src/index.ts`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/server/src/index.ts)
- **Component**: Server startup & static APK downloads directory check
- **Impact**: Server crashed immediately on launch when evaluating `fs.existsSync(apkDir)` because `fs` was not imported.
- **Root Cause**: File operations were added for APK downloads without adding `import fs from 'fs'`.
- **Fix**: Added `import fs from 'fs'` to top-level imports in `server/src/index.ts`.
- **Verification**: `npm --prefix server run build` and `npm run dev:server` boot cleanly.

---

### BUG-04 (P1): Citizen SOS Double-Submission Vulnerability
- **Affected File**: [`apps/citizen-app/assets/app.js`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/apps/citizen-app/assets/app.js)
- **Component**: `executeSosDispatch()` and `startSosHold()`
- **Impact**: Repeated quick taps on the SOS button during poor connectivity spawned multiple redundant emergency missions.
- **Root Cause**: Absence of an in-flight dispatch lock boolean.
- **Fix**: Added `isDispatching` guard flag that blocks parallel requests until the current network transaction completes.
- **Verification**: Verified sequential hold-and-dispatch with idempotency key preservation.

---

### BUG-05 (P1): Driver Incoming Mission Offer Isolation
- **Affected File**: [`apps/driver-app/assets/app.js`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/apps/driver-app/assets/app.js)
- **Component**: `showSimulationOffer()` & mission polling
- **Impact**: Driver app only showed mock offers upon manual trigger and did not react to real emergency missions created by the Citizen app.
- **Root Cause**: Lack of dynamic poll loop querying `/missions` for `driverId` in `pendingOffers`.
- **Fix**: Implemented background poller checking for matching `DISPATCHING` missions and binding their IDs dynamically.
- **Verification**: Citizen SOS trigger now activates the Driver incoming mission modal within 2.5s.

---

### BUG-06 (P2): Stale Checksum Hashes in App Release Store
- **Affected File**: [`server/src/storage.ts`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/server/src/storage.ts), [`server/data/sahaay-store.json`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/server/data/sahaay-store.json)
- **Component**: Public APK release registry
- **Impact**: Download portal displayed generic SHA-256 placeholder hashes rather than genuine APK verification hashes.
- **Root Cause**: Seed data was created before the build script produced real signed artifacts.
- **Fix**: Updated records with real file sizes (21068 and 21069 bytes) and cryptographically measured SHA-256 hashes.
- **Verification**: Checksum verification confirmed via `Get-FileHash -Algorithm SHA256`.

---

### BUG-07 (P2): Citizen Telemetry Poller Terminal State
- **Affected File**: [`apps/citizen-app/assets/app.js`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/apps/citizen-app/assets/app.js)
- **Component**: `startMissionPolling(missionId)`
- **Impact**: Citizen tracking screen continued decrementing simulated steps even after hospital handover was recorded.
- **Root Cause**: Poller did not check `m.status === 'COMPLETED'`.
- **Fix**: Added terminal condition check that updates UI to "ARRIVED" and stops the timer.
- **Verification**: Poller terminates when mission status becomes `COMPLETED`.

---

### BUG-08 (P2): Deprecated Android Vibrator Hardware Call
- **Affected File**: `SaHaayDriverBridge.java`, `SaHaayCitizenBridge.java`
- **Component**: `public void vibrate(long milliseconds)`
- **Impact**: Triggered API deprecation warnings and potential failure on future Android versions.
- **Root Cause**: `vibrator.vibrate(ms)` was deprecated in API 26 in favor of `VibrationEffect.createOneShot`.
- **Fix**: Added runtime SDK version branching: `VibrationEffect.createOneShot` for API $\ge 26$, legacy fallback for older devices.
- **Verification**: Tested haptics trigger on API 34 emulator.

---

### BUG-09 (P3): IDE Android SDK Classpath Warning
- **Affected File**: [`.vscode/settings.json`](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/.vscode/settings.json)
- **Component**: VS Code Java Language Server
- **Impact**: Editors displayed spurious red squigglies on `import android.*`.
- **Root Cause**: Workspace lacked `java.project.referencedLibraries` pointing to `android.jar`.
- **Fix**: Added explicit path configuration in `.vscode/settings.json`.
- **Verification**: 0 errors reported in IDE problems tab.

