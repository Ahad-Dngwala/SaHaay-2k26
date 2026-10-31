// apps/driver-app/assets/app.js
// SaHaay Ambulance Driver Native App Logic — Authenticated Targeted Dispatch & Real Leaflet Maps

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : 'http://10.0.2.2:3000';

let driverId = localStorage.getItem('sahaay_driver_id') || 'AMB-01';
let driverPhone = localStorage.getItem('sahaay_driver_phone') || '9876500001';
let driverToken = localStorage.getItem('sahaay_driver_token') || null;
let driverName = 'Rajesh Patel';
let vehicleNo = 'GJ01AB1234';
let isVerified = true;
let isOnDuty = true;
let activeMissionId = null;
let currentStageIndex = 0;
let driverWs = null;
let telemetryTimer = null;

let driverMap = null;
let driverMarker = null;
let targetMarker = null;
let routePolyline = null;
let currentDriverCoords = { lat: 23.0330, lon: 72.5607 };
let activePatientCoords = { lat: 23.0338, lon: 72.5850 };
let civilHospitalCoords = { lat: 23.0525, lon: 72.5934 }; // Ahmedabad Civil Hospital

const STAGES = [
  { name: 'EN ROUTE TO PATIENT', nextAction: 'ARRIVED AT PATIENT (STEP 1)', status: 'ENROUTE' },
  { name: 'ARRIVED AT SCENE', nextAction: 'PATIENT LOADED (STEP 2)', status: 'ON_SCENE' },
  { name: 'EN ROUTE TO CIVIL HOSPITAL', nextAction: 'ARRIVED AT HOSPITAL (STEP 3)', status: 'TRANSPORTING' },
  { name: 'ARRIVED AT HOSPITAL', nextAction: 'HANDOVER COMPLETE (FINISH)', status: 'COMPLETED' },
];

function navigateTo(screenId) {
  document.querySelectorAll('.screen-view').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-target') === screenId) {
      btn.classList.add('text-white');
      btn.classList.remove('text-zinc-400');
    } else {
      btn.classList.remove('text-white');
      btn.classList.add('text-zinc-400');
    }
  });

  if (screenId === 'navigation') {
    setTimeout(() => {
      initDriverMap();
    }, 100);
  }
}

// ── Authentication & Initialization ──────────────────────────────────────────
async function initDriverSession() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: driverPhone })
    });
    if (res.ok) {
      const data = await res.json();
      driverToken = data.token;
      driverId = data.driver.id;
      driverName = data.driver.name;
      vehicleNo = data.driver.vehicleNo;
      isVerified = data.driver.isVerified;
      isOnDuty = data.driver.isOnDuty;

      localStorage.setItem('sahaay_driver_token', driverToken);
      localStorage.setItem('sahaay_driver_id', driverId);

      updateDriverUI();
      connectDriverWebSocket();
    }
  } catch (err) {
    console.warn('Driver login fallback:', err);
    connectDriverWebSocket();
  }
}

function updateDriverUI() {
  const nameElem = document.getElementById('driver-name');
  if (nameElem) nameElem.textContent = `Paramedic ${driverName}`;

  const statusBadge = document.getElementById('driver-status-badge');
  if (statusBadge) {
    statusBadge.textContent = isOnDuty ? 'AVAILABLE' : 'OFFLINE';
    statusBadge.className = isOnDuty 
      ? 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      : 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 border border-zinc-600';
  }

  const radar = document.getElementById('duty-radar');
  const dutyText = document.getElementById('duty-text');
  const dutyHint = document.getElementById('duty-hint');
  if (radar && dutyText) {
    if (isOnDuty) {
      radar.classList.add('active');
      dutyText.textContent = 'ON DUTY';
      dutyText.className = 'text-xs font-black tracking-widest text-emerald-400';
      if (dutyHint) dutyHint.textContent = 'GPS SCANNING ACTIVE';
    } else {
      radar.classList.remove('active');
      dutyText.textContent = 'OFFLINE';
      dutyText.className = 'text-xs font-black tracking-widest text-zinc-400';
      if (dutyHint) dutyHint.textContent = 'TELEMETRY PAUSED';
    }
  }
}

