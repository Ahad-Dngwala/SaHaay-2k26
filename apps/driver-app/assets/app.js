// apps/driver-app/assets/app.js
// SaHaay Ambulance Driver Native App Logic

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : 'http://10.0.2.2:3000';

let driverId = 'amb-01';
let isVerified = true;
let isOnDuty = true;
let activeMissionId = 'demo-mission-01';
let currentStageIndex = 0;

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
}

// ── Duty Toggle (Enforces Verification Gate) ─────────────────────────────────
async function toggleDutyStatus() {
  if (!isVerified) {
    const warning = document.getElementById('unverified-warning');
    if (warning) warning.classList.remove('hidden');
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Duty blocked: State driver verification required');
    } else {
      alert('Cannot activate on-duty: State verification required by Ahmedabad EMS control.');
    }
    return;
  }

  isOnDuty = !isOnDuty;
  const dome = document.getElementById('duty-radar-dome');
  const statusText = document.getElementById('duty-status-text');
  const hintText = document.getElementById('duty-hint');

  if (isOnDuty) {
    if (dome) dome.classList.add('active');
    if (statusText) statusText.textContent = 'ON DUTY';
    if (hintText) {
      hintText.textContent = 'GPS SCANNING ACTIVE';
      hintText.className = 'text-[8px] text-emerald-400 font-mono mt-2';
    }
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('On-Duty: Broadcaster scanning for Ahmedabad alerts');
    }
  } else {
    if (dome) dome.classList.remove('active');
    if (statusText) statusText.textContent = 'OFF DUTY';
    if (hintText) {
      hintText.textContent = 'STANDBY • TAP TO RESUME';
      hintText.className = 'text-[8px] text-slate-500 font-mono mt-2';
    }
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Off-Duty: Telemetry paused');
    }
  }

  try {
    await fetch(`${API_BASE}/api/driver/${driverId}/duty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnDuty })
    });
  } catch (e) {
    console.warn('Duty sync warning:', e);
  }
}

// ── Incoming Offer Modal ─────────────────────────────────────────────────────
function showSimulationOffer(locText) {
  const modal = document.getElementById('incoming-offer-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.vibrate) {
      window.SaHaayDriverBridge.vibrate(600);
    }
  }
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
    fetch(`${API_BASE}/missions/${activeMissionId}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/missions/${activeMissionId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: driverId })
    });
    const data = await res.json();
    if (data.won) {
      if (window.SaHaayDriverBridge) {
        if (window.SaHaayDriverBridge.showToast) window.SaHaayDriverBridge.showToast('Mission Accepted! Navigating to patient...');
        if (window.SaHaayDriverBridge.vibrate) window.SaHaayDriverBridge.vibrate(300);
      }
      navigateTo('navigation');
    }
  } catch (err) {
    console.warn('Accept fallback:', err);
    navigateTo('navigation');
  }
}

// ── Stage Progression ────────────────────────────────────────────────────────
async function advanceMissionStage() {
  currentStageIndex = (currentStageIndex + 1) % STAGES.length;
  const stage = STAGES[currentStageIndex];

  const badge = document.getElementById('nav-stage-badge');
  const actionBtn = document.getElementById('stage-action-btn');
  if (badge) badge.textContent = stage.name;
  if (actionBtn) actionBtn.innerHTML = `<span>${stage.nextAction}</span><i class="bi bi-arrow-right ms-1"></i>`;

  try {
    await fetch(`${API_BASE}/missions/${activeMissionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: stage.status })
    });
  } catch (e) {
    console.warn('Status update error:', e);
  }

  if (stage.status === 'COMPLETED') {
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Mission Completed! Handover to Civil Hospital complete.');
    } else {
      alert('Mission successfully completed! Patient handed over to Civil Hospital.');
    }
    currentStageIndex = 0;
    navigateTo('home');
  }
}

// ── Breakdown Reporting ──────────────────────────────────────────────────────
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
  try {
    await fetch(`${API_BASE}/missions/${activeMissionId}/breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId: driverId })
    });
    if (window.SaHaayDriverBridge && window.SaHaayDriverBridge.showToast) {
      window.SaHaayDriverBridge.showToast('Breakdown reported! Dispatch rerouting replacement ambulance.');
    } else {
      alert('Breakdown reported! SaHaay dispatch engine has automatically dispatched a replacement ambulance to the patient.');
    }
    navigateTo('home');
  } catch (e) {
    console.error('Breakdown error:', e);
  }
}

function openPatientModal() {
  alert('Patient Intake Info:\nName: Aarav Patel (Male, 32)\nBlood Group: B+\nCondition: Diabetic, head trauma laceration\nAllergies: Penicillin');
}

// ── Live Mission Offer Poller ────────────────────────────────────────────────
setInterval(async () => {
  if (!isOnDuty) return;
  try {
    const res = await fetch(`${API_BASE}/missions`);
    if (res.ok) {
      const missions = await res.json();
      const myOffer = missions.find(m => m.status === 'DISPATCHING' && m.pendingOffers && m.pendingOffers.includes(driverId));
      if (myOffer && activeMissionId !== myOffer.id) {
        activeMissionId = myOffer.id;
        showSimulationOffer();
      }
    }
  } catch (e) {}
}, 2500);
