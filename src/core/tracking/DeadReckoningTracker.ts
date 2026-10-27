/**
 * src/core/tracking/DeadReckoningTracker.ts
 *
 * Smooth dead-reckoning marker interpolation between low-frequency GPS/SMS pings.
 * Uses Turf.js along(), destination(), nearestPointOnLine() for geometric projection.
 *
 * Two modes:
 * - V1: No route geometry → project along packet heading via destination().
 * - V2: Route line available → advance along route line with along().
 *
 * Exponential smoothing (tau = 0.7s) prevents jarring visual snap on arrival of new fix.
 */

import destination from '@turf/destination';
import along from '@turf/along';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { point, lineString } from '@turf/helpers';

export interface TelemetryFix {
  lat: number;
  lon: number;
  kmh: number;
  hdg: number;
  fixT: number;
  seq: number;
}

export interface MarkerState {
  lat: number;
  lon: number;
  staleS: number;
  predicting: boolean;
}

const MAX_PREDICT_S = 45; // Do not extrapolate beyond 45 seconds of silence
const TAU_S = 0.7;        // Exponential smoothing time constant

export class DeadReckoningTracker {
  private anchor?: TelemetryFix;
  private route?: ReturnType<typeof lineString>;
  private routeOffsetM = 0;
  private shown?: { lat: number; lon: number };
  private lastSeq = -1;

  /** Set polyline route coordinates as [lon, lat][] array. */
  setRoute(coords: [number, number][] | undefined): void {
    this.route = coords && coords.length > 1 ? lineString(coords) : undefined;
    if (this.route && this.anchor) {
      const np = nearestPointOnLine(this.route, point([this.anchor.lon, this.anchor.lat]), { units: 'meters' });
      this.routeOffsetM = (np.properties as { location?: number }).location ?? 0;
    }
  }

  /**
   * Called when a new telemetry ping arrives.
   * Drops out-of-order or duplicate sequence packets.
   */
  onFix(f: TelemetryFix): boolean {
    if (f.seq <= this.lastSeq) return false;
    this.lastSeq = f.seq;
    this.anchor = f;

    if (this.route) {
      const np = nearestPointOnLine(this.route, point([f.lon, f.lat]), { units: 'meters' });
      this.routeOffsetM = (np.properties as { location?: number }).location ?? 0;
    }
    return true;
  }

  /**
   * Called every animation frame.
   * @param nowMs Current timestamp in ms.
   * @param dtS Delta time since last frame in seconds.
   * @returns Current visual marker coordinates and staleness metrics, or null if no fix received yet.
   */
  frame(nowMs: number, dtS: number): MarkerState | null {
    const a = this.anchor;
    if (!a) return null;

    const ageS = Math.max(0, (nowMs - a.fixT) / 1000);
    const horizon = Math.min(ageS, MAX_PREDICT_S);
    const distM = (a.kmh / 3.6) * horizon;

    let target: { lat: number; lon: number };

    if (this.route) {
      const p = along(this.route, this.routeOffsetM + distM, { units: 'meters' }).geometry.coordinates;
      target = { lat: p[1], lon: p[0] };
    } else {
      const p = destination([a.lon, a.lat], distM, a.hdg, { units: 'meters' }).geometry.coordinates;
      target = { lat: p[1], lon: p[0] };
    }

    if (!this.shown) {
      this.shown = target;
    }

    // Exponential smoothing
    const k = 1 - Math.exp(-dtS / TAU_S);
    this.shown = {
      lat: this.shown.lat + (target.lat - this.shown.lat) * k,
      lon: this.shown.lon + (target.lon - this.shown.lon) * k,
    };

    return {
      lat: this.shown.lat,
      lon: this.shown.lon,
      staleS: ageS,
      predicting: ageS > 1 && ageS <= MAX_PREDICT_S,
    };
  }

  getLastSeq(): number {
    return this.lastSeq;
  }

  reset(): void {
    this.anchor = undefined;
    this.route = undefined;
    this.shown = undefined;
    this.routeOffsetM = 0;
    this.lastSeq = -1;
  }
}
