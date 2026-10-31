/**
 * mobile-app/src/screens/driver/DriverActivityScreen.tsx
 * Driver Shift Log, Response Metrics, and Completed Rescue Runs.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Activity, Clock, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const DriverActivityScreen: React.FC = () => {
  const { missionHistory } = useApp();

  return (
    <div className="relative w-full flex-1 flex flex-col overflow-y-auto no-scrollbar pb-24 bg-neutral-950 text-white p-6">
      <div className="mb-4">
        <h1 className="text-xl font-black text-white">Shift Telemetry &amp; Log</h1>
        <p className="text-xs text-neutral-400">Unit 402 response record (Ahmedabad West)</p>
      </div>

      {/* Metric Cards (from DESIGN.md) */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center space-x-1.5 text-neutral-400 text-xs font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Avg Response</span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums">4.8</span>
          <span className="text-xs text-neutral-400 font-bold ml-1">min</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center space-x-1.5 text-neutral-400 text-xs font-semibold mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Success Rate</span>
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">100%</span>
          <span className="text-xs text-neutral-400 font-bold ml-1">handoff</span>
        </div>
      </div>

      {/* Completed Missions Roster */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Recent Rescue Runs
        </h2>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-300">#RUN-8841</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              SUCCESSFUL HANDOFF
            </span>
          </div>
          <p className="text-sm font-bold text-white">Cardiac Emergency • Navrangpura</p>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-800">
            <span>VS Hospital Metro Care</span>
            <span className="text-emerald-400 font-mono">4.2 min response</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2 opacity-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-300">#RUN-8839</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              COMPLETED
            </span>
          </div>
          <p className="text-sm font-bold text-white">Road Traffic Collision • Paldi</p>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-800">
            <span>SVP Hospital Trauma Bay</span>
            <span className="text-emerald-400 font-mono">5.6 min response</span>
          </div>
        </div>
      </div>
    </div>
  );
};