// ── Duty Toggle ──────────────────────────────────────────────────────────────
async function toggleDuty() {
  if (!isVerified) {
    const warning = document.getElementById('unverified-warning');
    if (warning) warning.classList.remove('hidden');
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Verification required by Ahmedabad EMS control');
    }
    return;
  }

  isOnDuty = !isOnDuty;
  updateDriverUI();

  try {
    await fetch(`${API_BASE}/api/driver/${driverId}/duty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnDuty })
    });
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast(isOnDuty ? 'On-Duty: Listening for emergencies' : 'Off-Duty: Telemetry paused');
    }
  } catch (e) {
    console.warn('Duty sync error:', e);
  }
}

// ── WebSocket Connection & Targeted Offers ───────────────────────────────────
function connectDriverWebSocket() {
  if (driverWs) {
    try { driverWs.close(); } catch (e) {}
    driverWs = null;
  }

  let wsUrl = (API_BASE.replace(/^http/, 'ws')) + `/?role=driver&ambulanceId=${driverId}`;
  if (driverToken) {
    wsUrl += `&token=${driverToken}`;
  }

  try {
    driverWs = new WebSocket(wsUrl);
    driverWs.onopen = () => console.log('Driver WS connected as', driverId);
    driverWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'DRIVER_OFFER') {
          handleIncomingOffer(msg);
        } else if (msg.type === 'OFFER_CANCELLED') {
          handleOfferCancelled(msg);
        }
      } catch (err) {
        console.warn('Driver WS error:', err);
      }
    };
    driverWs.onclose = () => {
      setTimeout(connectDriverWebSocket, 5000);
    };
  } catch (e) {
    console.warn('Driver WS fail:', e);
  }
}

function handleIncomingOffer(msg) {
  if (!isOnDuty) return;
  activeMissionId = msg.missionId;

  if (msg.patientLat && msg.patientLon) {
    activePatientCoords = { lat: msg.patientLat, lon: msg.patientLon };
  }

  const locElem = document.getElementById('offer-location');
  const distElem = document.getElementById('offer-distance');
  const etaElem = document.getElementById('offer-eta');

  if (locElem) locElem.textContent = msg.locality || 'Navrangpura, Ahmedabad';
  if (distElem && msg.distanceM) distElem.textContent = `${(msg.distanceM / 1000).toFixed(1)} km`;
  if (etaElem && msg.etaSeconds) etaElem.textContent = `${Math.ceil(msg.etaSeconds / 60)} min`;

  const modal = document.getElementById('incoming-offer-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.vibrate) {
      window.SaHaayDriverBridge.vibrate(800);
    }
  }
}

function handleOfferCancelled(msg) {
  if (activeMissionId === msg.missionId) {
    const modal = document.getElementById('incoming-offer-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Offer cancelled: Assigned to closer unit');
    }
  }
}

function showSimulationOffer() {
  handleIncomingOffer({
    missionId: 'manual-test-01',
    locality: 'Navrangpura Cross, Ahmedabad',
    distanceM: 1400,
    etaSeconds: 180,
    patientLat: 23.0338,
    patientLon: 72.5850
  });
}

function declineIncomingMission() {
  const modal = document.getElementById('incoming-offer-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
    window.SaHaayDriverBridge.showToast('Mission offer declined');
  }
  if (activeMissionId) {
    const headers = { 'Content-Type': 'application/json' };
    if (driverToken) headers['Authorization'] = `Bearer ${driverToken}`;
    fetch(`${API_BASE}/missions/${activeMissionId}/decline`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ambulanceId: driverId })
    }).catch(e => console.warn('Decline error:', e));
  }
}

async function acceptIncomingMission() {
  const modal = document.getElementById('incoming-offer-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (driverToken) headers['Authorization'] = `Bearer ${driverToken}`;

    const res = await fetch(`${API_BASE}/missions/${activeMissionId}/accept`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ambulanceId: driverId })
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.won) {
        if (window.SaHaayDriverBridge) {
          if (window.SaHaayDriverBridge.showToast) window.SaHaayDriverBridge.showToast('Mission Accepted! Navigating to patient...');
          if (window.SaHaayDriverBridge.vibrate) window.SaHaayDriverBridge.vibrate(400);
        }
        currentStageIndex = 0;
        updateStageUI();
        navigateTo('navigation');
        startTelemetryReporting();
        return;
      }
    }

    // HTTP 409 or won: false
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Mission expired or already assigned to another unit.');
    } else {
      alert('Mission expired or already assigned to another unit.');
    }
  } catch (err) {
    console.warn('Accept error:', err);
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Connection error accepting mission');
    }
  }
}

// ── Leaflet Navigation Map ───────────────────────────────────────────────────
function initDriverMap() {
  const mapElem = document.getElementById('driver-nav-map');
  if (!mapElem || typeof L === 'undefined') return;

  const targetCoords = currentStageIndex >= 2 ? civilHospitalCoords : activePatientCoords;

  if (!driverMap) {
    driverMap = L.map('driver-nav-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([currentDriverCoords.lat, currentDriverCoords.lon], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(driverMap);

    const ambIcon = L.divIcon({
      className: 'driver-amb-icon',
      html: '<div class="w-10 h-10 rounded-2xl bg-[#090d16] border-2 border-emerald-400 shadow-xl flex items-center justify-center text-lg text-emerald-400"><i class="bi bi-truck"></i></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    driverMarker = L.marker([currentDriverCoords.lat, currentDriverCoords.lon], { icon: ambIcon }).addTo(driverMap);

    const destIcon = L.divIcon({
      className: 'dest-marker-icon',
      html: '<div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs"><i class="bi bi-geo-alt-fill"></i></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    targetMarker = L.marker([targetCoords.lat, targetCoords.lon], { icon: destIcon }).addTo(driverMap);
  } else {
    driverMap.invalidateSize();
    if (driverMarker) driverMarker.setLatLng([currentDriverCoords.lat, currentDriverCoords.lon]);
    if (targetMarker) targetMarker.setLatLng([targetCoords.lat, targetCoords.lon]);
  }

  fetchDriverRoute(currentDriverCoords.lat, currentDriverCoords.lon, targetCoords.lat, targetCoords.lon);
}

async function fetchDriverRoute(startLat, startLon, endLat, endLon) {
  try {
    const res = await fetch(`${API_BASE}/api/routing/route?startLat=${startLat}&startLon=${startLon}&endLat=${endLat}&endLon=${endLon}`);
    if (res.ok) {
      const data = await res.json();
      if (data.coordinates && data.coordinates.length && driverMap) {
        if (routePolyline) driverMap.removeLayer(routePolyline);
        routePolyline = L.polyline(data.coordinates, {
          color: '#eb3824',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 6'
        }).addTo(driverMap);

        if (driverMarker && targetMarker) {
          const bounds = L.latLngBounds([driverMarker.getLatLng(), targetMarker.getLatLng()]);
          driverMap.fitBounds(bounds.pad(0.2));
        }
      }
    }
  } catch (err) {
    console.warn('Driver route polyline error:', err);
  }
}

// ── Live Telemetry Reporting ─────────────────────────────────────────────────
function startTelemetryReporting() {
  if (telemetryTimer) clearInterval(telemetryTimer);
  telemetryTimer = setInterval(async () => {
    if (!activeMissionId) {
      clearInterval(telemetryTimer);
      return;
    }

    // Step driver slightly toward target for visible live movement
    const target = currentStageIndex >= 2 ? civilHospitalCoords : activePatientCoords;
    const dLat = (target.lat - currentDriverCoords.lat) * 0.08;
    const dLon = (target.lon - currentDriverCoords.lon) * 0.08;
    currentDriverCoords.lat += dLat;
    currentDriverCoords.lon += dLon;

    if (driverMarker) {
      driverMarker.setLatLng([currentDriverCoords.lat, currentDriverCoords.lon]);
    }

    try {
      await fetch(`${API_BASE}/ambulances/${driverId}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: currentDriverCoords.lat,
          lon: currentDriverCoords.lon,
          heading: 45,
          speedKmh: 42
        })
      });
    } catch (e) {}
  }, 3000);
}

