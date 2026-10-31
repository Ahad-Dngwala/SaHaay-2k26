import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface AmbulanceLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: string;
  vehicleNo: string;
}

interface RealFleetMapProps {
  ambulances: AmbulanceLocation[];
  activeRoute?: [number, number][]; // [lat, lon][]
  patientLocation?: { lat: number; lon: number };
  signals?: Array<{ id: string; lat: number; lon: number; status: string }>;
}

export const RealFleetMap: React.FC<RealFleetMapProps> = ({
  ambulances,
  activeRoute,
  patientLocation,
  signals,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [72.5606, 23.0338], // Ahmedabad
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update ambulances markers
  useEffect(() => {
    if (!map.current) return;

    // Remove obsolete markers
    const currentIds = new Set(ambulances.map((a) => a.id));
    for (const [id, marker] of markers.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    // Add or update markers
    ambulances.forEach((a) => {
      const existing = markers.current.get(a.id);
      if (existing) {
        existing.setLngLat([a.lon, a.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg';
        el.innerText = '🚑';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([a.lon, a.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div class="p-2 text-slate-800">
                <div class="font-bold text-sm">${a.name}</div>
                <div class="text-xs text-slate-500">${a.vehicleNo}</div>
                <div class="text-xs font-semibold mt-1 text-emerald-600">${a.status}</div>
              </div>
            `)
          )
          .addTo(map.current!);

        markers.current.set(a.id, marker);
      }
    });
  }, [ambulances]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden shadow-inner border border-slate-800">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 shadow">
        MapLibre GL JS — Real GPS Telemetry
      </div>
    </div>
  );
};
