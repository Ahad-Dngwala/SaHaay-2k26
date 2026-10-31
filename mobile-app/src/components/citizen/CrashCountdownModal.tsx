/**
 * mobile-app/src/components/citizen/CrashCountdownModal.tsx
 * 30-Second Crash Detection Countdown Overlay (DESIGN.md & M4).
 * Enforces exactly-once safety guarantee with prominent "I'm Safe — Cancel Alert" CTA.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { Config } from '../../config';

export const CrashCountdownModal: React.FC = () => {
  const { crashState, cancelCrashAlert, triggerSos } = useApp();

  if (crashState.status !== 'COUNTDOWN_ACTIVE') {
    return null;
  }

  const seconds = crashState.secondsRemaining;
  const total = Config.COUNTDOWN_SEC;
  const progressPercent = Math.max(0, Math.min(100, (seconds / total) * 100));

  // Circumference for 120px circle (r=52 -> circumference ≈ 326.7)
  const radius = 52;
  const strokeDashoffset = 326.7 - (progressPercent / 100) * 326.7;

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16]/95 backdrop-blur-lg flex items-center justify-center p-5 select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center animate-scaleUp">
        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full mb-1">
          High-G Impact Detected ({crashState.impactG.toFixed(1)}g)
        </span>

        <h1 className="text-xl font-black text-white mt-1">Severe Crash Alert</h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-[280px]">
          Stillness filter verified post-impact. Emergency ambulance will auto-dispatch when countdown reaches zero.
        </p>

        {/* 120px Radial Progress Ring with Tabular Numeral Display */}
        <div className="relative w-36 h-36 my-6 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Animated Countdown Ring */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#B42318"
              strokeWidth="8"
              strokeDasharray="326.7"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Centered Large Seconds */}
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-extrabold text-white tabular-nums tracking-tighter leading-none font-sans">
              {String(seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
              Seconds
            </span>
          </div>
        </div>

        {/* Action Pair */}
        <div className="w-full space-y-3">
          {/* High Priority "I'm Safe — Cancel Alert" Action */}
          <button
            onClick={cancelCrashAlert}
            className="w-full h-14 bg-white text-neutral-900 hover:bg-neutral-100 font-extrabold rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center space-x-2 text-base"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>I'M SAFE — CANCEL ALERT</span>
          </button>

          {/* Subdued "Trigger SOS Now" Action */}
          <button
            onClick={() => {
              cancelCrashAlert();
              triggerSos({ flags: 1 });
            }}
            className="w-full py-2.5 text-red-400 hover:text-red-300 font-bold text-xs flex items-center justify-center space-x-1 uppercase tracking-wider"
          >
            <span>Trigger SOS Immediately</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