// ── Stage Progression ────────────────────────────────────────────────────────
function updateStageUI() {
  const stage = STAGES[currentStageIndex];
  const badge = document.getElementById('nav-stage-badge');
  const actionBtn = document.getElementById('stage-action-btn');
  if (badge) badge.textContent = stage.name;
  if (actionBtn) actionBtn.innerHTML = `<span>${stage.nextAction}</span><i class="bi bi-arrow-right ms-1"></i>`;
}

async function advanceMissionStage() {
  currentStageIndex++;
  if (currentStageIndex >= STAGES.length) {
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Handover complete! Mission closed.');
    }
    if (telemetryTimer) clearInterval(telemetryTimer);
    activeMissionId = null;
    navigateTo('home');
    return;
  }

  const stage = STAGES[currentStageIndex];
  updateStageUI();

  try {
    await fetch(`${API_BASE}/missions/${activeMissionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: stage.status })
    });
  } catch (err) {
    console.warn('Status patch err:', err);
  }

  if (stage.status === 'TRANSPORTING') {
    // Re-route toward civil hospital
    initDriverMap();
  }
}

// ── Vehicle Breakdown Reporting ──────────────────────────────────────────────
function openBreakdownModal() {
  const modal = document.getElementById('breakdown-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeBreakdownModal() {
  const modal = document.getElementById('breakdown-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function confirmVehicleBreakdown() {
  closeBreakdownModal();
  if (telemetryTimer) clearInterval(telemetryTimer);

  try {
    await fetch(`${API_BASE}/missions/${activeMissionId}/breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: driverId })
    });
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Breakdown reported! Automatic replacement re-dispatched.');
    }
    activeMissionId = null;
    navigateTo('home');
  } catch (e) {
    console.error('Breakdown error:', e);
  }
}

function openPatientModal() {
  alert('Patient Intake Info:\nName: Aarav Patel (Male, 32)\nBlood Group: B+\nCondition: Diabetic, head trauma laceration\nAllergies: Penicillin');
}

function toggleGatewayMode() {
  const label = document.getElementById('gateway-status-label');
  const btn = document.getElementById('gateway-toggle-btn');
  if (label && label.textContent.includes('OFF')) {
    label.textContent = 'GW: RELAY ON';
    btn.className = 'px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-[9px] font-semibold text-emerald-400 flex items-center gap-1';
  } else if (label) {
    label.textContent = 'GW: OFF';
    btn.className = 'px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[9px] font-semibold text-slate-400 flex items-center gap-1';
  }
}

// Init
initDriverSession();
