# 🚀 Quick Start Guide - Frontend

## Installation

```bash
cd frontend
npm install
```

## Configuration

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_WS_URL=http://localhost:3000
```

## Run

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

## Testing Flow

### 1. User App (`/user`)

1. Login as User:
   - Phone: `+1234567890`
   - Click "Login as User"

2. Create Emergency:
   - Click "🚨 Create Emergency" button
   - GPS location auto-detected
   - Emergency created in database
   - Request sent to drivers (500m radius)

3. Watch Live Tracking:
   - See emergency status
   - Watch for driver assignment
   - Live ambulance tracking on map
   - Status timeline updates

### 2. Driver App (`/driver`)

1. Register Driver first (via API):
   ```bash
   POST http://localhost:3000/api/driver/register
   {
     "name": "John Driver",
     "phone": "+1234567891",
     "vehicleNo": "DL-01-AB-1234"
   }
   ```

2. Login as Driver:
   - Phone: `+1234567891`
   - Click "Login as Driver"

3. Set Status to "Available"

4. Receive Emergency Request:
   - Popup appears with emergency details
   - Click "Accept" or "Reject"

5. Navigate:
   - Google Maps route shown
   - ETA displayed
   - GPS updates every 5 seconds

6. Status Updates:
   - "Reached Location" button
   - "Reached Hospital" button
   - "Complete Emergency" button

7. Transfer (if needed):
   - Enter reason (e.g., "Tyre puncture")
   - Click "Transfer Emergency"
   - Uses ambulance's current GPS location
   - Redispatched automatically

### 3. Admin Dashboard (`/admin`)

1. Login as Admin (backend handles role)
2. View:
   - Active emergencies
   - Driver statuses
   - Metrics
   - Emergency timeline

## Features Tested

✅ GPS location detection  
✅ Emergency creation  
✅ Driver accept/reject  
✅ Live tracking  
✅ Route navigation  
✅ ETA display  
✅ Status updates  
✅ Emergency transfer  
✅ WebSocket real-time updates  
✅ Google Maps integration  

---

**Ready to test!** 🚀
