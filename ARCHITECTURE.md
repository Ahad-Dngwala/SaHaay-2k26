# SaHaay — System Architecture & Technical Specification

## 1. High-Level System Architecture

SaHaay operates as an autonomous, offline-first emergency coordination layer. It decouples the dispatch decision loop from human call centres while maintaining continuous communication over hybrid WebSockets and GSM/SMS channels.

```mermaid
graph TB
    subgraph "Edge Tier (Citizen / IoT)"
        Sensor[Accelerometer Sensor] --> Detector[CrashDetector (Stillness Filter)]
        Detector --> Countdown[30s Safety Countdown Timer]
        Countdown --> SOS[SOS Trigger]
        Manual[Manual SOS Button] --> SOS
        SOS --> TransportMgr[TransportManager State Machine]
    end

    subgraph "Dual Transport Pipelines"
        TransportMgr -- Online --> HTTP[REST / WebSocket Gateway]
        TransportMgr -- Offline (Blackout) --> SMS[Base36 SMS Codec]
        SMS -.-> Carrier[GSM Telephony / SimulatedCarrier]
    end

    subgraph "SaHaay Core Dispatch Engine (Node / TypeScript)"
        Carrier --> SMSInbound["/sms/inbound Webhook"]
        HTTP --> MissionCtrl[Mission Controller]
        SMSInbound --> MissionCtrl
        
        MissionCtrl --> Grid[In-Memory Spatial Binning Grid]
        Grid --> Ripple[Ripple Search Ladder: 500m -> 8km]
        Ripple --> Offers[Driver Offer Dispatch]
        
        Offers --> Lock["Synchronous First-Accept Lock (Atomic)"]
        Lock --> ActiveMission[Active Mission Lifecycle]
        
        ActiveMission --> DeadReckoning[Dead-Reckoning Marker Engine]
        ActiveMission --> GreenCorridor[Green Corridor Advisory Alert]
        ActiveMission --> Breakdown[Breakdown Anomaly Handler]
        
        Breakdown -- Redispatch to Live GPS --> Ripple
        
        MissionCtrl --> AuditChain["SHA-256 Tamper-Evident Hash Chain"]
    end

    subgraph "Operational Dashboards"
        GreenCorridor --> ControlUI["/control Dashboard (Traffic Authorities)"]
        AuditChain --> AuditUI["Audit Verification / Tamper Demo"]
        DeadReckoning --> TelemetryStream[WebSocket Telemetry Stream]
    end
```

---

## 2. Emergency SOS Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Citizen / Sensor
    participant Client as Client TransportManager
    participant Server as SaHaay Dispatch Server
    participant Fleet as Nearby Ambulances
    participant Authority as Traffic Control Room

    Note over Patient, Client: Vehicular impact detected (>= 2.5g)
    Patient->>Client: Post-impact stillness verified (1000ms)
    Client->>Patient: 30s Countdown Modal (Haptics + Audio)
    Note over Patient: User does not cancel
    
    alt Data Network Available
        Client->>Server: POST /missions { lat, lon, flags }
    else Mobile Data Blackout
        Client->>Client: Encode S1 Base36 Token (<45 chars)
        Client->>Server: POST /sms/inbound (SimulatedCarrier)
        Server-->>Client: Confirmation SMS reply (Mission ID)
    end

    Server->>Server: Log MISSION_CREATED in SHA-256 Hash Chain
    Server->>Fleet: Spatial Query (500m ring) -> Broadcast Offers
    
    par Candidate Response
        Fleet->>Server: Driver 1 accepts (Winner)
    and Competing Response
        Fleet->>Server: Driver 2 accepts (Late)
    end

    Server->>Server: Atomic First-Accept Lock (Driver 1 wins)
    Server-->>Fleet: Driver 1 receives HTTP 200 { won: true }
    Server-->>Fleet: Driver 2 receives HTTP 409 Conflict { won: false }
    Server-->>Client: MISSION_ASSIGNED (Driver 1 details, vehicle plate)
    
    Server->>Authority: GREEN_CORRIDOR_UPDATE (Advisory Junction ETAs)
    Server->>Client: Live telemetry stream (20s pings + Dead-Reckoning)
```

---

## 3. Transport State Machine

```mermaid
stateDiagram-v2
    [*] --> ONLINE: Initialization
    
    ONLINE --> DEGRADED: HTTP failure count >= 3
    ONLINE --> OFFLINE_SMS: FORCE_BLACKOUT toggle (Operator / Airplane Mode)
    
    DEGRADED --> OFFLINE_SMS: HTTP failure count >= 6
    DEGRADED --> ONLINE: HTTP Success (Reset failures)
    
    OFFLINE_SMS --> RECOVERED: HTTP Success (Outbox draining)
    OFFLINE_SMS --> OFFLINE_SMS: Route through SimulatedCarrier / SMS
    
    RECOVERED --> ONLINE: Outbox fully drained
    RECOVERED --> DEGRADED: HTTP fails during recovery
```

---

## 4. Self-Healing Failover Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Citizen (Live GPS)
    participant Stranded as Stranded Ambulance
    participant Server as Dispatch Server
    participant Fleet as Fleet Spatial Index

    Note over Stranded: Mechanical breakdown reported
    Stranded->>Server: POST /missions/:id/breakdown { ambulanceId }
    Server->>Server: Mark Stranded status = 'BREAKDOWN'
    Server->>Server: Log stranded coordinates for crew recovery in SHA-256 ledger
    
    Server->>Patient: Alert: Breakdown occurred; replacement on route
    
    Note over Server, Patient: Search restarts from PATIENT'S LIVE GPS
    Server->>Fleet: Query nearest available from patientLatLive, patientLonLive
    Fleet->>Server: Replacement Ambulance confirms
    Server->>Patient: Assignment updated with Replacement unit
    Server->>Server: Audit event: REDISPATCH_ASSIGNED
```

---

## 5. Offline Mapping & Vector Tile Strategy

### Prototype Implementation (Bundled GeoJSON + Turf.js)
1. **Zero-Dependency Bundle:** Bundled `assets/ahmedabad-roads.geojson` (<1.5 MB) provides the arterial road network for Ahmedabad, explicitly marked `synthetic: true`.
2. **Dead-Reckoning Projection:** Between low-frequency GPS/SMS updates ($20\text{s}$ interval), the `DeadReckoningTracker` advances the ambulance icon along road coordinates (`@turf/along`) or project heading (`@turf/destination`).
3. **Smooth Exponential Filtering:** A smoothing filter ($\tau = 0.7\text{s}$) prevents visual snaps when fresh fixes arrive.

### Production Roadmap (Native Vector Tiles)
1. **MapLibre Native / Protomaps:** Deploy on-device vector basemaps using offline `.pmtiles` or `.mbtiles` packages containing the regional road extract.
2. **Turn-by-Turn Companion Navigation:** Driver application delegates to **Organic Maps** or system navigation via standard `geo:` URI deep links, avoiding heavy embedded routing libraries.
