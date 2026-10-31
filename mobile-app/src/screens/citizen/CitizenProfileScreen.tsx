/**
 * mobile-app/src/screens/citizen/CitizenProfileScreen.tsx
 * Citizen Medical Profile, Emergency Contacts, and Crash Tunables (src/core/config.ts).
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Heart, Phone, Shield, Cpu, Save } from 'lucide-react';
import { Config } from '../../config';

export const CitizenProfileScreen: React.FC = () => {
  const { offlineSmsMode, setOfflineSmsMode } = useApp();
  const [bloodGroup, setBloodGroup] = useState('O+ Positive');
  const [allergies, setAllergies] = useState('Penicillin, Peanuts');
  const [emergencyContact, setEmergencyContact] = useState('+91 98250 12345 (Aarav - Brother)');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="relative w-full flex-1 flex flex-col overflow-y-auto no-scrollbar pb-24 bg-[#090d16] text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-white">Emergency Profile</h1>
          <p className="text-xs text-neutral-400">Offline medical ID &amp; safety settings</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#B42318] hover:bg-red-700 text-white rounded-full text-xs font-bold active:scale-95 transition-all"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{savedNotice ? 'Saved!' : 'Save'}</span>
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* Medical ID Card */}
        <div className="bg-[#0f1726]/85 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-red-400 font-bold">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Critical Medical Telemetry</span>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Blood Group</label>
            <input
              type="text"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Severe Allergies / Conditions</label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Primary Emergency Contact</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Safety Engine Tunables (Read-only single source of truth from config.ts) */}
        <div className="bg-[#0f1726]/85 border border-slate-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
            <Cpu className="w-4 h-4" />
            <span className="text-sm">Safety Engine Tunables (src/core/config.ts)</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-neutral-400">Crash Impact Threshold:</span>
            <span className="font-mono text-emerald-400">{Config.CRASH_G} g</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-neutral-400">Post-Impact Stillness Window:</span>
            <span className="font-mono text-emerald-400">{Config.STILLNESS_WINDOW_MS} ms</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-neutral-400">Safety Countdown Duration:</span>
            <span className="font-mono text-emerald-400">{Config.COUNTDOWN_SEC} seconds</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-neutral-400">Initial Dispatch Ripple:</span>
            <span className="font-mono text-emerald-400">{Config.SEARCH_RADIUS_M} m</span>
          </div>
        </div>

        {/* Offline Protocol Toggle */}
        <div className="bg-[#0f1726]/85 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="font-bold text-white block">Offline SMS Fallback</span>
            <span className="text-[10px] text-neutral-400">Simulate zero data connectivity</span>
          </div>
          <button
            onClick={() => setOfflineSmsMode(!offlineSmsMode)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              offlineSmsMode ? 'bg-amber-500' : 'bg-neutral-800'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                offlineSmsMode ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

