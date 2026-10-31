/**
 * mobile-app/src/screens/citizen/CitizenSosScreen.tsx
 * STRICT reproduction of design-references/stitch_sahaay/03_citizen_sos/code.html
 * Mock device chrome (fake status bar and home indicator) removed per instruction.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';

interface Props {
  onNavigate: (view: 'sos' | 'tracking' | 'driver') => void;
}

export const CitizenSosScreen: React.FC<Props> = ({ onNavigate }) => {
  const { triggerSos, call112, simulateCrashImpact } = useApp();

  const handleSos = () => {
    triggerSos();
    onNavigate('tracking');
  };

  return (
    <main className="relative w-full max-w-[390px] h-full min-h-[100dvh] bg-[#090d16] text-white flex flex-col justify-between overflow-hidden select-none mx-auto">
      {/* Background subtle radial ambient gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[8%] left-[20%] w-[280px] h-[280px] bg-blue-900/15 rounded-full blur-[80px]"></div>
        <div className="absolute top-[35%] right-[5%] w-[240px] h-[240px] bg-sky-950/20 rounded-full blur-[90px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[220px] bg-[#0c1a2e]/40 rounded-full blur-[70px]"></div>
      </div>

      {/* BEGIN: Header Navigation Area */}
      <div className="relative z-10 px-7 pt-4 flex items-center justify-between">
        {/* Background Concentric Circles Artwork on Left */}
        <div className="relative w-14 h-14 flex items-center justify-center opacity-30">
          <div className="absolute w-12 h-12 rounded-full border border-sky-400/40"></div>
          <div className="absolute w-7 h-7 rounded-full border border-sky-300/30"></div>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-sky-200/25"></div>
        </div>
        {/* Section Title */}
        <h1 className="text-sm font-medium text-slate-400 tracking-wide">Emergency</h1>
        {/* Green Add Action Button */}
        <button
          onClick={() => simulateCrashImpact(2.8)}
          aria-label="Add contact or device"
          className="w-11 h-11 bg-neonGreen rounded-full flex items-center justify-center text-slate-950 font-semibold green-floating-btn active:scale-95 transition-transform duration-150 cursor-pointer"
          type="button"
        >
          <svg className="w-5 h-5 text-gray-900 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>
      </div>
      {/* END: Header Navigation Area */}

      {/* BEGIN: Central Emergency Widget Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 mt-2">
        {/* Outer 3D Squircle Beveled Plate */}
        <div className="w-[245px] h-[245px] plate-bezel rounded-[44px] p-3.5 flex items-center justify-center relative">
          {/* Inner Well */}
          <div className="w-full h-full plate-inner rounded-[34px] p-2.5 flex flex-col justify-between items-stretch">
            {/* Top 112 Dial Button */}
            <button
              onClick={call112}
              className="w-full h-[88px] bg-white rounded-[22px] flex items-center justify-center btn-top-white active:opacity-90 active:scale-[0.98] transition cursor-pointer"
              type="button"
            >
              <span className="text-[44px] font-bold text-black tracking-tight leading-none font-sans">112</span>
            </button>
            {/* Bottom SOS Action Button */}
            <button
              onClick={handleSos}
              className="w-full h-[88px] btn-bottom-sos rounded-[22px] flex items-center justify-center active:opacity-90 active:scale-[0.98] transition cursor-pointer"
              type="button"
            >
              <span className="text-[38px] font-extrabold text-white tracking-wider leading-none">SOS</span>
            </button>
          </div>
        </div>
        {/* Carousel Pagination Dots */}
        <div className="flex items-center space-x-2 mt-7">
          <span className="w-1 h-1 rounded-full bg-slate-600 block"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-white block shadow-sm"></span>
          <span className="w-1 h-1 rounded-full bg-slate-600 block"></span>
          <span className="w-1 h-1 rounded-full bg-slate-600 block"></span>
        </div>
      </section>
      {/* END: Central Emergency Widget Section */}

      {/* BEGIN: Menu Navigation List Card */}
      <section className="relative z-10 px-5 mb-3">
        <div className="bg-[#0f1726]/85 backdrop-blur-md rounded-[28px] p-2 border border-slate-800/80 shadow-lg space-y-1">
          {/* Menu Item 1: My device */}
          <a
            onClick={(e) => { e.preventDefault(); simulateCrashImpact(2.8); }}
            className="flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-slate-800/40 active:bg-slate-800/60 transition group cursor-pointer"
            href="#my-device"
          >
            <div className="flex items-center space-x-3.5">
              {/* Icon */}
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-200">
                <svg className="w-5 h-5 stroke-[1.6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect height="16" rx="5" width="16" x="4" y="4"></rect>
                  <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              {/* Label */}
              <span className="text-[15px] font-medium text-slate-200">My device</span>
            </div>
            {/* Chevron Arrow */}
            <svg className="w-4 h-4 text-slate-500 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </a>
          {/* Menu Item 2: Archive */}
          <a
            onClick={(e) => { e.preventDefault(); onNavigate('tracking'); }}
            className="flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-slate-800/40 active:bg-slate-800/60 transition group cursor-pointer"
            href="#archive"
          >
            <div className="flex items-center space-x-3.5">
              {/* Icon */}
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-200">
                <svg className="w-5 h-5 stroke-[1.6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect height="16" rx="4" width="16" x="4" y="4"></rect>
                  <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round"></path>
                </svg>
              </div>
              {/* Label */}
              <span className="text-[15px] font-medium text-slate-200">Archive</span>
            </div>
            {/* Chevron Arrow */}
            <svg className="w-4 h-4 text-slate-500 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </a>
        </div>
      </section>
      {/* END: Menu Navigation List Card */}

      {/* BEGIN: Bottom Tab Navigation Bar */}
      <nav className="relative z-10 w-full px-6 pt-2 pb-7 bg-gradient-to-t from-[#05080f] via-[#090e18] to-transparent">
        <div className="flex items-center justify-between px-2">
          {/* Tab: Map */}
          <a
            onClick={(e) => { e.preventDefault(); onNavigate('tracking'); }}
            className="flex flex-col items-center group space-y-1.5 cursor-pointer"
            href="#map"
          >
            <div className="text-slate-400 group-hover:text-white transition">
              <svg className="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect height="16" rx="4" strokeDasharray="2 2" width="16" x="4" y="4"></rect>
                <circle cx="12" cy="12" fill="currentColor" r="1.5"></circle>
              </svg>
            </div>
            <span className="text-[11px] font-normal text-slate-400 group-hover:text-white">Map</span>
          </a>
          {/* Tab: Feed */}
          <a
            onClick={(e) => { e.preventDefault(); onNavigate('driver'); }}
            className="flex flex-col items-center group space-y-1.5 cursor-pointer"
            href="#feed"
          >
            <div className="text-slate-400 group-hover:text-white transition">
              <svg className="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect height="4" rx="2" width="14" x="5" y="6"></rect>
                <rect height="4" rx="2" width="14" x="5" y="14"></rect>
              </svg>
            </div>
            <span className="text-[11px] font-normal text-slate-400 group-hover:text-white">Feed</span>
          </a>
          {/* Tab: Chat */}
          <a
            onClick={(e) => { e.preventDefault(); }}
            className="flex flex-col items-center group space-y-1.5 cursor-pointer"
            href="#chat"
          >
            <div className="text-slate-400 group-hover:text-white transition">
              <svg className="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
            <span className="text-[11px] font-normal text-slate-400 group-hover:text-white">Chat</span>
          </a>
          {/* Elevated Floating Tab Button: Layers/Stack -> Toggles Driver Dispatch */}
          <button
            onClick={() => onNavigate('driver')}
            aria-label="Layers view"
            className="w-11 h-11 bg-white rounded-full flex items-center justify-center bottom-white-action active:scale-95 transition-transform duration-150 cursor-pointer"
            type="button"
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6.5 7.5L12 4.5l5.5 3-5.5 3-5.5-3z" strokeLinecap="round" strokeLinejoin="round"></path>
              <path d="M6.5 12L12 15l5.5-3" strokeLinecap="round" strokeLinejoin="round"></path>
              <path d="M6.5 16.5L12 19.5l5.5-3" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
        </div>
      </nav>
      {/* END: Bottom Tab Navigation Bar */}
    </main>
  );
};
