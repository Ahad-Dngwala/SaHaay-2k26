# 🔧 Port 3000 Resolution Guide (SaHaay Dispatch Server)

## Problem
```text
Error: listen EADDRINUSE: address already in use :::3000
```

## Cause
- A previous instance of the SaHaay dispatch server (or another local process) is still bound to TCP port 3000.
- Attempting to start another instance on the same port causes an `EADDRINUSE` conflict.

---

## Safe Resolution (Targeted Process Termination)

> [!CAUTION]
> **Do NOT run indiscriminate commands like `Stop-Process -Name node` or `killall node`.**  
> That terminates all Node processes on your machine, including IDE background tasks, build watchers, and other projects. Always identify the specific process holding port 3000.

### Option A: Identify and Terminate Only the Port 3000 Process

#### On Windows (PowerShell)
```powershell
# 1. Identify which process is bound to port 3000
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess
    Write-Host "Process on port 3000: $($proc.ProcessName) (PID: $($proc.Id))"

    # 2. Terminate only that specific process
    Stop-Process -Id $proc.Id -Force
    Write-Host "✅ Terminated PID $($proc.Id) holding port 3000."
} else {
    Write-Host "Port 3000 is already free."
}
```

#### On Linux / macOS (Bash)
```bash
# 1. Identify PID on port 3000
lsof -i :3000

# 2. Terminate that specific PID
kill -15 <PID>
```

---

### Option B: Run SaHaay on an Alternative Port

The SaHaay dispatch server respects the `PORT` environment variable:

```bash
# Windows (PowerShell)
$env:PORT="3001"; npm run dev:server

# Linux / macOS (Bash)
PORT=3001 npm run dev:server
```

When running on an alternative port:
- **Control Dashboard:** `http://localhost:3001/control`
- **Health Check:** `http://localhost:3001/health`
- **Ambulance Fleet:** `http://localhost:3001/ambulances`

---

## Verifying the Active Prototype

Once the port is free, start the zero-dependency in-memory dispatch server:

```bash
npm run dev:server
```

Expected startup log:
```text
🌱 Seeded 25 ambulances across Ahmedabad
🚀 SaHaay Server running on port 3000
🎛️  Control Dashboard: http://localhost:3000/control
🩺 Health check:      http://localhost:3000/health
```

---

## Architecture Note: Current Prototype vs. Legacy Stack

| Dimension | Active Prototype (Current Demo) | Legacy Reference (`backend/` & `frontend/`) |
|:---|:---|:---|
| **Server** | TypeScript dispatch engine (`server/src/index.ts`) on port 3000 | JavaScript Express API with MongoDB & Twilio (`backend/server.js`) |
| **Control UI** | Standalone dashboard at `http://localhost:3000/control` | Vite React 18 frontend on port 5173 (`frontend/`) |
| **Database** | In-memory spatial grid index (zero cloud/DB dependencies) | Local MongoDB on port 27017 |
| **Run Command**| `npm run dev:server` | `cd backend && npm start` + `cd frontend && npm run dev` |
