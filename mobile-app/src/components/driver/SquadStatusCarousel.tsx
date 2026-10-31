/**
 * mobile-app/src/components/driver/SquadStatusCarousel.tsx
 * Horizontal row of available paramedic crew units (04_driver_dispatch/code.html lines 139-195).
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, HeartPulse, Hospital, PlusCircle } from 'lucide-react';

export const SquadStatusCarousel: React.FC = () => {
  const { driverAvailability, driverAmbulance } = useApp();

  return (
    <section className="px-5 py-2 z-10 flex-shrink-0" data-purpose="active-paramedic-squad">
      <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1">
        {/* Unit Card 1 (Active Driver / YOU) */}
        <div className="flex flex-col items-center flex-shrink-0 w-16 cursor-pointer">
          <div className="w-14 h-14 rounded-2xl p-[2.5px] mb-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 shadow-md">
            <div className="relative w-full h-full bg-neutral-900 rounded-[14px] overflow-hidden z-10 flex items-center justify-center">
              <span className="font-bold text-sm text-neutral-100 tracking-wider">YOU</span>
              <span
                className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-neutral-900 ${
                  driverAvailability === 'AVAILABLE'
                    ? 'bg-emerald-400 animate-pulse'
                    : driverAvailability === 'OFFLINE'
                    ? 'bg-neutral-500'
                    : 'bg-amber-400'
                }`}
              />
            </div>
          </div>
          <span className="text-[10px] text-neutral-200 font-semibold tracking-tight truncate w-full text-center">
            {driverAvailability === 'AVAILABLE'
              ? 'Standby'
              : driverAvailability === 'OFFLINE'
              ? 'Off Duty'
              : 'En Route'}
          </span>
        </div>

        {/* Unit Card 2: AMB-12 */}
        <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-85">
          <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
              <Truck className="w-4 h-4 text-red-400 mb-0.5" />
              <span className="text-[9px] font-bold text-neutral-300">AMB-12</span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">
            Dr. Roy
          </span>
        </div>

        {/* Unit Card 3: MED-04 */}
        <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-85">
          <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
              <HeartPulse className="w-4 h-4 text-amber-400 mb-0.5" />
              <span className="text-[9px] font-bold text-neutral-300">MED-04</span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">
            Triage B
          </span>
        </div>

        {/* Unit Card 4: ICU-08 */}
        <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-85">
          <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
              <Hospital className="w-4 h-4 text-sky-400 mb-0.5" />
              <span className="text-[9px] font-bold text-neutral-300">ICU-08</span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium truncate w-full text-center">
            Metro Gen
          </span>
        </div>

        {/* Unit Card 5: STANDBY */}
        <div className="flex flex-col items-center flex-shrink-0 w-16 opacity-60">
          <div className="w-14 h-14 rounded-2xl p-[2px] bg-neutral-800 mb-1 border border-neutral-700/60 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-900 rounded-[13px] flex flex-col items-center justify-center">
              <PlusCircle className="w-4 h-4 text-neutral-500 mb-0.5" />
              <span className="text-[9px] font-bold text-neutral-500">STANDBY</span>
            </div>
          </div>
          <span className="text-[10px] text-neutral-500 font-medium truncate w-full text-center">
            Reserve
          </span>
        </div>
      </div>
    </section>
  );
};

