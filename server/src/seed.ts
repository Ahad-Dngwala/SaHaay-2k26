/**
 * server/src/seed.ts
 * Seed 25 ambulances distributed across real Ahmedabad neighbourhoods.
 * Each has a driver name, vehicle number, GPS position, and initial AVAILABLE status.
 */

import { state } from './state';
import type { Ambulance } from './types';

const SEED_AMBULANCES: Omit<Ambulance, 'id'>[] = [
  // Navrangpura cluster
  { driverName: 'Rajesh Patel',   vehicleNo: 'GJ01AB1234', lat: 23.0330, lon: 72.5607, status: 'AVAILABLE', heading:  45, speedKmh: 0, zone: 'Navrangpura' },
  { driverName: 'Mehul Shah',     vehicleNo: 'GJ01AB1235', lat: 23.0290, lon: 72.5620, status: 'AVAILABLE', heading:  90, speedKmh: 0, zone: 'Navrangpura' },

  // Maninagar cluster
  { driverName: 'Suresh Kumar',   vehicleNo: 'GJ01CD2100', lat: 22.9944, lon: 72.6036, status: 'AVAILABLE', heading: 180, speedKmh: 0, zone: 'Maninagar' },
  { driverName: 'Dinesh Verma',   vehicleNo: 'GJ01CD2101', lat: 22.9900, lon: 72.6080, status: 'AVAILABLE', heading: 270, speedKmh: 0, zone: 'Maninagar' },

  // Satellite cluster
  { driverName: 'Amit Trivedi',   vehicleNo: 'GJ01EF3300', lat: 23.0170, lon: 72.5100, status: 'AVAILABLE', heading:   0, speedKmh: 0, zone: 'Satellite' },
  { driverName: 'Nikhil Joshi',   vehicleNo: 'GJ01EF3301', lat: 23.0130, lon: 72.5130, status: 'AVAILABLE', heading: 135, speedKmh: 0, zone: 'Satellite' },

  // Gota cluster
  { driverName: 'Vikram Singh',   vehicleNo: 'GJ01GH4400', lat: 23.1000, lon: 72.5500, status: 'AVAILABLE', heading:  90, speedKmh: 0, zone: 'Gota' },
  { driverName: 'Rohit Parmar',   vehicleNo: 'GJ01GH4401', lat: 23.1050, lon: 72.5450, status: 'AVAILABLE', heading: 225, speedKmh: 0, zone: 'Gota' },

  // Vastrapur cluster
  { driverName: 'Prakash Nair',   vehicleNo: 'GJ01IJ5500', lat: 23.0387, lon: 72.5253, status: 'AVAILABLE', heading:  60, speedKmh: 0, zone: 'Vastrapur' },
  { driverName: 'Anand Desai',    vehicleNo: 'GJ01IJ5501', lat: 23.0420, lon: 72.5210, status: 'AVAILABLE', heading: 300, speedKmh: 0, zone: 'Vastrapur' },

  // Bodakdev
  { driverName: 'Ketan Mehta',    vehicleNo: 'GJ01KL6600', lat: 23.0470, lon: 72.5040, status: 'AVAILABLE', heading: 180, speedKmh: 0, zone: 'Bodakdev' },

  // Paldi
  { driverName: 'Sandip Rao',     vehicleNo: 'GJ01MN7700', lat: 23.0063, lon: 72.5756, status: 'AVAILABLE', heading:  45, speedKmh: 0, zone: 'Paldi' },

  // Sabarmati / Motera
  { driverName: 'Hemant Bhatt',   vehicleNo: 'GJ01OP8800', lat: 23.0714, lon: 72.5811, status: 'AVAILABLE', heading:  90, speedKmh: 0, zone: 'Sabarmati' },
  { driverName: 'Darshan Solanki',vehicleNo: 'GJ01OP8801', lat: 23.0992, lon: 72.5906, status: 'AVAILABLE', heading: 270, speedKmh: 0, zone: 'Motera' },

  // Chandkheda
  { driverName: 'Nilesh Prajapati',vehicleNo:'GJ01QR9900', lat: 23.1100, lon: 72.6000, status: 'AVAILABLE', heading: 135, speedKmh: 0, zone: 'Chandkheda' },

  // Nikol / Naroda (East Ahmedabad)
  { driverName: 'Jayesh Gamit',   vehicleNo: 'GJ01ST1010', lat: 23.0467, lon: 72.6500, status: 'AVAILABLE', heading:   0, speedKmh: 0, zone: 'Nikol' },
  { driverName: 'Bhavesh Rathod', vehicleNo: 'GJ01ST1011', lat: 23.0873, lon: 72.6430, status: 'AVAILABLE', heading: 180, speedKmh: 0, zone: 'Naroda' },

  // CTM / Odhav
  { driverName: 'Mukesh Chauhan', vehicleNo: 'GJ01UV1111', lat: 23.0308, lon: 72.6430, status: 'AVAILABLE', heading: 225, speedKmh: 0, zone: 'Odhav' },

  // Thaltej / Sola Road
  { driverName: 'Alok Chauhan',   vehicleNo: 'GJ01WX1212', lat: 23.0594, lon: 72.5105, status: 'AVAILABLE', heading:  30, speedKmh: 0, zone: 'Thaltej' },
  { driverName: 'Prerak Shah',    vehicleNo: 'GJ01WX1213', lat: 23.0667, lon: 72.5500, status: 'AVAILABLE', heading: 120, speedKmh: 0, zone: 'Sola' },

  // Prahlad Nagar / Bopal
  { driverName: 'Sanjay Pandya',  vehicleNo: 'GJ01YZ1313', lat: 23.0239, lon: 72.5074, status: 'AVAILABLE', heading: 270, speedKmh: 0, zone: 'Prahlad Nagar' },
  { driverName: 'Tushar Vyas',    vehicleNo: 'GJ01YZ1314', lat: 23.0200, lon: 72.4700, status: 'AVAILABLE', heading:   0, speedKmh: 0, zone: 'Bopal' },

  // Kalupur (Old City)
  { driverName: 'Dipak Panchal',  vehicleNo: 'GJ01ZA1414', lat: 23.0256, lon: 72.5953, status: 'AVAILABLE', heading:  90, speedKmh: 0, zone: 'Kalupur' },

  // Vatva (South-East)
  { driverName: 'Gopal Makwana',  vehicleNo: 'GJ01ZB1515', lat: 22.9600, lon: 72.6300, status: 'AVAILABLE', heading: 315, speedKmh: 0, zone: 'Vatva' },

  // Sarkhej (South-West)
  { driverName: 'Haresh Gohil',   vehicleNo: 'GJ01ZC1616', lat: 22.9727, lon: 72.5088, status: 'AVAILABLE', heading: 180, speedKmh: 0, zone: 'Sarkhej' },
];

/** Populate state.ambulances from seed data. Idempotent (clears first). */
export function seedAmbulances(): void {
  state.ambulances.clear();
  SEED_AMBULANCES.forEach((ambu, i) => {
    const id = `AMB-${String(i + 1).padStart(2, '0')}`;
    state.ambulances.set(id, { id, ...ambu });
  });
  console.log(`🌱 Seeded ${state.ambulances.size} ambulances across Ahmedabad`);
}
