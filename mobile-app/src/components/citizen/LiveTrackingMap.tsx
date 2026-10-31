/**
 * mobile-app/src/components/citizen/LiveTrackingMap.tsx
 * Native SVG Map rendering Ahmedabad streets, route line, patient pin, and live ambulance marker.
 * Recreates the visual hierarchy of 02_citizen_tracking/code.html & screen.png
 * with real/synthetic Ahmedabad coordinates and honest labeling.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Navigation2, Layers, LocateFixed } from 'lucide-react';

export const LiveTrackingMap: React.FC = () => {
  const { activeMission, assignedAmbulance } = useApp();
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');

  // Simulated progress along route: 0 (just assigned) to 1 (arrived)
  const isEnRoute = activeMission?.status === 'ASSIGNED' || activeMission?.status === 'DISPATCHING';
  const isOnScene = activeMission?.status === 'ON_SCENE';

  // Coordinate geometry for SVG canvas (390 x 520)
  // Patient pin near top (Navrangpura)
  const patientPos = { x: 135, y: 155 };
  // Ambulance starts near bottom and moves up toward patient
  const ambulancePos = isOnScene ? { x: 138, y: 165 } : { x: 155, y: 440 };

  return (
    <div className="relative w-full h-[58vh] bg-[#F1EFE8] overflow-hidden select-none" data-purpose="map-view">
      {/* Floating Header */}
      <div className="absolute top-3 left-0 right-0 z-20 flex items-center justify-between px-5">
        <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-neutral-200">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-neutral-900">
            {activeMission ? 'Live Dispatch Track' : 'Ahmedabad Map'}
          </span>
          <span className="text-[9px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
            SYNTHETIC GEO
          </span>
        </div>

        {/* Map Utility Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMapLayer((l) => (l === 'streets' ? 'satellite' : 'streets'))}
            className="w-8 h-8 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-neutral-700 active:scale-95"
            title="Toggle Map Style"
            aria-label="Toggle Map Style"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {}}
            className="w-8 h-8 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-neutral-700 active:scale-95"
            title="Recenter Map"
            aria-label="Recenter Map"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <svg
        className="w-full h-full"
        viewBox="0 0 390 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* Neighborhood Landmass Polygons */}
        <path d="M-20 60 L140 30 L170 120 L-10 160 Z" fill="#F8F9FA" />
        <path d="M180 20 L380 -10 L410 110 L190 140 Z" fill="#F9FAFB" />
        <path d="M210 160 L400 130 L420 300 L230 310 Z" fill="#FAFCFD" />
        <path d="M-10 240 L160 210 L180 390 L-10 420 Z" fill="#F8F9FA" />
        <path d="M190 340 L410 320 L400 520 L210 500 Z" fill="#FAFCFD" />

        {/* Sabarmati River Corridor (Ahmedabad signature geography) */}
        <path
          d="M310 -20 Q290 150 280 260 T260 540"
          stroke="#CBE3F5"
          strokeWidth="32"
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="270"
          y="280"
          fill="#7BA4C7"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1"
          transform="rotate(82 270 280)"
        >
          SABARMATI RIVER
        </text>

        {/* Road Arteries (Light Gray with White Core) */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Ashram Road */}
          <line x1="120" y1="-20" x2="160" y2="540" stroke="#FFFFFF" strokeWidth="8" />
          <line x1="120" y1="-20" x2="160" y2="540" stroke="#E2E7EE" strokeWidth="10" strokeOpacity="0.6" />

          {/* CG Road */}
          <line x1="50" y1="-20" x2="90" y2="540" stroke="#FFFFFF" strokeWidth="7" />
          <line x1="50" y1="-20" x2="90" y2="540" stroke="#E2E7EE" strokeWidth="9" strokeOpacity="0.5" />

          {/* Cross Street 1: University Road */}
          <line x1="-20" y1="90" x2="420" y2="50" stroke="#FFFFFF" strokeWidth="8" />
          <line x1="-20" y1="90" x2="420" y2="50" stroke="#E2E7EE" strokeWidth="10" strokeOpacity="0.6" />

          {/* Cross Street 2: Ellisbridge Link */}
          <line x1="-20" y1="280" x2="420" y2="230" stroke="#FFFFFF" strokeWidth="7" />
          <line x1="-20" y1="280" x2="420" y2="230" stroke="#E2E7EE" strokeWidth="9" strokeOpacity="0.5" />

          {/* Cross Street 3: Paldi / Anjali */}
          <line x1="40" y1="360" x2="380" y2="460" stroke="#FFFFFF" strokeWidth="6" />
          <line x1="40" y1="360" x2="380" y2="460" stroke="#E2E7EE" strokeWidth="8" strokeOpacity="0.6" />

          {/* Diagonals */}
          <path d="M110 70 L210 220 L270 380" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M110 70 L210 220 L270 380" fill="none" stroke="#E2E7EE" strokeWidth="8" strokeOpacity="0.6" />
        </g>

        {/* Ahmedabad Locality Labels (Replaced London reference names!) */}
        <g fill="#5F6C7B" fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="700" letterSpacing="0.4">
          <text x="75" y="145" textAnchor="middle">
            NAVRANGPURA
          </text>
          <text x="75" y="156" fill="#8C98A6" fontSize="7.5">
            Zone 1 • West
          </text>

          <text x="210" y="110" textAnchor="middle">
            USMANPURA
          </text>
          <text x="210" y="121" fill="#8C98A6" fontSize="7.5">
            Riverfront West
          </text>

          <text x="70" y="470" textAnchor="middle">
            PALDI
          </text>
          <text x="70" y="481" fill="#8C98A6" fontSize="7.5">
            Bhattha Area
          </text>

          <text x="210" y="460" textAnchor="middle">
            ELLISBRIDGE
          </text>
          <text x="210" y="471" fill="#8C98A6" fontSize="7.5">
            VS Hospital Sector
          </text>
        </g>

        {/* Red Route Vector (Patient -> Assigned Ambulance) */}
        {activeMission && (
          <g>
            <path
              d="M135 155 L120 170 L122 220 L150 275 L152 295 L168 330 L165 350 L155 440"
              stroke="#EA3836"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M135 155 L120 170 L122 220 L150 275 L152 295 L168 330 L165 350 L155 440"
              stroke="#FF7B79"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Patient Pin Location */}
        <g transform={`translate(${patientPos.x}, ${patientPos.y})`} filter="url(#soft-shadow)">
          <path
            d="M0 0 C-6 0 -11 5 -11 11 C-11 19 0 28 0 28 C0 28 11 19 11 11 C11 5 6 0 0 0 Z"
            fill="#EA3836"
          />
          <circle cx="0" cy="10" r="4.5" fill="#FFFFFF" />
        </g>

        {/* Ambulance Vehicle Marker with Radar Pulse */}
        <g transform={`translate(${ambulancePos.x}, ${ambulancePos.y})`}>
          {/* Pulse radar wave */}
          {isEnRoute && <circle cx="0" cy="0" r="28" fill="#EA3836" className="animate-radar" />}

          {/* Vehicle Bubble */}
          <g filter="url(#soft-shadow)">
            <rect
              x="-18"
              y="-24"
              width="36"
              height="48"
              rx="10"
              fill="#B42318"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            {/* Windshield */}
            <rect x="-11" y="-19" width="22" height="10" rx="3" fill="#85160F" />
            {/* Medical White Cross */}
            <path
              d="M-2 -3 H2 V-7 H5 V-3 H9 V1 H5 V5 H2 V1 H-2 Z"
              fill="#FFFFFF"
              transform="translate(-1.5, 4)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

