# SaHaay — System Limitations & Production Roadmap

In the interest of full technical transparency, this document records known constraints, physical boundaries, and technical trade-offs of the SaHaay emergency dispatch prototype.

---

## 1. Physical & Telephony Constraints

### Cellular Signal vs. Mobile Data
> [!IMPORTANT]
> **SMS requires at least a 2G/GSM cellular connection.**  
> SaHaay's offline tier is designed for **mobile data blackouts**, congested networks, natural disasters where packet data infrastructures fail, or rural areas lacking 4G/5G coverage. It does **not** function in deep subterranean or remote topological dead zones with 0 dBm cellular signal.

### Silent SMS Sending on Modern Mobile OS
- **iOS:** Apple does not permit third-party applications to transmit or intercept SMS messages silently in the background. On iOS, the best fallback is launching the system SMS composer (`sms:` URI) with pre-filled Base36 coordinates where the user must tap "Send".
- **Android:** Android supports silent SMS transmission via `SmsManager` and background message interception via `BroadcastReceiver`. However, Google Play policies strictly gate `SEND_SMS` and `RECEIVE_SMS` permissions to designated SMS default applications or emergency apps with specific exemptions.
- **Hackathon Implementation:** Labelled **SIMULATED** in the Expo Go prototype via `SimulatedCarrier`, which simulates carrier latency and loss while posting directly to `/sms/inbound`. Production requires a signed native Android build or integration with government telecom emergency gateways.

---

## 2. Regulatory & Commercial SMS Constraints (India)

### TRAI DLT Registration
- In India, commercial and transactional SMS messages delivered through cloud aggregators (Twilio, Gupshup, Exotel) require **Distributed Ledger Technology (DLT)** registration under TRAI regulations.
- All SMS sender IDs (headers) and message templates must be pre-approved.
- **Prototype Setup:** The prototype uses an in-process gateway and direct webhook handlers. For pilots, an Android phone running a local gateway or an emergency DLT-approved header is required.

---

## 3. Mapping & Turn-by-Turn Routing

### Bundled GeoJSON vs. Vector Tiles
- **Prototype:** Bundles an arterial road GeoJSON for Ahmedabad (`assets/ahmedabad-roads.geojson`, <1.5 MB) rendered via vector paths and interpolated with Turf.js.
- **Production Path:** Full city or state deployment uses pre-compiled vector tile packs (PMTiles/MBTiles) rendered on-device using MapLibre Native, with driver turn-by-turn navigation delegated to companion navigation engines (e.g. Organic Maps) via system `geo:` intents.

---

## 4. Traffic Pre-Clearance (Green Corridor)

### Advisory Notification vs. Signal Actuation
- **Prototype:** Calculates vehicle ETAs for key intersections (e.g., CG Road, Ashram Road) and broadcasts real-time advisories to traffic authority dashboards (`/control`).
- **Production Path:** Full signal actuation requires integration with municipal Smart City Integrated Command and Control Centers (ICCC) and traffic signal controllers (e.g., ITMS/SCATS/CoSiCoSt). The prototype acts as the standardized advisory notification contract.
