# SaHaay: India's First Autonomous Emergency Response Grid

![Status](https://img.shields.io/badge/Status-Operational-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-NationScale-orange?style=for-the-badge)
![Mode](https://img.shields.io/badge/Mode-Online%20%2B%20Offline%20(SMS)-red?style=for-the-badge)

![WhatsApp Image 2026-01-11 at 1 23 57 AM (2)](https://github.com/user-attachments/assets/f1264f70-64de-444e-9204-0178000c7da3)
![WhatsApp Image 2026-01-11 at 1 36 56 AM](https://github.com/user-attachments/assets/93aa8415-40d4-4090-ae37-109ca60645de)
![WhatsApp Image 2026-01-11 at 7 24 11 AM](https://github.com/user-attachments/assets/e703e2ec-f887-4acf-b37e-a6a83da1d5ed)

> **"No patient left waiting."**
>
> SaHaay transforms emergency response from a manual, opaque phone-system into a **real-time, data-driven, and fully autonomous rescue capability**.

---

## 📉 The Critical Gap

In the Golden Hour, certainty saves lives. Yet, India's current infrastructure relies on manual coordination, leading to fatal delays.

| Current System (108/112) ❌ | SaHaay Autonomous Grid ✅ |
| :--- | :--- |
| **Manual Dispatch** via Call Centers | **Instant AI Dispatch** (< 200ms) |
| **Blind Waiting** (No Tracking) | **Live Uber-style Tracking** |
| **Single Point of Failure** | **Self-Healing Failover** (Breakdown/Traffic) |
| **Network Dependent** | **Offline SMS-First Mechanism** |
| **Opaque Operations** | **Full Digital Audit Trail** |

---

## Autonomous Architecture

SaHaay replaces human guesswork with intelligent orchestration. The system autonomously manages the entire lifecycle of an emergency—from detection to hospital admission.

```mermaid
graph TD
    %% Nodes
    User([User / IoT Sensor])
    SOS_Btn{Accident Detected?}
    
    subgraph "Decision Core (The Brain)"
        Locate[Get GPS Location]
        Scan500[Scan Radius: 500m]
        Scan1km[Scan Radius: 1km]
        Dispatch[Dispatch Request to Drivers]
    end

    subgraph "Driver Network"
        DriverMobile[Driver App]
        Accept{Accepted?}
        Lock[🔒 Lock Assignment]
        Reject[Reject / Timeout]
    end

    subgraph "Live Operations"
        Routing[⚡ Calculate Best Route]
        Track[📡 Live Tracking Stream]
        Traffic[🚦 Clear Traffic Signals]
        Breakdown{Breakdown?}
    end

    subgraph "Failover Protocol"
        Transfer[🔄 Auto-Transfer Mission]
    end

    Hospital([🏥 Hospital Admission])

    %% Flows
    User --> SOS_Btn
    SOS_Btn -- Yes --> Locate
    Locate --> Scan500
    Scan500 -- Found --> Dispatch
    Scan500 -- None --> Scan1km
    Scan1km --> Dispatch
    
    Dispatch --> DriverMobile
    DriverMobile --> Accept
    
    Accept -- No --> Reject
    Reject --> Scan1km
    
    Accept -- Yes --> Lock
    Lock --> Routing
    Routing --> Track
    Track --> Traffic
    
    Track --> Breakdown
    Breakdown -- Yes --> Transfer
    Transfer --> Scan500
    
    Breakdown -- No --> Hospital
    
    %% Styles
    style User fill:#000,stroke:#fff,color:#fff
    style SOS_Btn fill:#ff4757,stroke:#333,color:#fff
    style Hospital fill:#2ed573,stroke:#333,color:#fff
    style Lock fill:#ffa502,stroke:#333,color:#000
    style Transfer fill:#ff4757,stroke:#fff,color:#fff,stroke-dasharray: 5 5
```

---

## 🔥 Key Capabilities

### 1. ⚡ Intelligent Dispatch Engine
- **Nearest-First Logic**: Automatically pings ambulances within 500m. Expands to 1km+ dynamically if no response is received within 120 seconds.
- **Race Condition Handling**: The first driver to "Accept" locks the mission; others are instantly released.

### 2. 🛡️ Self-Healing Failover
- **Breakdown Protection**: If an ambulance halts unexpectedly or reports a breakdown, the system **automatically** re-triggers the dispatch process from the ambulance's current location to find a replacement vehicle.
- **No Human Intervention**: The transfer happens computationally, separate from the driver's panic.

### 3. 📡 Disaster-Ready Offline Mode (DIL)
- **Zero-Internet/Data Protocol**: Uses a specialized GSM/SMS transport layer.
- **Protocol**: `SOS|UID:123|LAT:28.6|LON:77.2`
- **Mechanism**: The backend runs a "Clockless" state machine that sequences SMS packets to reconstruct the emergency state even during network blackouts.

### 4. 🚦 Green Corridor Integration
- **Traffic Pre-emption**: Integration with Smart City APIs to turn signals green along the ambulance's calculated route.

---

## 🛠️ Technology Stack

| Layer | Component | Technology |
| :--- | :--- | :--- |
| **Mobile** | User / Driver Apps | **React Native** (Cross-Platform) |
| **Core** | Backend Logic | **Node.js / Express** (Event-Driven) |
| **Data** | State Store | **MongoDB** (Geo-Spatial Indexing) |
| **Real-Time** | Live Updates | **Socket.io** (WebSockets) |
| **Offline** | Transport Layer | **GSM / SMS Gateway (Twilio/Sim)** |
| **Mapping** | GIS / Routing | **Google Maps Platform** |

---

## 🚀 Deployment & Scalability

SaHaay is designed as a **Cloud-Native Microservices** architecture, capable of horizontal scaling to support nation-wide deployment.

- **State-Level Sharding**: Data is partitioned by region (e.g., `db_maharashtra`, `db_karnataka`) for low-latency access.
- **Containerization**: All services are Dockerized for rapid deployment across AWS/Azure or on-premise Government Data Centers.

### Quick Start (Simulator)

```bash
# 1. Clone the repository
git clone https://github.com/Ahad-Dngwala/SAHAAY.github.io.git

# 2. Install Dependencies
npm install

# 3. Start Mission Control (Backend + Simulator)
npm start

# 4. Launch Offline Simulation (No Internet)
# Open http://localhost:3000/citizen.html to trigger SOS via simulated GSM
```

## 🏆 Project Status

- [x] **Core Dispatch Logic** (Nearest Neighbor)
- [x] **Driver Allocation Algorithm**
- [x] **Live GPS Tracking**
- [x] **Offline SMS Transport Layer** (Pure GSM)
- [ ] Traffic Light Integration (API Pending)

---

> Made with ❤️ by Team SECRET CODERS. **Built for India.** Saving lives, one millisecond at a time.
