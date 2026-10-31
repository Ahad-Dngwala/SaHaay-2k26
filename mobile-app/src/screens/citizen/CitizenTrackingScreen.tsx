/**
 * mobile-app/src/screens/citizen/CitizenTrackingScreen.tsx
 * STRICT reproduction of design-references/stitch_sahaay/02_citizen_tracking/code.html
 * Mock device chrome (fake status bar, dynamic island, home indicator) removed per instruction.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface Props {
  onNavigate: (view: 'sos' | 'tracking' | 'driver') => void;
}

export const CitizenTrackingScreen: React.FC<Props> = ({ onNavigate }) => {
  const { activeMission, assignedAmbulance, call112, setMessageModalOpen } = useApp();
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const driverName = assignedAmbulance?.driverName || 'James Harris';
  const etaMinutes = activeMission?.etaMinutes ?? 5;
  const etaText = activeMission?.status === 'ON_SCENE' ? 'Arrived' : `${etaMinutes} min`;

  return (
    <div className="relative w-full max-w-[393px] h-full min-h-[100dvh] bg-white overflow-hidden flex flex-col justify-between mx-auto select-none" data-purpose="mobile-container">
      {/* BEGIN: MapSection */}
      {/* Interactive-like vector rendered road map simulation */}
      <main className="relative w-full flex-1 map-background overflow-hidden" data-purpose="map-view">
        {/* Top Navigation Header */}
        <div className="absolute top-4 left-0 right-0 z-30 flex items-center px-5 pt-2">
          <button
            onClick={() => onNavigate('sos')}
            aria-label="Go back"
            className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-95 transition-all text-neutral-900 cursor-pointer"
            type="button"
          >
            <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
          <h1 className="text-base font-bold text-neutral-900 ml-3">Route View</h1>
        </div>

        {/* SVG Map Canvas (Roads, Blocks, Route Line & Pins) */}
        <svg className="absolute inset-0 w-full h-full" fill="none" viewBox="0 0 390 550" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* Subtle shadow for building/zone layers */}
            <filter height="110%" id="soft-shadow" width="110%" x="-5%" y="-5%">
              <feDropShadow dx="0" dy="1" floodColor="#000" floodOpacity="0.04" stdDeviation="1"></feDropShadow>
            </filter>
          </defs>
          {/* Land & Neighborhood Blobs */}
          <path d="M-20 60 L140 30 L170 120 L-10 160 Z" fill="#F8F9FA"></path>
          <path d="M180 20 L380 -10 L410 110 L190 140 Z" fill="#F8FAFC"></path>
          <path d="M210 160 L400 130 L420 300 L230 310 Z" fill="#FAFBFD"></path>
          <path d="M-10 240 L160 210 L180 390 L-10 420 Z" fill="#F8F9FA"></path>
          <path d="M190 340 L410 320 L400 520 L210 500 Z" fill="#FAFBFD"></path>
          {/* Minor Street Network (Light Gray Lines) */}
          <g stroke="#E8ECF2" strokeLinecap="round" strokeLinejoin="round">
            {/* A-Roads & Residential Lines */}
            <line stroke="#FFFFFF" strokeWidth="8" x1="-20" x2="420" y1="80" y2="40"></line>
            <line stroke="#E2E7EE" strokeOpacity="0.6" strokeWidth="10" x1="-20" x2="420" y1="80" y2="40"></line>
            <line stroke="#FFFFFF" strokeWidth="7" x1="80" x2="160" y1="0" y2="560"></line>
            <line stroke="#E2E7EE" strokeOpacity="0.5" strokeWidth="9" x1="80" x2="160" y1="0" y2="560"></line>
            <line stroke="#FFFFFF" strokeWidth="6" x1="160" x2="410" y1="120" y2="210"></line>
            <line stroke="#E2E7EE" strokeOpacity="0.6" strokeWidth="8" x1="160" x2="410" y1="120" y2="210"></line>
            <line stroke="#FFFFFF" strokeWidth="7" x1="-20" x2="420" y1="290" y2="230"></line>
            <line stroke="#E2E7EE" strokeOpacity="0.5" strokeWidth="9" x1="-20" x2="420" y1="290" y2="230"></line>
            <line stroke="#FFFFFF" strokeWidth="6" x1="60" x2="380" y1="360" y2="480"></line>
            <line stroke="#E2E7EE" strokeOpacity="0.6" strokeWidth="8" x1="60" x2="380" y1="360" y2="480"></line>
            {/* Diagonal Connectors */}
            <path d="M120 70 L240 220 L310 400" fill="none" stroke="#FFFFFF" strokeWidth="6"></path>
            <path d="M120 70 L240 220 L310 400" fill="none" stroke="#E2E7EE" strokeOpacity="0.6" strokeWidth="8"></path>
          </g>
          {/* Map Typography / Street & Suburb Labels (Ahmedabad Geocoding) */}
          <g fill="#9EA8B6" fontFamily="-apple-system, BlinkMacSystemFont, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.4">
            <text fill="#5F6C7B" fontSize="9" fontWeight="700" textAnchor="middle" x="100" y="160">NAVRANGPURA</text>
            <text fill="#5F6C7B" fontSize="8" fontWeight="700" textAnchor="middle" x="100" y="171">AHMEDABAD WEST</text>
            <text fontSize="7" textAnchor="start" transform="rotate(-15 160 195)" x="160" y="195">Ashram Rd</text>
            <text fill="#5F6C7B" fontSize="9" fontWeight="700" textAnchor="middle" x="320" y="195">USMANPURA</text>
            <text fill="#5F6C7B" fontSize="8" fontWeight="700" textAnchor="middle" x="320" y="206">RIVERFRONT</text>
            <text fontSize="7" textAnchor="middle" transform="rotate(35 105 300)" x="105" y="300">CG Road</text>
            <text fontSize="7" textAnchor="middle" transform="rotate(-15 300 240)" x="300" y="240">Ellisbridge Link</text>
            <text fill="#EA3836" fontSize="7" textAnchor="middle" transform="rotate(-25 120 275)" x="120" y="275">GJ-01</text>
            <text fill="#5F6C7B" fontSize="9" fontWeight="700" textAnchor="middle" x="105" y="505">PALDI</text>
            <text fill="#5F6C7B" fontSize="8" fontWeight="700" textAnchor="middle" x="105" y="516">BHATTHA</text>
            <text fill="#5F6C7B" fontSize="8.5" fontWeight="700" textAnchor="middle" x="330" y="475">ELLISBRIDGE</text>
            <text fill="#5F6C7B" fontSize="7.5" fontWeight="700" textAnchor="middle" x="330" y="485">VS HOSPITAL</text>
            <text fill="#5F6C7B" fontSize="7.5" fontWeight="700" textAnchor="middle" x="330" y="495">SECTOR</text>
            <text fontSize="7" textAnchor="middle" transform="rotate(-12 125 470)" x="125" y="470">Anjali Cross Rd</text>
            <text fontSize="6.5" transform="rotate(-90 95 415)" x="95" y="415">AMB-01</text>
          </g>
          {/* Red Active Navigation Path / Route */}
          <g>
            <path d="M130 162 L112 170 L115 220 L152 278 L152 295 L170 330 L168 348 L150 445" stroke="#EA3836" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5"></path>
            <path d="M130 162 L112 170 L115 220 L152 278 L152 295 L170 330 L168 348 L150 445" stroke="#FF6B6A" strokeDasharray="0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </g>
          {/* Patient Pin Location */}
          <g transform="translate(129, 142)">
            <path d="M0 0 C-5.5 0 -10 4.5 -10 10 C-10 17 0 26 0 26 C0 26 10 17 10 10 C10 4.5 5.5 0 0 0 Z" fill="#EA3836" filter="url(#soft-shadow)"></path>
            <circle cx="0" cy="9.5" fill="#FFFFFF" r="4.5"></circle>
          </g>
          {/* Ambulance Live Vehicle Marker */}
          <g transform="translate(150, 475)">
            <circle className="pulse-effect" cx="0" cy="0" fill="#EA3836" r="28"></circle>
            <g filter="url(#soft-shadow)">
              <rect fill="#EA3836" height="46" rx="9" stroke="#FFFFFF" strokeWidth="2.5" width="34" x="-17" y="-23"></rect>
              <rect fill="#D32F2F" height="9" rx="3" width="20" x="-10" y="-18"></rect>
              <path d="M-2 -3 H2 V-7 H5 V-3 H9 V1 H5 V5 H2 V1 H-2 Z" fill="#FFFFFF" transform="translate(-1.5, 3)"></path>
            </g>
          </g>
        </svg>
      </main>
      {/* END: MapSection */}

      {/* BEGIN: ArrivalDashboardCard */}
      {/* Crisp white floating modal sheet with ETA progress and driver credentials */}
      <section className="relative z-40 bg-white rounded-t-[32px] px-6 pt-5 pb-8 shadow-card border-t border-neutral-100 flex flex-col justify-between" data-purpose="arrival-card">
        {/* Card Drag Handle / Indicator */}
        <div
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-4 cursor-pointer"
        ></div>

        {/* ETA Status & Live Horizontal Progress Indicator */}
        <div className="mb-5" data-purpose="eta-status-block">
          <div className="flex justify-between items-baseline mb-2.5">
            <span className="text-[17px] font-bold text-neutral-900 tracking-tight">Arriving in</span>
            <span className="text-[17px] font-bold text-brand-red tracking-tight">{etaText}</span>
          </div>
          {/* Progress Track */}
          <div className="relative w-full h-[3px] bg-neutral-100 rounded-full flex items-center">
            {/* Active Filled Route Bar */}
            <div className="h-full bg-brand-red rounded-full w-[78%]"></div>
            {/* Moving Mini Ambulance Icon */}
            <div className="absolute left-[78%] -translate-x-1/2 -top-2 flex items-center justify-center">
              <div className="bg-brand-red text-white p-1 rounded-[5px] shadow-sm flex items-center justify-center">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 8h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h1c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1c.55 0 1-.45 1-1v-4.68c0-.52-.2-1.02-.57-1.39L19 8zm-8 4H9v2H7v-2H5v-2h2V8h2v2h2v2zm6 1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Profile and Instant Communication Action Buttons */}
        <div className="flex items-center justify-between pt-2" data-purpose="driver-info-block">
          {/* Paramedic Driver Identity */}
          <div className="flex items-center space-x-3.5">
            {/* Circular Driver Avatar */}
            <div className="relative">
              <img
                alt="James Harris"
                className="w-[52px] h-[52px] rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-neutral-200"
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
              />
            </div>
            {/* Name & Designation */}
            <div className="flex flex-col">
              <h2 className="text-[17px] font-bold text-neutral-900 leading-tight">{driverName}</h2>
              <p className="text-[13px] text-neutral-400 font-medium mt-0.5">Ambulance Driver</p>
            </div>
          </div>
          {/* Action Buttons: Voice Call & Text Message */}
          <div className="flex items-center space-x-3">
            {/* Call Button */}
            <button
              onClick={call112}
              aria-label="Call Ambulance Driver"
              className="w-[46px] h-[46px] rounded-full bg-brand-red text-white flex items-center justify-center shadow-btn active:scale-95 transition-transform hover:bg-[#d82e2c] cursor-pointer"
              type="button"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.053 15.053 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.01A11.36 11.36 0 018.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z"></path>
              </svg>
            </button>
            {/* Chat / SMS Button */}
            <button
              onClick={() => setMessageModalOpen(true)}
              aria-label="Message Ambulance Driver"
              className="w-[46px] h-[46px] rounded-full bg-brand-red text-white flex items-center justify-center shadow-btn active:scale-95 transition-transform hover:bg-[#d82e2c] cursor-pointer"
              type="button"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </section>
      {/* END: ArrivalDashboardCard */}
    </div>
  );
};
