/**
 * mobile-app/src/screens/driver/DriverProfileScreen.tsx
 * Driver Profile, Unit 402 Readiness, and Availability Toggle.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, Check, AlertCircle, Power, Shield, BatteryMedium, Gauge } from 'lucide-react';

export const DriverProfileScreen: React.FC = () => {
  const { driverAmbulance, driverAvailability, toggleDriverAvailability } = useApp();

  return (
    <div className="relative w-full flex-1 flex flex-col overflow-y-auto no-scrollbar pb-24 bg-neutral-950 text-white p-6">
      <div className="mb-4">
        <h1 className="text-xl font-black text-white">Unit &amp; Crew Readiness</h1>
        <p className="text-xs text-neutral-400">Responder credentials &amp; vehicle telemetry</p>
      </div>

      <div className="space-y-4 text-xs">
        {/* Availability Toggle Hero Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                driverAvailability === 'AVAILABLE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              <Power className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">
                {driverAvailability === 'AVAILABLE' ? 'Online on Standby' : 'Offline / Off-Duty'}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {driverAvailability === 'AVAILABLE'
                  ? 'Accepting incoming dispatch offers'
                  : 'Vehicle is currently unavailable for dispatch'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleDriverAvailability}
            className={`w-14 h-7 rounded-full transition-colors relative ${
              driverAvailability === 'AVAILABLE' ? 'bg-emerald-600' : 'bg-neutral-800'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                driverAvailability === 'AVAILABLE' ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Vehicle & Unit Specifications */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-white font-bold mb-1">
            <Truck className="w-4 h-4 text-red-500" />
            <span className="text-sm">Vehicle Specifications</span>
          </div>

          <div className="flex justify-between py-1 border-b border-neutral-800">
            <span className="text-neutral-400">Unit Call Sign:</span>
            <span className="font-mono text-white">Unit 402 (GJ-01-EM-402)</span>
          </div>

          <div className="flex justify-between py-1 border-b border-neutral-800">
            <span className="text-neutral-400">Ambulance Classification:</span>
            <span className="font-mono text-emerald-400">ALS (Advanced Life Support)</span>
          </div>

          <div className="flex justify-between py-1 border-b border-neutral-800">
            <span className="text-neutral-400">Assigned Operating Zone:</span>
            <span className="font-mono text-white">Navrangpura, Sector 1</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-neutral-400">Primary Lead Paramedic:</span>
            <span className="font-bold text-white">{driverAmbulance.driverName}</span>
          </div>
        </div>

        {/* Life-Support Systems Check */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-white font-bold mb-1">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-sm">Life-Support Diagnostic Telemetry</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-neutral-800">
            <span className="text-neutral-400">Medical O2 Reservoir (Main Tank):</span>
            <span className="font-mono text-emerald-400 font-bold">98% (2,200 PSI)</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-neutral-800">
            <span className="text-neutral-400">Defibrillator Battery (Zoll X):</span>
            <span className="font-mono text-emerald-400 font-bold">100% Charged</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-neutral-400">Emergency Siren &amp; PA System:</span>
            <span className="text-emerald-400 font-bold">Tested &amp; Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
};

