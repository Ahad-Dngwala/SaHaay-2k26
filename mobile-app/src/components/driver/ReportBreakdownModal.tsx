/**
 * mobile-app/src/components/driver/ReportBreakdownModal.tsx
 * Quick Breakdown Reporting Drawer triggering automatic self-healing re-dispatch (M6 / Section 7).
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertOctagon, Wrench, ShieldAlert } from 'lucide-react';

export const ReportBreakdownModal: React.FC = () => {
  const { breakdownModalOpen, setBreakdownModalOpen, reportBreakdownAction, activeDriverMission } = useApp();
  const [reason, setReason] = useState<string>('mechanical');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!breakdownModalOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await reportBreakdownAction();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 text-white border border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scaleUp">
        <div className="flex items-center space-x-3 text-red-500 mb-2">
          <AlertOctagon className="w-7 h-7" />
          <h2 className="text-lg font-bold text-white">Emergency Vehicle Breakdown</h2>
        </div>

        <p className="text-xs text-neutral-400 mb-4">
          Reporting vehicle failure will immediately re-route the nearest secondary ambulance to the patient's live GPS coordinates.
        </p>

        <div className="space-y-2 mb-5">
          <label className="block text-xs font-semibold text-neutral-300 mb-1">
            Breakdown Reason
          </label>
          {[
            { id: 'mechanical', label: 'Engine / Mechanical Stoppage' },
            { id: 'tire', label: 'Severe Tire Blowout' },
            { id: 'collision', label: 'Route Collision / Road Blockade' },
            { id: 'medical_gear', label: 'Critical Life-Support Failure' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setReason(item.id)}
              className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                reason === item.id
                  ? 'bg-red-950/40 border-red-500 text-white'
                  : 'bg-neutral-800 border-neutral-700/60 text-neutral-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-red-400" />
                <span>{item.label}</span>
              </div>
              {reason === item.id && <span className="w-2 h-2 rounded-full bg-red-500" />}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setBreakdownModalOpen(false)}
            className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center space-x-1"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isSubmitting ? 'Reporting...' : 'Confirm Breakdown'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

