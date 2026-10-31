# SaHaay — Physical Device Test Guide & OEM Configuration

This guide provides instructions for deploying and running the SaHaay prototype on physical Android hardware and emulators.

---

## 1. Prerequisites
- **Phone A (Citizen App):** Android 10+ (API 29+), active SIM card or Wi-Fi, accelerometer sensor.
- **Phone B (Driver App):** Android 10+ (API 29+), active SIM card with mobile data (if testing Gateway mode).
- **Laptop (Server):** Running Node.js dispatch server on local network.
- **APKs:** Pre-compiled and signed in `artifacts/apk/`:
  - `SaHaay-Citizen.apk`
  - `SaHaay-Driver.apk`

---

## 2. Installation via ADB
Connect phones via USB debugging:

```bash
# Check connected devices
adb devices

# Install Citizen APK on Phone A
adb -s <DEVICE_A_SERIAL> install -r artifacts/apk/SaHaay-Citizen.apk

# Install Driver APK on Phone B
adb -s <DEVICE_B_SERIAL> install -r artifacts/apk/SaHaay-Driver.apk
```

---

## 3. Critical OEM Battery Exemption & Permission Steps
Many Android OEMs aggressively terminate background foreground services. Configure these settings per manufacturer:

### Xiaomi / Redmi / POCO (MIUI / HyperOS)
1. **Autostart:** Settings ➔ Apps ➔ Manage Apps ➔ SaHaay Citizen ➔ Enable **Autostart**.
2. **Battery Saver:** Settings ➔ Apps ➔ Manage Apps ➔ SaHaay Citizen ➔ Battery Saver ➔ Select **No Restrictions**.
3. **Restricted Settings (Sideloaded APK):** Settings ➔ Apps ➔ Manage Apps ➔ SaHaay Citizen ➔ Tap top-right 3-dots ➔ Select **Allow restricted settings** (required for SMS permissions on Android 13+).

### Samsung (One UI)
1. **Background Usage:** Settings ➔ Apps ➔ SaHaay Citizen ➔ Battery ➔ Select **Unrestricted**.
2. **Never Sleeping Apps:** Settings ➔ Battery and Device Care ➔ Battery ➔ Background Usage Limits ➔ **Never sleeping apps** ➔ Add SaHaay Citizen.

### Vivo / iQOO (Funtouch OS)
1. **Background Power:** Settings ➔ Battery ➔ Background power consumption management ➔ SaHaay Citizen ➔ **High background power usage**.
2. **Autostart:** Settings ➔ Applications and Permissions ➔ Permission management ➔ Autostart ➔ Enable for SaHaay.

### Oppo / OnePlus / Realme (ColorOS / OxygenOS)
1. **App Battery Usage:** Settings ➔ Apps ➔ App management ➔ SaHaay Citizen ➔ Battery usage ➔ Enable **Allow background activity** and **Allow auto-launch**.
2. **Lock in Recents:** Open app switcher, tap 3-dots on SaHaay, tap **Lock**.

---

## 4. Hardware Verification Test Flow

### Test A: Background Crash Detection (Phone A)
1. Open SaHaay Citizen app.
2. Tap **Arm Crash Guard (Shake Mode)** or pull down Android Quick Settings and tap the **Crash Guard** tile.
3. Lock the phone (screen off).
4. Shake phone vigorously for 3–5 seconds.
5. **Expected Result:**
   - Phone vibrates continuously.
   - High-priority full-screen countdown notification appears ("CRASH DETECTED: 30s").
   - If not cancelled, automatic SOS is dispatched with real GPS fix.

### Test B: Real OSRM Routing & First-Accept Lock (Phone A + Phone B)
1. Citizen triggers SOS (Manual or Crash).
2. Nearby driver(s) receive targeted heads-up offer with 25s TTL.
3. Driver taps **Accept**. First to tap wins atomic lock; competing offers receive cancellation notice.
4. Citizen map displays live MapLibre route and moving ambulance marker.
5. Upcoming junctions appear with ETA and `ADVISORY PRE-CLEARANCE NOTIFICATION ONLY` disclaimer.

### Test C: Offline SMS Fallback (Dual-Phone Live Blackout)
1. Turn OFF mobile data and Wi-Fi on Phone A (Citizen).
2. Enable **Gateway Mode** on Phone B (Driver App) with server URL `http://<LAPTOP_IP>:4000`.
3. Citizen triggers SOS.
4. Phone A sends `S1` packet over GSM SMS to Phone B.
5. Phone B relays packet to server over HTTP, receives dispatch match, and sends `A1` assignment SMS back to Phone A.
6. Citizen app receives `A1` and renders approaching ambulance with **"via SMS"** badge!
