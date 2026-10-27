/**
 * scripts/generate-roads.js
 * Generates Ahmedabad arterial road network GeoJSON.
 * Labelled SYNTHETIC with real corridor alignments for Ahmedabad.
 */

const fs = require('fs');
const path = require('path');

const roads = [
  // SG Highway (North-South arterial)
  {
    name: 'Sarkhej - Gandhinagar Highway (SG Highway)',
    type: 'primary',
    coordinates: [
      [72.501, 22.985],
      [72.508, 23.015],
      [72.518, 23.040],
      [72.525, 23.070],
      [72.532, 23.110],
    ],
  },
  // 132 Feet Ring Road
  {
    name: '132 Feet Ring Road (Inner Ring)',
    type: 'primary',
    coordinates: [
      [72.535, 23.005],
      [72.538, 23.035],
      [72.545, 23.065],
      [72.570, 23.075],
      [72.595, 23.060],
      [72.610, 23.025],
      [72.590, 22.995],
      [72.550, 22.990],
      [72.535, 23.005],
    ],
  },
  // Ashram Road (along Sabarmati West)
  {
    name: 'Ashram Road',
    type: 'primary',
    coordinates: [
      [72.572, 23.005],
      [72.574, 23.020],
      [72.576, 23.035],
      [72.578, 23.055],
      [72.580, 23.070],
    ],
  },
  // CG Road (Navrangpura commercial spine)
  {
    name: 'Chimanlal Girdharlal (CG) Road',
    type: 'secondary',
    coordinates: [
      [72.555, 23.018],
      [72.557, 23.032],
      [72.559, 23.042],
    ],
  },
  // Drive-In Road (Thaltej to Helmet Circle)
  {
    name: 'Drive-In Road',
    type: 'secondary',
    coordinates: [
      [72.515, 23.055],
      [72.535, 23.050],
      [72.550, 23.045],
    ],
  },
  // Satellite Road / Jodhpur Cross
  {
    name: 'Satellite Road',
    type: 'secondary',
    coordinates: [
      [72.515, 23.025],
      [72.535, 23.022],
      [72.555, 23.020],
    ],
  },
  // Ellis Bridge & River Crossing
  {
    name: 'Ellis Bridge Arterial',
    type: 'primary',
    coordinates: [
      [72.565, 23.022],
      [72.575, 23.023],
      [72.585, 23.024],
      [72.598, 23.025],
    ],
  },
  // Nehru Bridge Arterial
  {
    name: 'Nehru Bridge Corridor',
    type: 'primary',
    coordinates: [
      [72.568, 23.030],
      [72.578, 23.031],
      [72.588, 23.032],
      [72.602, 23.033],
    ],
  },
  // Gandhi Road / Relief Road (Old City)
  {
    name: 'Gandhi Road',
    type: 'secondary',
    coordinates: [
      [72.585, 23.024],
      [72.595, 23.025],
      [72.610, 23.028],
    ],
  },
  // Maninagar BRTS Spine
  {
    name: 'Maninagar - Kankaria Spine',
    type: 'primary',
    coordinates: [
      [72.605, 22.990],
      [72.602, 23.005],
      [72.598, 23.020],
    ],
  },
  // SP Ring Road (Outer Bypass West)
  {
    name: 'Sardar Patel Ring Road (West Section)',
    type: 'motorway',
    coordinates: [
      [72.475, 22.980],
      [72.480, 23.030],
      [72.490, 23.080],
      [72.510, 23.120],
    ],
  },
  // Vastrapur Lake Connecting Avenue
  {
    name: 'Vastrapur Lake Connecting Road',
    type: 'secondary',
    coordinates: [
      [72.525, 23.035],
      [72.538, 23.038],
      [72.555, 23.036],
    ],
  },
];

const geojson = {
  type: 'FeatureCollection',
  metadata: {
    city: 'Ahmedabad',
    bbox: [72.47, 22.94, 72.68, 23.12],
    synthetic: true,
    generator: 'SaHaay Road Graph Generator',
    source: 'SYNTHETIC road graph aligned with major Ahmedabad corridors',
    generatedAt: new Date().toISOString(),
  },
  features: roads.map((road, idx) => ({
    type: 'Feature',
    id: `road-${idx + 1}`,
    properties: {
      id: idx + 1,
      name: road.name,
      highway: road.type,
      city: 'Ahmedabad',
      synthetic: true,
    },
    geometry: {
      type: 'LineString',
      coordinates: road.coordinates,
    },
  })),
};

const outPath = path.join(__dirname, '..', 'assets', 'ahmedabad-roads.geojson');
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), 'utf8');
console.log(`Generated ${roads.length} Ahmedabad road features to ${outPath}`);
