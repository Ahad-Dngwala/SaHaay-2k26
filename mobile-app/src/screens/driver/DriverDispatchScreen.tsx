/**
 * mobile-app/src/screens/driver/DriverDispatchScreen.tsx
 * STRICT reproduction of design-references/stitch_sahaay/04_driver_dispatch/code.html
 * Mock device chrome (fake status bar and home indicator) removed per instruction.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface Props {
  onNavigate: (view: 'sos' | 'tracking' | 'driver') => void;
}

export const DriverDispatchScreen: React.FC<Props> = ({ onNavigate }) => {
  const {
    activeDriverMission,
    incomingOffer,
    acceptIncomingMission,
    declineIncomingMission,
    updateMissionProgress,
    setBreakdownModalOpen,
  } = useApp();

  const [sirenActive, setSirenActive] = useState(false);
  const [triageChecklistOpen, setTriageChecklistOpen] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);

  const mission = activeDriverMission || incomingOffer;

  const incidentId = mission?.id ? `#${mission.id.slice(-4).toUpperCase()}` : '#8841';
  const incidentTitle = mission?.incidentDiagnosis || 'Critical Cardiac Distress & Rapid Transport';
  const etaMinutes = mission?.etaMinutes ?? 6;
  const distanceKm = mission?.distanceKm ?? 4.2;
  const locality = mission?.localityName || 'MG Road, Sector 4';
  const patientName = mission?.patientName || 'Vikram Malhotra, 58';
  const vitalsText = mission?.vitals
    ? `SpO2: ${mission.vitals.spO2}% • BP: ${mission.vitals.bp}`
    : 'SpO2: 88% • BP: 165/100';

  return (
    <main className="w-full max-w-[420px] h-full min-h-[100dvh] bg-black text-white relative flex flex-col justify-between overflow-hidden select-none mx-auto">
      {/* BEGIN: TopBar */}
      <header className="pt-3 px-6 pb-2 z-20 flex-shrink-0" data-purpose="status-and-top-navigation">
        {/* App Header Icon Row */}
        <div className="flex items-center justify-between mt-1">
          {/* Brand Glyph & Status Indicator */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center border border-neutral-800 text-white font-black text-lg tracking-tighter">
              <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 512 512">
                <path d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">SaHaay EMS</div>
              <div className="flex items-center space-x-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-white tracking-tight">Active Unit 402</span>
              </div>
            </div>
          </div>
          {/* Top Right Actions: Search & Notifications */}
          <div className="flex items-center space-x-2.5">
            <button aria-label="Search units" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-300 active:scale-95 transition-transform cursor-pointer">
              <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            <div className="relative">
              <button aria-label="View notifications" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-300 active:scale-95 transition-transform cursor-pointer">
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </button>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-black"></span>
            </div>
          </div>
        </div>
      </header>
      {/* END: TopBar */}

      {/* BEGIN: ResponderStatusCarousel */}
      <section className="px-5 py-2 z-10 flex-shrink-0" data-purpose="active-paramedic-squad">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1">
          {/* Unit Card 1 (Active Driver / You) */}
          <div className="flex flex-col items-center flex-shrink-0 w-16">
            <div className="avatar-ring-glow w-14 h-14 rounded-2xl p-[2.5px] mb-1">
              <div className="relative w-full h-full bg-neutral-900 rounded-[14px] overflow-hidden z-10 flex items-center justify-center">
                <span className="font-bold text-sm text-neutral-200">YOU</span>
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-neutral-900"></span>
              </div>
            </div>
            <span className="text-[10px] text-neutral-300 font-semibold tracking-tight truncate w-full text-center">En Route</span>
          </div>
          {/* Unit Card 2 */}
          <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-85">
            <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
              <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
                <svg className="w-4 h-4 text-red-400 fill-current mb-0.5" viewBox="0 0 24 24"><path d="M19 8h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h1c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1c.55 0 1-.45 1-1v-4.68c0-.52-.2-1.02-.57-1.39L19 8z"/></svg>
                <span className="text-[9px] font-bold text-neutral-400">AMB-12</span>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">Dr. Roy</span>
          </div>
          {/* Unit Card 3 */}
          <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-85">
            <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
              <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
                <svg className="w-4 h-4 text-amber-400 fill-current mb-0.5" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span className="text-[9px] font-bold text-neutral-400">MED-04</span>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">Triage B</span>
          </div>
          {/* Unit Card 4 */}
          <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-85">
            <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
              <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
                <svg className="w-4 h-4 text-sky-400 fill-current mb-0.5" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>
                <span className="text-[9px] font-bold text-neutral-400">ICU-08</span>
              </div>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">Metro Gen</span>
          </div>
          {/* Unit Card 5 */}
          <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-60">
            <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
              <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
                <svg className="w-4 h-4 text-neutral-500 fill-current mb-0.5" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                <span className="text-[9px] font-bold text-neutral-500">STANDBY</span>
              </div>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium truncate w-full text-center">Reserve</span>
          </div>
        </div>
      </section>
      {/* END: ResponderStatusCarousel */}

      {/* BEGIN: MainDispatchBody */}
      <div className="flex-1 px-4 py-2 flex flex-col relative overflow-hidden" data-purpose="mission-container">
        {/* Primary Emergency Dispatch Card (High contrast white surface) */}
        <article className="bg-white text-black rounded-[36px] p-6 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden">
          {/* Header Info Inside White Card */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10-2h4v2h-4V4zm6 11h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z"/></svg>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Code Red Priority</span>
                </div>
                <h2 className="text-sm font-bold text-neutral-900 tracking-tight mt-0.5">Triage Incident {incidentId}</h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-sans text-neutral-900 tracking-tighter">{distanceKm}</span>
              <span className="text-xs font-semibold text-neutral-500 block -mt-1">km away</span>
            </div>
          </div>

          {/* Big Bold Display Typography */}
          <div className="my-4">
            <p className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Incident Diagnosis</p>
            <h1 className="headline-font text-[30px] font-extrabold text-neutral-950 leading-[1.05]">
              {incidentTitle}
            </h1>
            <div className="flex items-center space-x-3 mt-4 text-xs font-semibold text-neutral-600">
              <span className="flex items-center space-x-1 bg-neutral-100 px-2.5 py-1.5 rounded-xl">
                <svg className="w-3.5 h-3.5 fill-current text-neutral-900" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span className="text-neutral-900">ETA: {etaMinutes} mins</span>
              </span>
              <span className="flex items-center space-x-1 bg-neutral-100 px-2.5 py-1.5 rounded-xl">
                <svg className="w-3.5 h-3.5 fill-current text-neutral-900" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                <span className="text-neutral-900">{locality}</span>
              </span>
            </div>
          </div>

          {/* Route & Patient Mini Ticker within White Card */}
          <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">{patientName}</p>
                <p className="text-[10px] font-medium text-neutral-500">{vitalsText}</p>
              </div>
            </div>
            {/* Quick Navigation Trigger */}
            <button
              onClick={() => onNavigate('tracking')}
              aria-label="Open GPS Map"
              className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow hover:bg-neutral-800 active:scale-95 transition-transform cursor-pointer"
            >
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            </button>
          </div>
        </article>

        {/* BEGIN: StackedFloatingActionCluster */}
        <aside className="absolute right-7 bottom-8 flex flex-col items-center space-y-2.5 z-30" data-purpose="floating-action-column">
          {/* Quick Action 1: Siren/Audio Alert */}
          <button
            onClick={() => setSirenActive(!sirenActive)}
            aria-label="Toggle Siren"
            className={`w-11 h-11 rounded-full text-white border flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer ${
              sirenActive ? 'bg-amber-500 border-amber-300 animate-pulse' : 'bg-neutral-950/90 border-neutral-800'
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          </button>
          {/* Quick Action 2: Direct Doctor Dispatch Call */}
          <button
            onClick={() => alert('Calling Hospital Emergency Dispatch... (DEMO)')}
            aria-label="Call Hospital"
            className="w-11 h-11 rounded-full bg-neutral-950/90 text-white border border-neutral-800 flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.053 15.053 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.01A11.36 11.36 0 018.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z"/></svg>
          </button>
          {/* Quick Action 3: Fast Triage Checklist */}
          <button
            onClick={() => setTriageChecklistOpen(!triageChecklistOpen)}
            aria-label="Triage Checklist"
            className="w-11 h-11 rounded-full bg-neutral-950/90 text-white border border-neutral-800 flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
          >
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect height="4" rx="1" width="8" x="8" y="2"></rect><path d="m9 14 2 2 4-4"></path></svg>
          </button>
          {/* Quick Action 4: Central Emergency Beacon / Breakdown Report */}
          <button
            onClick={() => setBreakdownModalOpen(true)}
            aria-label="SOS Alert"
            className="w-11 h-11 rounded-full bg-red-600 text-white border-2 border-white/20 flex items-center justify-center shadow-xl active:scale-90 transition-transform animate-pulse cursor-pointer"
          >
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </button>
        </aside>
        {/* END: StackedFloatingActionCluster */}
      </div>
      {/* END: MainDispatchBody */}

      {/* BEGIN: SecondaryUnitTile */}
      <section className="px-4 pb-2 z-10 flex-shrink-0" data-purpose="secondary-incoming-mission">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-amber-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Trauma Unit Queue</span>
                <span className="text-[9px] font-semibold bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-md">2 Pending</span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">Metro City Care: Bed 12 Reserved</p>
            </div>
          </div>
          <button
            onClick={() => setQueueModalOpen(true)}
            className="px-3.5 py-2 bg-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            View
          </button>
        </div>
      </section>
      {/* END: SecondaryUnitTile */}

      {/* BEGIN: BottomStickyNavigation */}
      <nav className="px-5 pt-1 pb-6 z-20 flex-shrink-0" data-purpose="bottom-pill-dock">
        <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-full py-2 px-3 flex items-center justify-between shadow-2xl">
          {/* Tab 1: Missions (Active) */}
          <button className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-full font-bold text-xs tracking-tight transition-all cursor-pointer">
            <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
            <span>Missions</span>
          </button>
          {/* Tab 2: Map -> Opens tracking */}
          <button
            onClick={() => onNavigate('tracking')}
            aria-label="Live Map"
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
          >
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
          </button>
          {/* Tab 3: Comms */}
          <button
            onClick={() => alert('Comms Channel: Active on Ch-4 (DEMO)')}
            aria-label="Comms Channel"
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform relative cursor-pointer"
          >
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          </button>
          {/* Tab 4: Profile / Unit Info -> Opens SOS view */}
          <button
            onClick={() => onNavigate('sos')}
            aria-label="Driver Profile"
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
          >
            <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
        </div>
      </nav>
      {/* END: BottomStickyNavigation */}
    </main>
  );
};
