/**
 * mobile-app/src/components/driver/SecondaryQueueCard.tsx
 * Lower operational queue strip (04_driver_dispatch/code.html lines 276-296).
 */

import React, { useState } from 'react';
import { AlertTriangle, BedDouble, Check } from 'lucide-react';

export const SecondaryQueueCard: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="px-4 pb-2 z-10 flex-shrink-0" data-purpose="secondary-incoming-mission">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Trauma Unit Queue</span>
                <span className="text-[9px] font-semibold bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-md">
                  2 Pending
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                Metro City Care: Bed 12 Reserved
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 bg-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            View
          </button>
        </div>
      </section>

      {/* Hospital Pre-Reservation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-white border border-neutral-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center space-x-2 mb-3">
              <BedDouble className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Hospital Bed Pre-Allocation</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Real-time ICU/Trauma bed telemetry from Ahmedabad Municipal Hospital Network.
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-neutral-800 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Metro City Care (VS Hospital)</p>
                  <p className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-0.5">
                    <Check className="w-3 h-3" />
                    <span>Bed 12 Reserved • Cath Lab On Call</span>
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-300">2.8 km</span>
              </div>

              <div className="p-3 bg-neutral-800/60 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-300">SVP Hospital Trauma Bay</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">3 Trauma Beds Available</p>
                </div>
                <span className="text-xs font-mono text-neutral-400">4.1 km</span>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="mt-5 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

