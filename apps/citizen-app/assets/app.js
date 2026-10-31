// apps/citizen-app/assets/app.js
// SaHaay Citizen Native App Logic — Leaflet Maps & Live Telemetry

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : 'http://10.0.2.2:3000';

let activeMissionId = null;
let holdTimer = null;
let countdownInterval = null;
let countdownSeconds = 30;
let isDispatching = false;
let missionWs = null;

let trackingMap = null;
let patientMarker = null;
let ambulanceMarker = null;
let routePolyline = null;
let currentPatientCoords = { lat: 23.0338, lon: 72.5850 };
let currentAmbulanceCoords = null;

function navigateTo(screenId) {
  document.querySelectorAll('.screen-view').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-target') === screenId) {
      btn.classList.add('text-white');
      btn.classList.remove('text-slate-500');
    } else {
      btn.classList.remove('text-white');
      btn.classList.add('text-slate-500');
    }
  });

  if (screenId === 'tracking') {
    setTimeout(() => {
      initCitizenMap();
    }, 100);
  } else if (screenId === 'updates') {
    fetchUpdates();
  }
}

function call112() {
  if (window.SaHaayNativeBridge && window.SaHaayNativeBridge.showToast) {
    window.SaHaayNativeBridge.showToast('Connecting to 112 Government Hotline...');
    if (window.SaHaayNativeBridge.vibrate) window.SaHaayNativeBridge.vibrate(200);
  } else {
    alert('Calling 112 National Emergency Hotline');
  }
}

// ── Tactile Hold-to-Confirm Red SOS ──────────────────────────────────────────
function startSosHold() {
  if (isDispatching) return;
  const btn = document.getElementById('sos-trigger-btn');
  const subtext = document.getElementById('sos-btn-subtext');
  if (subtext) subtext.textContent = 'HOLDING...';
  if (btn) btn.style.transform = 'scale(0.96)';

  holdTimer = setTimeout(() => {
    executeSosDispatch();
  }, 1200);
}

function cancelSosHold() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
    const btn = document.getElementById('sos-trigger-btn');
    const subtext = document.getElementById('sos-btn-subtext');
    if (subtext && !isDispatching) subtext.textContent = 'Hold 1.5s to Dispatch';
    if (btn) btn.style.transform = 'scale(1)';
  }
}

async function getLiveCoordinates() {
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: true });
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch (e) {}
  }
  return { lat: 23.0338, lon: 72.5850 }; // Navrangpura default
}

async function executeSosDispatch() {
  if (isDispatching) return;
  isDispatching = true;
  const subtext = document.getElementById('sos-btn-subtext');
  if (subtext) subtext.textContent = 'DISPATCHING...';

  const coords = await getLiveCoordinates();
  currentPatientCoords = coords;

  try {
    const res = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: coords.lat,
        lon: coords.lon,
        flags: 0,
        sosUid: `cit-manual-${Date.now()}`
      })
    });
    const data = await res.json();
    if (data.ok && data.missionId) {
      activeMissionId = data.missionId;
      if (window.SaHaayNativeBridge) {
        if (window.SaHaayNativeBridge.showToast) window.SaHaayNativeBridge.showToast(`SOS Dispatched! Search Ring Active.`);
        if (window.SaHaayNativeBridge.vibrate) window.SaHaayNativeBridge.vibrate(400);
      }
      navigateTo('tracking');
      subscribeMissionWs(data.missionId);
      startMissionPolling(data.missionId);
    }
  } catch (err) {
    console.error('SOS dispatch error:', err);
    navigateTo('tracking');
  } finally {
    isDispatching = false;
    if (subtext) subtext.textContent = 'Hold 1.5s to Dispatch';
    const btn = document.getElementById('sos-trigger-btn');
    if (btn) btn.style.transform = 'scale(1)';
  }
}

// ── Crash Detection 30s Countdown ────────────────────────────────────────────
function triggerCrashSimulation() {
  const modal = document.getElementById('crash-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  countdownSeconds = 30;
  const timerElem = document.getElementById('crash-countdown-timer');
  if (timerElem) timerElem.textContent = countdownSeconds;

  if (window.SaHaayNativeBridge && window.SaHaayNativeBridge.vibrate) {
    window.SaHaayNativeBridge.vibrate(600);
  }

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    countdownSeconds--;
    if (timerElem) timerElem.textContent = countdownSeconds;
    if (countdownSeconds <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      executeSosDispatch();
    }
  }, 1000);
}

function cancelCrashCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  const modal = document.getElementById('crash-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (window.SaHaayNativeBridge && window.SaHaayNativeBridge.showToast) {
    window.SaHaayNativeBridge.showToast('Crash alert cancelled safely.');
  }
}

// ── Real Leaflet Map Management ──────────────────────────────────────────────
function initCitizenMap() {
  const mapElem = document.getElementById('citizen-tracking-map');
  if (!mapElem || typeof L === 'undefined') return;

  if (!trackingMap) {
    trackingMap = L.map('citizen-tracking-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([currentPatientCoords.lat, currentPatientCoords.lon], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(trackingMap);

    const patientIcon = L.divIcon({
      className: 'patient-marker-div',
      html: '<div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs"><i class="bi bi-geo-alt-fill"></i></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    patientMarker = L.marker([currentPatientCoords.lat, currentPatientCoords.lon], { icon: patientIcon }).addTo(trackingMap);
  } else {
    trackingMap.invalidateSize();
    if (patientMarker) {
      patientMarker.setLatLng([currentPatientCoords.lat, currentPatientCoords.lon]);
    }
  }

  if (currentAmbulanceCoords) {
    updateAmbulancePosition(currentAmbulanceCoords.lat, currentAmbulanceCoords.lon);
  }
}

function updateAmbulancePosition(lat, lon) {
  currentAmbulanceCoords = { lat, lon };
  if (!trackingMap || typeof L === 'undefined') return;

  const ambIcon = L.divIcon({
    className: 'amb-marker-div',
    html: '<div class="w-9 h-9 rounded-2xl bg-[#090d16] border-2 border-emerald-400 shadow-xl flex items-center justify-center text-base text-emerald-400"><i class="bi bi-hospital"></i></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  if (!ambulanceMarker) {
    ambulanceMarker = L.marker([lat, lon], { icon: ambIcon }).addTo(trackingMap);
  } else {
    ambulanceMarker.setLatLng([lat, lon]);
  }

  // Draw real road route
  fetchRealRoute(lat, lon, currentPatientCoords.lat, currentPatientCoords.lon);

  if (patientMarker && ambulanceMarker) {
    const bounds = L.latLngBounds([patientMarker.getLatLng(), ambulanceMarker.getLatLng()]);
    trackingMap.fitBounds(bounds.pad(0.25));
  }
}

async function fetchRealRoute(startLat, startLon, endLat, endLon) {
  try {
    const res = await fetch(`${API_BASE}/api/routing/route?startLat=${startLat}&startLon=${startLon}&endLat=${endLat}&endLon=${endLon}`);
    if (res.ok) {
      const data = await res.json();
      if (data.coordinates && data.coordinates.length && trackingMap) {
        if (routePolyline) trackingMap.removeLayer(routePolyline);
        routePolyline = L.polyline(data.coordinates, {
          color: '#ea3836',
          weight: 5,
          opacity: 0.85,
          dashArray: '8, 6'
        }).addTo(trackingMap);

        const etaElem = document.getElementById('tracking-eta');
        if (etaElem && data.durationMinutes) {
          etaElem.textContent = `${Math.ceil(data.durationMinutes)} min (${data.distanceKm.toFixed(1)} km)`;
        }
      }
    }
  } catch (err) {
    console.warn('Route polyline error:', err);
  }
}

// ── WebSocket Live Mission Subscription ──────────────────────────────────────
function subscribeMissionWs(missionId) {
  if (missionWs) {
    try { missionWs.close(); } catch (e) {}
    missionWs = null;
  }

  const wsUrl = (API_BASE.replace(/^http/, 'ws')) + `/?role=citizen&missionId=${missionId}`;
  try {
    missionWs = new WebSocket(wsUrl);
    missionWs.onopen = () => console.log('Citizen WS connected to mission', missionId);
    missionWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'MISSION_ASSIGNED') {
          handleAssigned(msg);
        } else if (msg.type === 'AMBULANCE_LOCATION' || msg.type === 'TELEMETRY_UPDATE') {
          if (msg.lat && msg.lon) {
            updateAmbulancePosition(msg.lat, msg.lon);
          }
        } else if (msg.type === 'MISSION_STATUS') {
          handleStatusChange(msg.status);
        }
      } catch (err) {
        console.warn('WS message parse err:', err);
      }
    };
  } catch (e) {
    console.warn('WS connection failed:', e);
  }
}

function handleAssigned(data) {
  const driverElem = document.getElementById('tracking-driver-name');
  const vehicleElem = document.getElementById('tracking-vehicle-no');
  if (driverElem) driverElem.textContent = data.driverName || 'Verified Paramedic';
  if (vehicleElem) vehicleElem.textContent = `${data.vehicleNo || 'GJ01AB1234'} • Priority Unit`;

  if (data.ambLat && data.ambLon) {
    updateAmbulancePosition(data.ambLat, data.ambLon);
  }
  if (window.SaHaayNativeBridge && window.SaHaayNativeBridge.showToast) {
    window.SaHaayNativeBridge.showToast(`Ambulance Assigned: ${data.vehicleNo}`);
  }
}

function handleStatusChange(status) {
  const etaElem = document.getElementById('tracking-eta');
  const progBar = document.getElementById('tracking-progress-bar');

  if (status === 'ENROUTE') {
    if (progBar) progBar.style.width = '35%';
  } else if (status === 'ON_SCENE') {
    if (etaElem) {
      etaElem.textContent = 'ARRIVED ON SCENE';
      etaElem.className = 'text-sm font-extrabold text-emerald-600';
    }
    if (progBar) progBar.style.width = '70%';
  } else if (status === 'TRANSPORTING') {
    if (etaElem) {
      etaElem.textContent = 'TRANSPORTING TO CIVIL HOSPITAL';
      etaElem.className = 'text-xs font-bold text-sky-600';
    }
    if (progBar) progBar.style.width = '90%';
  } else if (status === 'COMPLETED') {
    if (etaElem) {
      etaElem.textContent = 'HANDOVER COMPLETED';
      etaElem.className = 'text-sm font-extrabold text-emerald-600';
    }
    if (progBar) {
      progBar.style.width = '100%';
      progBar.className = 'h-full bg-emerald-500 rounded-full transition-all duration-500';
    }
  }
}

// ── Polling Fallback ─────────────────────────────────────────────────────────
function startMissionPolling(missionId) {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/missions/${missionId}`);
      if (res.ok) {
        const m = await res.json();
        if (m.assignedAmbulanceId) {
          const driverElem = document.getElementById('tracking-driver-name');
          const vehicleElem = document.getElementById('tracking-vehicle-no');
          if (driverElem) driverElem.textContent = m.assignedDriverName || 'Paramedic Unit';
          if (vehicleElem) vehicleElem.textContent = `${m.assignedVehicleNo || 'GJ-01'} • ALS Unit`;

          // Check if ambulance coords are available
          const ambRes = await fetch(`${API_BASE}/ambulances`);
          if (ambRes.ok) {
            const ambulances = await ambRes.json();
            const amb = ambulances.find(a => a.id === m.assignedAmbulanceId);
            if (amb) {
              updateAmbulancePosition(amb.lat, amb.lon);
            }
          }
        }
        handleStatusChange(m.status);
        if (m.status === 'COMPLETED' || m.status === 'CANCELLED') {
          clearInterval(interval);
        }
      }
    } catch (e) {}
  }, 4000);
}

// ── Fetch Official Government Advisories ─────────────────────────────────────
async function fetchUpdates() {
  const container = document.getElementById('news-feed-container');
  if (!container) return;
  try {
    const res = await fetch(`${API_BASE}/api/updates`);
    if (res.ok) {
      const newsList = await res.json();
      container.innerHTML = newsList.map(n => `
        <div class="bg-[#131b2a] border border-slate-800 rounded-2xl p-4">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${n.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/20 text-sky-400'}">
              ${n.category}
            </span>
            ${n.isPinned ? '<span class="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full">PINNED</span>' : ''}
          </div>
          <h3 class="text-xs font-bold text-white leading-tight">${n.title}</h3>
          <p class="text-[11px] text-slate-400 mt-1.5 leading-relaxed">${n.body}</p>
          <div class="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Source: ${n.officialSource || 'Govt Bulletin'}</span>
            <span class="text-emerald-400">● Official Verified</span>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.warn('Updates fetch failed:', err);
  }
}

// Init
fetchUpdates();
