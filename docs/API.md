# SaHaay API Specification

## 1. Unified REST API Endpoints (Port 3000)

### Citizen Services
- `POST /api/auth/citizen`: Authenticate or register a citizen by phone number.
- `GET /api/citizen/profile/:id`: Retrieve citizen emergency profile (blood group, allergies, contacts).
- `PUT /api/citizen/profile/:id`: Update emergency contacts and medical notes.
- `POST /missions`: Create single emergency request (manual SOS or crash auto). Idempotent by `sosUid`.
- `POST /sos`: Alias for emergency dispatch creation.
- `GET /missions/:id`: Poll mission status, assigned ambulance, driver info, and live telemetry.

### Driver Services
- `POST /api/auth/driver/register`: Register paramedic account with commercial driving license and vehicle registration. Enters `PENDING` verification status.
- `POST /api/auth/driver/login`: Authenticate driver by phone number.
- `POST /api/driver/:id/duty`: Toggle on-duty availability. Strictly rejected (403) if `isVerified === false`.
- `POST /missions/:id/accept`: Atomic acceptance of mission offer with race condition lock. Returns `{ won: true }` or 409 conflict `{ won: false }`.
- `POST /missions/:id/decline`: Decline mission offer.
- `PATCH /missions/:id/status`: Transition mission milestones (`ARRIVED_AT_PATIENT`, `PATIENT_PICKED_UP`, `TRANSPORTING`, `COMPLETED`).
- `POST /missions/:id/breakdown`: Report vehicle mechanical failure. Marks driver unavailable, records incident in audit log, and initiates immediate replacement dispatch around patient.

### Government News & Alerts CMS
- `GET /api/updates`: List published government bulletins and safety advisories.
- `POST /api/admin/updates`: Publish official emergency announcement (title, category, priority, sourceUrl, isPinned).
- `DELETE /api/admin/updates/:id`: Delete advisory.

### Control Room & Fleet Administration
- `POST /api/auth/admin/login`: Control room authentication.
- `GET /api/admin/overview`: Summary metrics (active emergencies, en route units, available ambulances, pending driver approvals).
- `GET /api/admin/drivers`: List registered drivers and verification status.
- `POST /api/admin/drivers/:id/verify`: Approve or reject driver commercial license.
- `GET /api/admin/citizens`: List registered citizen profiles.
- `GET /ambulances`: Live fleet telemetry across Ahmedabad zones.
- `PATCH /ambulances/:id/location`: Update ambulance GPS coordinates.
- `GET /audit`: Retrieve SHA-256 tamper-evident cryptographic log.
- `GET /audit/verify`: Verify hash chain integrity.

### APK Distribution
- `GET /api/releases`: Release notes, versions, file sizes, and SHA-256 hashes.
- `GET /api/releases/latest/:appType`: Latest release for `citizen` or `driver`.
- `GET /downloads/SaHaay-Citizen.apk`: Binary APK download for Citizen App.
- `GET /downloads/SaHaay-Driver.apk`: Binary APK download for Driver App.

