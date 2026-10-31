// apps/citizen-app/assets/app.js
// SaHaay Citizen Native App Logic

// Check if running on Android emulator (10.0.2.2) or desktop browser (localhost)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : 'http://10.0.2.2:3000';

let activeMissionId = null;
let holdTimer = null;
let countdownInterval = null;
let countdownSeconds = 30;
let isDispatching = false;

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

  if (screenId === 'updates') fetchUpdates();
}

function call112() {
  if (window.SaHaayNativeBridge && window.SaHaayNativeBridge.showToast) {
    window.SaHaayNativeBridge.showToast('Connecting to 112 Government Hotline...');
    if (window.SaHaayNativeBridge.vibrate) window.SaHaayNativeBridge.vibrate(200);
  } else {
    alert('Calling 112 National Emergency Hotline [Simulated Native Call]');
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

async function executeSosDispatch() {
  if (isDispatching) return;
  isDispatching = true;
  const subtext = document.getElementById('sos-btn-subtext');
  if (subtext) subtext.textContent = 'DISPATCHING...';

  try {
    const res = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 23.0338,
        lon: 72.5850,
        flags: 0,
        sosUid: `cit-manual-${Date.now()}`
      })
    });
    const data = await res.json();
    if (data.ok && data.missionId) {
      activeMissionId = data.missionId;
      if (window.SaHaayNativeBridge) {
        if (window.SaHaayNativeBridge.showToast) window.SaHaayNativeBridge.showToast(`SOS Dispatched! Mission ${data.missionId}`);
        if (window.SaHaayNativeBridge.vibrate) window.SaHaayNativeBridge.vibrate(400);
      }
      navigateTo('tracking');
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

// ── Mission Tracking Telemetry ───────────────────────────────────────────────
function startMissionPolling(missionId) {
  let step = 0;
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/missions/${missionId}`);
      if (res.ok) {
        const m = await res.json();
        if (m.assignedAmbulanceId) {
          const driverElem = document.getElementById('tracking-driver-name');
          const vehicleElem = document.getElementById('tracking-vehicle-no');
          if (driverElem) driverElem.textContent = m.assignedDriverName || 'Ramesh Patel';
          if (vehicleElem) vehicleElem.textContent = `${m.assignedVehicleNo || 'GJ-01-AX-4020'} • ALS Unit`;
        }
        if (m.status === 'COMPLETED') {
          const etaElem = document.getElementById('tracking-eta');
          const progBar = document.getElementById('tracking-progress-bar');
          if (etaElem) {
            etaElem.textContent = 'ARRIVED';
            etaElem.className = 'text-sm font-extrabold text-emerald-600';
          }
          if (progBar) {
            progBar.style.width = '100%';
            progBar.className = 'h-full bg-emerald-500 rounded-full transition-all duration-1000';
          }
          clearInterval(interval);
          return;
        }
      }
    } catch (e) {}

    step++;
    const eta = Math.max(1, 5 - step);
    const etaElem = document.getElementById('tracking-eta');
    if (etaElem) etaElem.textContent = `${eta} min`;
    const progress = Math.min(95, 60 + step * 7);
    const progBar = document.getElementById('tracking-progress-bar');
    if (progBar) progBar.style.width = `${progress}%`;

    const marker = document.getElementById('ambulance-marker');
    if (marker) {
      marker.style.top = `${75 + step * 25}px`;
      marker.style.left = `${125 + step * 18}px`;
    }

    if (step >= 5) clearInterval(interval);
  }, 3000);
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
