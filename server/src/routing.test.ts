/**
 * server/src/routing.test.ts
 * Tests for RoutingProvider, OsrmProvider, and nearest hospital selection.
 */

import { HaversineFallbackProvider, OsrmProvider } from './routing';
import { findNearestHospital } from './hospitals';

describe('M11: Routing & Real Geo Features', () => {
  const origin = { lat: 23.0338, lon: 72.5606 }; // Navrangpura
  const dest = { lat: 23.0526, lon: 72.5971 }; // Civil Hospital

  test('HaversineFallbackProvider computes realistic distance and duration', async () => {
    const provider = new HaversineFallbackProvider();
    const route = await provider.getRoute(origin, dest);

    expect(route.provider).toBe('haversine');
    expect(route.distanceM).toBeGreaterThan(3000);
    expect(route.distanceM).toBeLessThan(8000);
    expect(route.durationS).toBeGreaterThan(100);
    expect(route.geometry.length).toBeGreaterThan(5);
  });

  test('OsrmProvider returns route with coordinates or falls back gracefully', async () => {
    const provider = new OsrmProvider();
    const route = await provider.getRoute(origin, dest);

    expect(['osrm', 'haversine']).toContain(route.provider);
    expect(route.distanceM).toBeGreaterThan(2000);
    expect(route.durationS).toBeGreaterThan(60);
    expect(route.geometry.length).toBeGreaterThan(2);
  });

  test('findNearestHospital picks closest hospital with valid ETA', async () => {
    const result = await findNearestHospital(origin);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.hospital.name).toBeDefined();
      expect(result.distanceM).toBeGreaterThan(500);
      expect(result.etaS).toBeGreaterThan(30);
    }
  });
});
