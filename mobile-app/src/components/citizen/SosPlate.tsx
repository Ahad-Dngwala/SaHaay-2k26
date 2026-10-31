/**
 * mobile-app/src/components/citizen/SosPlate.tsx
 * Tactile Squircle 3D Plate with 112 and SOS action buttons
 * Faithful reproduction of Stitch reference 03_citizen_sos/code.html & screen.png.
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PhoneCall, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const SosPlate: React.FC = () => {
  const { triggerSos, call112, isSosLoading, activeMission } = useApp();
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<any>(null);

  // Press-and-hold safety mechanism (holds for 800ms to confirm SOS, prevents accidental pocket dispatch)
  const startPress = () => {
    if (activeMission || isSosLoading) return;
    setIsPressing(true);
    setPressProgress(0);

    const startTime = Date.now();
    const duration = 800; // ms to trigger

    pressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setPressProgress(progress);

      if (elapsed >= duration) {
        clearInterval(pressTimer.current);
        setIsPressing(false);
        setPressProgress(0);
        triggerSos();
      }
    }, 40);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearInterval(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressing(false);
    setPressProgress(0);
  };

  return (
    <div className="flex flex-col items-center justify-center my-4">
      {/* Outer 3D Squircle Beveled Plate */}
      <div className="w-[260px] h-[260px] rounded-[48px] p-3.5 flex items-center justify-center relative bg-gradient-to-b from-[#182030] to-[#0d131f] shadow-plate-bezel border border-white/10">
        {/* Inner Well */}
        <div className="w-full h-full rounded-[38px] p-2.5 flex flex-col justify-between items-stretch bg-gradient-to-b from-[#0a0f18] to-[#111927] shadow-plate-inner border border-black/80">
          {/* Top 112 Dial Button */}
          <button
            type="button"
            onClick={call112}
            className="w-full h-[96px] bg-white rounded-[24px] flex flex-col items-center justify-center shadow-btn-white-tactile active:translate-y-1 active:shadow-none transition-all group"
            aria-label="Direct Call Police & Emergency Hotline 112"
          >
            <div className="flex items-center space-x-2">
              <PhoneCall className="w-5 h-5 text-neutral-800" />
              <span className="text-[44px] font-bold text-black tracking-tight leading-none font-sans">
                112
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider -mt-0.5">
              Govt Emergency Hotline
            </span>
          </button>

          {/* Bottom SOS Action Button */}
          <button
            type="button"
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            disabled={isSosLoading || !!activeMission}
            className={`w-full h-[96px] rounded-[24px] flex flex-col items-center justify-center relative overflow-hidden transition-all shadow-btn-tactile active:translate-y-1 active:shadow-none ${
              activeMission
                ? 'bg-emerald-700 opacity-90'
                : isSosLoading
                ? 'bg-neutral-800 opacity-80'
                : 'bg-gradient-to-b from-[#e03120] to-[#B42318]'
            }`}
            aria-label="Dispatch Ambulance SOS"
          >
            {/* Hold progress ring indicator */}
            {isPressing && (
              <div
                className="absolute inset-0 bg-white/20 transition-all pointer-events-none"
                style={{ width: `${pressProgress}%` }}
              />
            )}

            {activeMission ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1.5 text-white">
                  <CheckCircle2 className="w-5 h-5 text-white animate-pulse" />
                  <span className="text-[28px] font-black tracking-wider leading-none">
                    ACTIVE
                  </span>
                </div>
                <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider mt-1">
                  Ambulance Dispatched
                </span>
              </div>
            ) : isSosLoading ? (
              <div className="flex flex-col items-center">
                <span className="text-[26px] font-black text-white tracking-wider animate-pulse">
                  LOCATING...
                </span>
                <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider mt-1">
                  Searching 500m Radius
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-6 h-6 text-white" />
                  <span className="text-[40px] font-extrabold text-white tracking-widest leading-none">
                    SOS
                  </span>
                </div>
                <span className="text-[10px] text-red-100/90 font-bold uppercase tracking-wider -mt-0.5">
                  {isPressing ? `HOLD TO CONFIRM (${pressProgress}%)` : 'HOLD TO DISPATCH AMBULANCE'}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Pagination dots from reference */}
      <div className="flex items-center space-x-2 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 block" />
        <span className="w-2 h-2 rounded-full bg-white block shadow-sm" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 block" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 block" />
      </div>
    </div>
  );
};

