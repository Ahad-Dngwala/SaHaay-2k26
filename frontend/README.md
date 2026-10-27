# 🚑 SaHaay Frontend (Legacy Vite Web Client)

> [!NOTE]
> This folder contains the legacy Vite + React 18 web dashboard and historical Expo 49 packages.  
> For the new zero-dependency in-memory dispatch server and unified architecture, see [README.md](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/README.md) and [progress.md](file:///c:/Users/ahadd/Documents/GitHub/SaHaay-2k26/progress.md).  
> The new standalone Control Dashboard is served directly at `http://localhost:3000/control`.

Complete React frontend for the Emergency Ambulance Dispatch Platform.

## 🚀 Features

### User App (`/user`)
- ✅ **Emergency Creation**: GPS-based automatic location detection
- ✅ **Live Tracking**: Real-time ambulance movement on Google Maps
- ✅ **Status Updates**: Emergency status timeline
- ✅ **Location Edit**: Manual location correction if needed
- ✅ **WebSocket Updates**: Real-time driver assignment and GPS tracking

### Driver App (`/driver`)
- ✅ **Accept/Reject**: Emergency request notifications
- ✅ **Live GPS Tracking**: Automatic location updates every 5 seconds
- ✅ **Route Navigation**: Google Maps Directions with best route
- ✅ **ETA Display**: Estimated time of arrival
- ✅ **Status Management**: Available/Busy/Offline toggle
- ✅ **Emergency Transfer**: Transfer from ambulance's current GPS location
- ✅ **Status Updates**: Reached location, Hospital reached, Complete
- ✅ **Traffic Notifications**: Automatic checkpoint emails (backend handles)

### Admin Dashboard (`/admin`)
- ✅ **Live Emergencies**: Real-time emergency monitoring
- ✅ **Driver Status**: All drivers with location and status
- ✅ **Metrics**: Active emergencies, available drivers, response times
- ✅ **Emergency Timeline**: Complete event history
- ✅ **Auto-refresh**: Updates every 5 seconds

## 📦 Installation

```bash
cd frontend
npm install
```

## 🔧 Configuration

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_WS_URL=http://localhost:3000
```

## 🚀 Run

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📱 Usage

1. **Login** (Home page)
   - Enter phone number
   - Select role: User / Driver / Admin
   - Phone-based authentication (backend handles registration)

2. **User Flow**:
   - Click "Create Emergency"
   - Location auto-detected via GPS
   - Edit location if needed
   - Watch real-time ambulance tracking
   - View status timeline

3. **Driver Flow**:
   - Set status to "Available"
   - Receive emergency requests
   - Accept/Reject requests
   - Navigate using Google Maps route
   - Update status: Reached → Hospital → Complete
   - Transfer emergency if needed (uses current GPS location)

4. **Admin Flow**:
   - Monitor all active emergencies
   - View driver statuses
   - Check metrics and response times
   - View emergency timeline

## 🗺️ Google Maps Integration

- **Automatic Location Detection**: User's GPS location
- **Live Tracking**: Real-time ambulance position
- **Route Navigation**: Google Directions API
- **Markers**: Emergency location, Driver location
- **Polyline**: Route visualization

## 🔌 WebSocket Features

- **Real-time Emergency Updates**: Status changes
- **Live GPS Tracking**: Driver location updates
- **Driver Assignment**: Instant notifications
- **Status Sync**: User ↔ Driver ↔ System

## 🎯 Complete Feature Coverage

✅ Emergency creation with GPS  
✅ Radius-based dispatch (500m → 1km)  
✅ Auto-redispatch (2 min timeout - backend)  
✅ Driver accept/reject flow  
✅ Live ambulance tracking  
✅ Route + ETA from Google Maps  
✅ Traffic checkpoint emails (backend)  
✅ Emergency transfer (current GPS location)  
✅ SMS emergency trigger (backend)  
✅ Real-time WebSocket updates  
✅ Admin dashboard  
✅ Complete database integration  

## 🏗️ Tech Stack

- **React 18** - UI Framework
- **Vite** - Build tool
- **React Router** - Routing
- **Google Maps API** - Maps & Navigation
- **Socket.IO Client** - Real-time updates
- **Axios** - API calls
- **React Query** - Data fetching
- **React Hot Toast** - Notifications
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icons

## 📂 Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx      # Login page
│   │   ├── UserEmergency.jsx # User emergency app
│   │   ├── DriverApp.jsx     # Driver app
│   │   └── AdminDashboard.jsx # Admin dashboard
│   ├── config/
│   │   └── api.js            # API configuration
│   ├── utils/
│   │   └── socket.js         # WebSocket client
│   ├── App.jsx               # Main app router
│   └── main.jsx              # Entry point
```

## 🎨 UI/UX Features

- **Responsive Design**: Works on mobile and desktop
- **Real-time Updates**: Live status changes
- **Toast Notifications**: User feedback
- **Loading States**: Smooth UX
- **Error Handling**: Graceful error messages
- **Auto-refresh**: Admin dashboard auto-updates

---

**Status**: ✅ **Complete Full-Stack Emergency Dispatch Platform**

Backend + Frontend = Production Ready 🚀
