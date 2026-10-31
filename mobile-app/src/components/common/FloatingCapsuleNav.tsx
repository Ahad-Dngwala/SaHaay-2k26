/**
 * mobile-app/src/components/common/FloatingCapsuleNav.tsx
 * Shared floating capsule navigation dock (Section 4 & Stitch 04/06 references).
 * 4 destinations:
 * - Citizen: Home (Emergency / SOS), Track, Activity, Profile
 * - Driver: Missions, Navigate, Activity, Profile
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Navigation,
  Compass,
  MapPin,
  Clock,
  User,
  Activity,
  Radio,
} from 'lucide-react';

export const FloatingCapsuleNav: React.FC = () => {
  const {
    role,
    citizenTab,
    setCitizenTab,
    driverTab,
    setDriverTab,
    crashState,
    activeMission,
    activeDriverMission,
  } = useApp();

  // Hide nav during active crash countdown to keep screen focused on life safety
  if (crashState.status === 'COUNTDOWN_ACTIVE') {
    return null;
  }

  const isCitizen = role === 'citizen';

  // Citizen 4 destinations: Home, Track, Activity, Profile
  // Driver 4 destinations: Missions, Navigate, Activity, Profile
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-6 pt-2 max-w-[420px] mx-auto pointer-events-none"
      aria-label="App Navigation Dock"
    >
      <div className="bg-[#1a1c22]/95 backdrop-blur-md border border-white/10 rounded-full py-2 px-3 flex items-center justify-between shadow-dock pointer-events-auto">
        {isCitizen ? (
          <>
            {/* Citizen 1: Home (Emergency / SOS) */}
            <button
              onClick={() => setCitizenTab('home')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                citizenTab === 'home'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Emergency Home"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>SOS</span>
            </button>

            {/* Citizen 2: Track */}
            <button
              onClick={() => setCitizenTab('track')}
              className={`relative flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                citizenTab === 'track'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Ambulance Tracking"
            >
              <Navigation className="w-4 h-4" />
              <span>Track</span>
              {activeMission && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse absolute -top-0.5 right-1" />
              )}
            </button>

            {/* Citizen 3: Activity */}
            <button
              onClick={() => setCitizenTab('activity')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                citizenTab === 'activity'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Activity History"
            >
              <Clock className="w-4 h-4" />
              <span>Activity</span>
            </button>

            {/* Citizen 4: Profile */}
            <button
              onClick={() => setCitizenTab('profile')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                citizenTab === 'profile'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Profile and Settings"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </>
        ) : (
          <>
            {/* Driver 1: Missions */}
            <button
              onClick={() => setDriverTab('missions')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                driverTab === 'missions'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Driver Missions"
            >
              <Compass className="w-4 h-4" />
              <span>Missions</span>
            </button>

            {/* Driver 2: Navigate */}
            <button
              onClick={() => setDriverTab('navigate')}
              className={`relative flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                driverTab === 'navigate'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Turn by Turn Navigation"
            >
              <MapPin className="w-4 h-4" />
              <span>Navigate</span>
              {activeDriverMission && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse absolute -top-0.5 right-1" />
              )}
            </button>

            {/* Driver 3: Activity */}
            <button
              onClick={() => setDriverTab('activity')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                driverTab === 'activity'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Shift Activity Log"
            >
              <Activity className="w-4 h-4" />
              <span>Activity</span>
            </button>

            {/* Driver 4: Profile */}
            <button
              onClick={() => setDriverTab('profile')}
              className={`flex items-center space-x-2 py-2 px-4 rounded-full font-bold text-xs transition-all active:scale-95 ${
                driverTab === 'profile'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Unit Profile"
            >
              <Radio className="w-4 h-4" />
              <span>Unit 402</span>
            </button>
          </>
        )}
      </div>
      {/* iOS Home Indicator bar */}
      <div className="w-32 h-1 bg-neutral-600/60 rounded-full mx-auto mt-3" />
    </nav>
  );
};

