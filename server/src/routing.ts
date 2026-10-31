/**
 * server/src/routing.ts
 * Real routing provider layer with OsrmProvider and Haversine fallback.
 * Computes polyline coordinates, driving distance, duration, and per-step durations.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

export interface RouteResult {
  provider: 'osrm' | 'haversine';
  distanceM: number;
  durationS: number;
  geometry: [number, number][]; // [lat, lon][]
  steps?: Array<{
    distanceM: number;
    durationS: number;
    name: string;
  }>;
}

export interface RoutingProvider {
  getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult>;
}

// In-memory cache by origin/destination cell (rounded to ~100m)
const routeCache = new Map<string, { result: RouteResult; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60s

function cacheKey(o: LatLon, d: LatLon): string {
  return `${o.lat.toFixed(3)},${o.lon.toFixed(3)}->${d.lat.toFixed(3)},${d.lon.toFixed(3)}`;
}

export class HaversineFallbackProvider implements RoutingProvider {
  async getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult> {
    const R = 6371e3; // metres
    const φ1 = (origin.lat * Math.PI) / 180;
    const φ2 = (destination.lat * Math.PI) / 180;
    const Δφ = ((destination.lat - origin.lat) * Math.PI) / 180;
    const Δλ = ((destination.lon - origin.lon) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceM = Math.round(R * c);

    // Assume average speed 36 km/h = 10 m/s
    const durationS = Math.max(10, Math.round(distanceM / 10));

    // Simple interpolated line
    const stepsCount = 10;
    const geometry: [number, number][] = [];
    for (let i = 0; i <= stepsCount; i++) {
      const frac = i / stepsCount;
      geometry.push([
        Number((origin.lat + (destination.lat - origin.lat) * frac).toFixed(5)),
        Number((origin.lon + (destination.lon - origin.lon) * frac).toFixed(5)),
      ]);
    }

    return {
      provider: 'haversine',
      distanceM,
      durationS,
      geometry,
    };
  }
}

export class OsrmProvider implements RoutingProvider {
  private baseUrl: string;
  private fallback: HaversineFallbackProvider;

  constructor(baseUrl = 'http://router.project-osrm.org') {
    this.baseUrl = baseUrl;
    this.fallback = new HaversineFallbackProvider();
  }

  async getRoute(origin: LatLon, destination: LatLon): Promise<RouteResult> {
    const key = cacheKey(origin, destination);
    const cached = routeCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.result;
    }

    const url = `${this.baseUrl}/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=true`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`OSRM responded with HTTP ${res.status}`);
      }

      const data = (await res.json()) as any;
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No OSRM route found');
      }

      const route = data.routes[0];
      const coords = route.geometry.coordinates as [number, number][]; // [lon, lat]
      const geometry: [number, number][] = coords.map(([lon, lat]) => [lat, lon]);

      const steps = (route.legs?.[0]?.steps ?? []).map((s: any) => ({
        distanceM: Math.round(s.distance),
        durationS: Math.round(s.duration),
        name: s.name || 'Road',
      }));

      const result: RouteResult = {
        provider: 'osrm',
        distanceM: Math.round(route.distance),
        durationS: Math.round(route.duration),
        geometry,
        steps,
      };

      routeCache.set(key, { result, cachedAt: Date.now() });
      return result;
    } catch (err) {
      // Fallback gracefully on timeout or network outage without breaking dispatch
      const fallbackResult = await this.fallback.getRoute(origin, destination);
      return fallbackResult;
    }
  }
}

export const defaultRoutingProvider = new OsrmProvider();
