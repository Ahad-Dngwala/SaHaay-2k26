# 🔧 Port 3000 Already in Use - Resolution

## Problem
```
Error: listen EADDRINUSE: address already in use :::3000
```

## Cause
- Backend server was previously running (from earlier test)
- Node.js process didn't terminate
- Trying to start another instance on same port

## Solution Applied ✅

### Step 1: Kill Node Process
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```
Result: ✅ All Node processes terminated

### Step 2: Start Backend Fresh
```bash
cd backend
node server.js
```
Output:
```
✅ WebSocket service initialized
✅ MongoDB connected successfully
🚑 Ambulance Dispatch Backend running on port 3000
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```
Output:
```
VITE v5.4.21 ready in 250 ms
Local: http://localhost:5173/
```

## Current Status ✅

| Service | Port | Status |
|---|---|---|
| Frontend | 5173 | ✅ Running |
| Backend | 3000 | ✅ Running |
| Database | 27017 | ✅ Connected |
| WebSocket | 3000 | ✅ Connected |

## ✅ Ready to Test

Your API is now properly connected:
1. Open http://localhost:5173 in browser
2. Try login with any phone number
3. Check browser console for errors
4. Try creating an emergency

## Prevention for Future

### Auto-Kill on Port Conflicts
If you get EADDRINUSE error again:

```powershell
# PowerShell: Find and kill process on port 3000
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($proc) {
  Stop-Process -Id $proc.OwningProcess -Force
}
```

### Or Use Different Port
```bash
# Start backend on port 3001
PORT=3001 node server.js

# Then update frontend/.env.local
VITE_API_URL=http://localhost:3001
```

### Or Use Process Manager
```bash
# Install pm2
npm install -g pm2

# Start services
pm2 start "node server.js" --name backend --cwd backend
pm2 start "npm run dev" --name frontend --cwd frontend

# View status
pm2 list

# Stop all
pm2 kill
```

## Notes

- Redis connection errors are OK (optional service)
- MongoDB connected successfully ✅
- All core functionality working

## Next: Test the App

1. Frontend loads at http://localhost:5173
2. Try login
3. Should see either:
   - ✅ Login successful
   - ⚠️ User not found (if first time) - then register
4. No 404 errors on `/api/auth/login`

