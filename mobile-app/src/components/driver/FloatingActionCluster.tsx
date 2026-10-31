/**
 * mobile-app/src/components/driver/FloatingActionCluster.tsx
 * Vertical action rail on the right side of driver dispatch (04_driver_dispatch/code.html lines 253-273).
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Megaphone, Phone, ClipboardCheck, Radio } from 'lucide-react';

export const FloatingActionCluster: React.FC = () => {
  const { setBreakdownModalOpen, activeDriverMission } = useApp();
  const [sirenActive, setSirenActive] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  const toggleSiren = () => {
    setSirenActive(!sirenActive);
  };

  return (
    <>
      <aside
        className="absolute right-5 bottom-4 flex flex-col items-center space-y-2.5 z-30 pointer-events-auto"
        data-purpose="floating-action-column"
      >
        {/* Quick Action 1: Siren/Audio Alert */}
        <button
          onClick={toggleSiren}
          aria-label="Toggle Siren"
          title={sirenActive ? 'Siren Active (SIMULATED)' : 'Activate Siren (SIMULATED)'}
          className={`w-11 h-11 rounded-full text-white border flex items-center justify-center shadow-lg active:scale-90 transition-transform ${
            sirenActive
              ? 'bg-amber-500 border-amber-300 animate-pulse'
              : 'bg-neutral-900/90 border-neutral-700/80 hover:bg-neutral-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
        </button>

        {/* Quick Action 2: Direct Hospital Call */}
        <button
          onClick={() => alert('Dialing Metro City Trauma Triage Hotline: +91 79 2657 0000 (DEMO)')}
          aria-label="Call Hospital"
          title="Call Hospital Triage"
          className="w-11 h-11 rounded-full bg-neutral-900/90 text-white border border-neutral-700/80 flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-neutral-800"
        >
          <Phone className="w-4 h-4" />
        </button>

        {/* Quick Action 3: Fast Triage Checklist */}
        <button
          onClick={() => setChecklistOpen(true)}
          aria-label="Triage Checklist"
          title="Field Triage Checklist"
          className="w-11 h-11 rounded-full bg-neutral-900/90 text-white border border-neutral-700/80 flex items-center justify-center shadow-lg active:scale-90 transition-transform hover:bg-neutral-800"
        >
          <ClipboardCheck className="w-4 h-4" />
        </button>

        {/* Quick Action 4: Central Emergency Beacon / Breakdown Report */}
        <button
          onClick={() => setBreakdownModalOpen(true)}
          aria-label="Vehicle Breakdown Report"
          title="Vehicle Breakdown Failover"
          className="w-11 h-11 rounded-full bg-red-600 text-white border-2 border-white/20 flex items-center justify-center shadow-xl active:scale-90 transition-transform animate-pulse"
        >
          <Radio className="w-4 h-4" />
        </button>
      </aside>

      {/* Field Triage Checklist Modal */}
      {checklistOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-white border border-neutral-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              <span>Paramedic Field Checklist</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Pre-hospital resuscitation checklist for Ahmedabad EMS Unit 402.
            </p>

            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2 p-2 bg-neutral-800 rounded-xl cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-red-600" />
                <span>High-Flow O2 via Non-Rebreather (15 L/min)</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-neutral-800 rounded-xl cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-red-600" />
                <span>12-Lead ECG Transmitted to Metro Gen</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-neutral-800 rounded-xl cursor-pointer">
                <input type="checkbox" className="rounded text-red-600" />
                <span>Dual Large-Bore IV Access Established</span>
              </label>
              <label className="flex items-center space-x-2 p-2 bg-neutral-800 rounded-xl cursor-pointer">
                <input type="checkbox" className="rounded text-red-600" />
                <span>Aspirin 325 mg &amp; Sublingual Nitroglycerin</span>
              </label>
            </div>

            <button
              onClick={() => setChecklistOpen(false)}
              className="mt-5 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-xs"
            >
              Close Checklist
            </button>
          </div>
        </div>
      )}
    </>
  );
};

