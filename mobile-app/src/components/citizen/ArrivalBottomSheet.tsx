/**
 * mobile-app/src/components/citizen/ArrivalBottomSheet.tsx
 * Draggable / Expandable White Arrival Bottom Sheet (02_citizen_tracking/code.html)
 * Features ETA progress track with moving vehicle icon, driver identity, call/message buttons,
 * and expandable mission timeline.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, MessageSquare, ChevronUp, ChevronDown, CheckCircle2, AlertOctagon, Share2 } from 'lucide-react';

export const ArrivalBottomSheet: React.FC = () => {
  const {
    activeMission,
    assignedAmbulance,
    setCallModalOpen,
    setMessageModalOpen,
    cancelCurrentMission,
    triggerSos,
    seedDemoScenario,
  } = useApp();

  const [expanded, setExpanded] = useState<boolean>(false);

  // If no mission is active, show honest empty state
  if (!activeMission) {
    return (
      <section className="relative z-30 bg-white rounded-t-[32px] px-6 pt-5 pb-24 shadow-sheet border-t border-neutral-200">
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-4" />
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
            <AlertOctagon className="w-6 h-6 text-neutral-500" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">No Active Dispatch</h2>
          <p className="text-xs text-neutral-500 max-w-[260px] mx-auto mt-1">
            Emergency tracking opens automatically once an SOS trigger is placed.
          </p>
          <div className="flex items-center justify-center space-x-3 mt-4">
            <button
              onClick={() => triggerSos()}
              className="px-4 py-2 bg-[#B42318] text-white rounded-full text-xs font-bold shadow active:scale-95 transition-all"
            >
              Trigger Live SOS
            </button>
            <button
              onClick={seedDemoScenario}
              className="px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold active:scale-95 transition-all"
            >
              Load Demo Scenario
            </button>
          </div>
        </div>
      </section>
    );
  }

  const driver = assignedAmbulance || {
    driverName: 'James Harris',
    vehicleNo: 'GJ-01-EM-402',
    phone: '+91 98765 43210',
  };

  const eta = activeMission.etaMinutes ?? 5;
  const isArrived = activeMission.status === 'ON_SCENE';

  return (
    <section
      className={`relative z-30 bg-white rounded-t-[32px] px-6 pt-4 pb-24 shadow-sheet border-t border-neutral-200 transition-all duration-300 ${
        expanded ? 'max-h-[70vh] overflow-y-auto' : ''
      }`}
      data-purpose="arrival-card"
    >
      {/* Drag Handle & Expand Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col items-center py-1 group focus:outline-none"
        aria-label="Toggle Bottom Sheet Expansion"
      >
        <div className="w-10 h-1.5 bg-neutral-300 rounded-full mb-1 group-hover:bg-neutral-400 transition-colors" />
        <div className="flex items-center text-[10px] text-neutral-400 font-semibold space-x-1">
          <span>{expanded ? 'Collapse Details' : 'Expand Timeline'}</span>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </div>
      </button>

      {/* ETA Status & Live Progress Track */}
      <div className="mt-2 mb-4" data-purpose="eta-status-block">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[17px] font-bold text-neutral-900 tracking-tight">
            {isArrived ? 'Status' : 'Arriving in'}
          </span>
          <span className="text-[18px] font-bold text-[#B42318] tracking-tight">
            {isArrived ? 'Arrived on Scene' : `${eta} min`}
          </span>
        </div>

        {/* Progress Track */}
        <div className="relative w-full h-[4px] bg-neutral-100 rounded-full flex items-center">
          {/* Active Filled Route Bar */}
          <div
            className="h-full bg-[#B42318] rounded-full transition-all duration-500"
            style={{ width: isArrived ? '100%' : '78%' }}
          />

          {/* Moving Mini Ambulance Icon */}
          <div
            className="absolute -top-2.5 -translate-x-1/2 flex items-center justify-center transition-all duration-500"
            style={{ left: isArrived ? '96%' : '78%' }}
          >
            <div className="bg-[#B42318] text-white p-1 rounded-md shadow-sm">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 8h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h1c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1c.55 0 1-.45 1-1v-4.68c0-.52-.2-1.02-.57-1.39L19 8zm-8 4H9v2H7v-2H5v-2h2V8h2v2h2v2zm6 1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-9 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Profile and Instant Communication Action Buttons */}
      <div className="flex items-center justify-between pt-1 border-b border-neutral-100 pb-4">
        {/* Driver Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="w-[52px] h-[52px] rounded-full bg-neutral-900 border-2 border-white shadow-sm ring-1 ring-neutral-200 flex items-center justify-center text-white font-bold text-lg">
            JH
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-[17px] font-bold text-neutral-900 leading-tight">
                {driver.driverName}
              </h2>
              <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                ALS Unit
              </span>
            </div>
            <p className="text-[13px] text-neutral-500 font-medium mt-0.5">
              Ambulance Driver • {driver.vehicleNo}
            </p>
          </div>
        </div>

        {/* Action Buttons: Voice Call & Text Message */}
        <div className="flex items-center space-x-2.5">
          {/* Call Button */}
          <button
            onClick={() => setCallModalOpen(true)}
            aria-label="Call Ambulance Driver"
            className="w-[46px] h-[46px] rounded-full bg-[#B42318] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-[#961e14]"
            type="button"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Chat / SMS Button */}
          <button
            onClick={() => setMessageModalOpen(true)}
            aria-label="Message Ambulance Driver"
            className="w-[46px] h-[46px] rounded-full bg-[#B42318] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-[#961e14]"
            type="button"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Mission Timeline (from DESIGN.md) */}
      {expanded && (
        <div className="mt-4 pt-2 border-t border-neutral-100 animate-fadeIn">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
            Mission Timeline &amp; Telemetry
          </h3>

          <div className="space-y-4 pl-2 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
            {/* Step 1: Received */}
            <div className="flex items-start space-x-3 relative">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center z-10">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">SOS Received &amp; Logged</p>
                <p className="text-[10px] text-neutral-500">Hash chain audit ledger verified</p>
              </div>
            </div>

            {/* Step 2: Driver Assigned */}
            <div className="flex items-start space-x-3 relative">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center z-10">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">Unit 402 Assigned (First-Accept)</p>
                <p className="text-[10px] text-neutral-500">Distance: 4.2 km • ETA: 5 mins</p>
              </div>
            </div>

            {/* Step 3: En Route */}
            <div className="flex items-start space-x-3 relative">
              <div className="w-6 h-6 rounded-full bg-[#B42318] text-white flex items-center justify-center z-10 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">Out for Rescue</p>
                <p className="text-[10px] text-neutral-500">Speed: ~42 km/h • Green Corridor active</p>
              </div>
            </div>

            {/* Step 4: On Scene */}
            <div className="flex items-start space-x-3 relative">
              <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-500 flex items-center justify-center z-10">
                <span className="w-2 h-2 rounded-full bg-neutral-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500">Arrival at Location</p>
                <p className="text-[10px] text-neutral-400">Navrangpura, Sector 4</p>
              </div>
            </div>
          </div>

          {/* Action Row in Expanded View */}
          <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <button
              onClick={cancelCurrentMission}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-red-600 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel Alert (I'm Safe)
            </button>
            <button
              onClick={() => alert('Route sharing link copied to clipboard (DEMO)')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Live Route</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

