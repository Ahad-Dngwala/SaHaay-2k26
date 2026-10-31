#!/usr/bin/env node
/**
 * scripts/gen-signals.ts
 * Queries OpenStreetMap Overpass API for highway=traffic_signals inside
 * Ahmedabad bounding box and saves to data/signals.json.
 * Spec section 6.1: Runtime never depends on Overpass at runtime.
 */

import fs from 'fs';
import path from 'path';

const AHM_BBOX = [22.94, 72.47, 23.12, 72.68]; // [south, west, north, east]

async function fetchOsmSignals(): Promise<void> {
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="traffic_signals"](${AHM_BBOX[0]},${AHM_BBOX[1]},${AHM_BBOX[2]},${AHM_BBOX[3]});
    );
    out body 50;
  `;

  console.log('Querying OSM Overpass API for traffic signals in Ahmedabad...');
  try {
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!resp.ok) {
      console.warn(`Overpass returned HTTP ${resp.status}, preserving existing dataset.`);
      return;
    }

    const data = await resp.json() as any;
    const elements = data.elements || [];
    console.log(`Fetched ${elements.length} raw signal nodes from OSM.`);

    const formatted = elements.map((el: any, idx: number) => ({
      id: `osm-sig-${el.id || idx + 1}`,
      name: el.tags?.name || `OSM Traffic Signal ${idx + 1}`,
      lat: el.lat,
      lon: el.lon,
      area: el.lat > 23.04 ? 'Ahmedabad North' : (el.lon < 72.55 ? 'Ahmedabad West' : 'Ahmedabad Central'),
      source: 'OSM',
      fetchedAt: new Date().toISOString(),
    }));

    const outputPath = path.resolve(__dirname, '../data/signals.json');
    if (formatted.length > 0) {
      fs.writeFileSync(outputPath, JSON.stringify(formatted, null, 2), 'utf8');
      console.log(`Saved ${formatted.length} signals to ${outputPath}`);
    }
  } catch (err: any) {
    console.warn(`Could not reach Overpass: ${err.message}. Preserving offline signals.json.`);
  }
}

if (require.main === module) {
  fetchOsmSignals().catch(console.error);
}
