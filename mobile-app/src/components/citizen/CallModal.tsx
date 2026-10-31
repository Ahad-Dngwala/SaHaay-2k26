/**
 * mobile-app/src/components/citizen/CallModal.tsx
 * Direct Call Modal for 112 Govt Hotline & Ambulance Driver (Section 8).
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, PhoneCall, ShieldAlert, X } from 'lucide-react';
import { Config } from '../../config';

export const CallModal: React.FC = () => {
  const { callModalOpen, setCallModalOpen, assignedAmbulance } = useApp();

  if (!callModalOpen) return null;

  const driverPhone = assignedAmbulance?.phone || '+91 98765 43210';

  const triggerCall = (num: string) => {
    // If running on a mobile device with tel support, opens dialer
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${num}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-neutral-900 text-white border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scaleUp">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-white">
            <PhoneCall className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold">Emergency Calling</h2>
          </div>
          <button
            onClick={() => setCallModalOpen(false)}
            className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 mb-5">
          Select an emergency recipient. Real native dialer is invoked on supported mobile phones.
        </p>

        <div className="space-y-3">
          {/* Option 1: 112 Govt Hotline */}
          <button
            onClick={() => triggerCall(Config.EMERGENCY_HOTLINE)}
            className="w-full p-4 rounded-2xl bg-white text-black hover:bg-neutral-100 flex items-center justify-between shadow active:scale-95 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-black">
                112
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-neutral-900">National Emergency 112</p>
                <p className="text-[11px] text-neutral-500 font-medium">Govt Police &amp; Ambulance Hotline</p>
              </div>
            </div>
            <Phone className="w-4 h-4 text-neutral-400" />
          </button>

          {/* Option 2: Assigned Ambulance Driver */}
          <button
            onClick={() => triggerCall(driverPhone)}
            className="w-full p-4 rounded-2xl bg-neutral-800 text-white hover:bg-neutral-750 border border-neutral-700/60 flex items-center justify-between shadow active:scale-95 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-neutral-700 text-white flex items-center justify-center font-bold text-sm">
                JH
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-white">
                  {assignedAmbulance?.driverName || 'James Harris'}
                </p>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {assignedAmbulance?.vehicleNo || 'Unit 402'} • {driverPhone}
                </p>
              </div>
            </div>
            <Phone className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        <div className="mt-5 text-center">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
            Honest Notice: Simulated demo environment
          </span>
        </div>
      </div>
    </div>
  );
};

