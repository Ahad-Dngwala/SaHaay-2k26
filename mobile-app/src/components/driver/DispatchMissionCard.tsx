/**
 * mobile-app/src/components/driver/DispatchMissionCard.tsx
 * Dominant High-Contrast White Incident Card (04_driver_dispatch/code.html lines 196-252)
 * Handles incoming mission offer, accept/decline with 409 conflict handling,
 * and active mission execution states.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Compass,
  User,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BriefcaseMedical,
} from 'lucide-react';

export const DispatchMissionCard: React.FC = () => {
  const {
    incomingOffer,
    activeDriverMission,
    acceptIncomingMission,
    declineIncomingMission,
    updateMissionProgress,
    driverConflictError,
    setDriverTab,
    seedDemoScenario,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const mission = incomingOffer || activeDriverMission;

  if (!mission) {
    return (
      <article className="bg-white text-black rounded-[36px] p-6 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-md">
              <Compass className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Standby Mode
              </span>
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight mt-0.5">
                Monitoring Sector 1 Dispatch
              </h2>
            </div>
          </div>
        </div>

        <div className="my-6 text-center">
          <p className="text-xs text-neutral-500 max-w-[280px] mx-auto">
            Unit 402 is registered in the Ahmedabad ripple ladder. Live offers will pop up here with instant audio chime.
          </p>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={seedDemoScenario}
              className="px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold active:scale-95 shadow transition-all"
            >
              Simulate Code Red Offer
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-3 text-center text-[11px] text-neutral-400">
          GPS Telemetry: 23.0365° N, 72.5642° E • Navrangpura
        </div>
      </article>
    );
  }

  const isOffer = !!incomingOffer;
  const isEnRoute = mission.status === 'ASSIGNED';
  const isOnScene = mission.status === 'ON_SCENE';
  const isTransporting = mission.status === 'TRANSPORTING';

  const handleAccept = async () => {
    setIsSubmitting(true);
    await acceptIncomingMission();
    setIsSubmitting(false);
  };

  return (
    <article className="bg-white text-black rounded-[36px] p-6 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden">
      {/* Conflict Error Notice (e.g. 409 conflict when another unit accepted first) */}
      {driverConflictError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-2 text-red-700">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-bold">{driverConflictError}</p>
        </div>
      )}

      {/* Header Info Inside White Card */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shadow-md">
            <span className="text-red-500 text-lg font-bold">🚑</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {mission.priorityLabel || 'Code Red Priority'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight mt-0.5">
              Incident #{mission.id.slice(-4).toUpperCase()}
            </h2>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black font-sans text-neutral-900 tracking-tighter">
            {mission.distanceKm || '4.2'}
          </span>
          <span className="text-xs font-semibold text-neutral-500 block -mt-1">km away</span>
        </div>
      </div>

      {/* Big Bold Headline */}
      <div className="my-3">
        <p className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider mb-1">
          Incident Diagnosis
        </p>
        <h1 className="text-[26px] font-extrabold text-neutral-950 leading-[1.1] tracking-tight">
          {mission.incidentDiagnosis || 'Critical Cardiac Distress & Rapid Transport'}
        </h1>

        {/* Badges */}
        <div className="flex items-center space-x-2.5 mt-3 text-xs font-semibold text-neutral-600">
          <span className="flex items-center space-x-1 bg-neutral-100 px-2.5 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-neutral-900" />
            <span className="text-neutral-900">ETA: {mission.etaMinutes || 6} mins</span>
          </span>
          <span className="flex items-center space-x-1 bg-neutral-100 px-2.5 py-1.5 rounded-xl truncate max-w-[200px]">
            <Compass className="w-3.5 h-3.5 text-neutral-900 flex-shrink-0" />
            <span className="text-neutral-900 truncate">
              {mission.localityName || 'MG Road, Sector 4'}
            </span>
          </span>
        </div>
      </div>

      {/* Patient Mini Ticker */}
      <div className="border-t border-neutral-100 pt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900">
              {mission.patientName || 'Vikram Malhotra'}, {mission.patientAge || 58}
            </p>
            <p className="text-[10px] font-medium text-neutral-500">
              SpO2: {mission.vitals?.spO2 || 88}% • BP: {mission.vitals?.bp || '165/100'}
            </p>
          </div>
        </div>

        {/* Quick Navigate Shortcut */}
        <button
          onClick={() => setDriverTab('navigate')}
          aria-label="Open GPS Map"
          className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow hover:bg-neutral-800 active:scale-95 transition-transform"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Action Area: Incoming Offer Buttons vs Active Mission Workflow */}
      <div className="mt-4 pt-3 border-t border-neutral-100">
        {isOffer ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={declineIncomingMission}
              className="flex-1 py-3 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm active:scale-95 transition-all text-center"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 rounded-2xl bg-[#1a6c42] hover:bg-[#155734] text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Locking...' : 'Accept Mission'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {isEnRoute && (
              <button
                onClick={() => updateMissionProgress('ON_SCENE')}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>Arrived on Scene</span>
              </button>
            )}
            {isOnScene && (
              <button
                onClick={() => updateMissionProgress('TRANSPORTING')}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>Patient Picked Up • En Route to Hospital</span>
              </button>
            )}
            {isTransporting && (
              <button
                onClick={() => updateMissionProgress('COMPLETED')}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>Hospital Handover Complete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
