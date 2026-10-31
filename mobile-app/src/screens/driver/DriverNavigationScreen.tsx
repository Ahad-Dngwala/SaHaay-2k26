/**
 * mobile-app/src/screens/driver/DriverNavigationScreen.tsx
 * Driver Turn-by-Turn GPS Navigation & Green Corridor Status Screen.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Navigation, Compass, AlertOctagon, CheckCircle2, ChevronRight, Gauge } from 'lucide-react';

export const DriverNavigationScreen: React.FC = () => {
  const {
    activeDriverMission,
    updateMissionProgress,
    setBreakdownModalOpen,
    setDriverTab,
    seedDemoScenario,
  } = useApp();

  const mission = activeDriverMission;

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-hidden bg-neutral-950 text-white pb-24 select-none">
      {/* Top Navigation Banner */}
      <div className="p-4 bg-neutral-900 border-b border-neutral-800 z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Turn-by-Turn GPS Guidance
            </span>
            <h2 className="text-sm font-bold text-white">
              {mission ? 'Navigating to Patient' : 'Navigation Standby'}
            </h2>
          </div>
        </div>

        {/* Speed Readout */}
        <div className="flex items-center space-x-1 bg-neutral-800 px-3 py-1.5 rounded-2xl border border-neutral-700/60">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-black font-mono text-white">42</span>
          <span className="text-[10px] text-neutral-400 font-bold">KM/H</span>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="flex-1 relative bg-[#121620] overflow-hidden flex items-center justify-center">
        {/* Animated Grid / Route Canvas */}
        <svg className="w-full h-full" viewBox="0 0 390 400" fill="none">
          {/* Road lines */}
          <line x1="195" y1="0" x2="195" y2="400" stroke="#252a36" strokeWidth="24" />
          <line x1="0" y1="200" x2="390" y2="200" stroke="#252a36" strokeWidth="24" />

          {/* Active Navigation Route */}
          <path
            d="M195 380 L195 200 L320 200"
            stroke="#1a6c42"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ambulance Position */}
          <circle cx="195" cy="290" r="14" fill="#B42318" stroke="#ffffff" strokeWidth="2" />
          <polygon points="195,282 190,296 200,296" fill="#ffffff" />

          {/* Target Junction Pin */}
          <circle cx="320" cy="200" r="10" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
        </svg>

        {/* Floating Turn Instruction Card */}
        <div className="absolute top-4 left-4 right-4 bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-xl shadow">
              ↱
            </div>
            <div>
              <p className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">
                In 250 Metres
              </p>
              <h3 className="text-base font-extrabold text-white">
                Turn Right onto Ashram Road
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
            CORRIDOR
          </span>
        </div>

        {/* Green Corridor Junction Notification Banner */}
        <div className="absolute bottom-4 left-4 right-4 bg-emerald-950/90 border border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-white">Green Corridor Advisory Clear</p>
              <p className="text-[10px] text-emerald-200/80">
                Paldi Crossroads signal pre-cleared for Unit 402
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded">
            ADVISORY
          </span>
        </div>
      </div>

      {/* Bottom Control Drawer */}
      <div className="p-4 bg-neutral-900 border-t border-neutral-800 space-y-2">
        {mission ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateMissionProgress('ON_SCENE')}
              className="flex-1 py-3 bg-[#1a6c42] hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow active:scale-95 transition-all"
            >
              Mark Arrived on Scene
            </button>
            <button
              onClick={() => setBreakdownModalOpen(true)}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl active:scale-95 transition-all"
              title="Report Breakdown"
            >
              <AlertOctagon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <button
              onClick={seedDemoScenario}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold active:scale-95"
            >
              Start Demo Navigation Mission
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

