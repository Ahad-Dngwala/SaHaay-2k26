/**
 * mobile-app/src/components/common/RoleSwitcherPill.tsx
 * Role Switcher Pill allowing instant toggling between Citizen and Driver experiences.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRound, Truck } from 'lucide-react';

export const RoleSwitcherPill: React.FC = () => {
  const { role, setRole, isOnline, offlineSmsMode } = useApp();

  return (
    <div className="flex items-center justify-between px-5 pt-2 pb-1 bg-black/40 border-b border-white/5">
      <div className="flex items-center space-x-1 bg-neutral-900/90 p-1 rounded-full border border-white/10">
        <button
          onClick={() => setRole('citizen')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            role === 'citizen'
              ? 'bg-[#B42318] text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <UserRound className="w-3.5 h-3.5" />
          <span>Citizen</span>
        </button>
        <button
          onClick={() => setRole('driver')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            role === 'driver'
              ? 'bg-[#B84018] text-white shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Ambulance EMS</span>
        </button>
      </div>

      {/* Online / Simulated status */}
      <div className="flex items-center space-x-2">
        {offlineSmsMode ? (
          <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
            SIMULATED SMS
          </span>
        ) : isOnline ? (
          <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE SERVER</span>
          </span>
        ) : (
          <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
            OFFLINE / DEMO
          </span>
        )}
      </div>
    </div>
  );
};

