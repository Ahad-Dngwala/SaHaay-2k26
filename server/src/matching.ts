/**
 * server/src/matching.ts
 * Spatial grid index for fast ambulance proximity search.
 * Claim: dispatch search < 200 ms at 10k ambulances (measured by bench.ts).
 */

import type { Ambulance } from './types';

// ── Haversine (no external lib needed) ───────────────────────────────────────

const R_M = 6_371_000; // Earth radius in metres

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Spatial grid index ────────────────────────────────────────────────────────

/**
 * Divides the world into cells of CELL_DEG degrees.
 * 0.01° ≈ 1.11 km; good for our 500 m–8 km search range.
 */
const CELL_DEG = 0.01;

export class SpatialGrid {
  private cells = new Map<string, string[]>(); // cellKey → ambulance IDs
  private positions = new Map<string, { lat: number; lon: number }>();

  private cellKey(lat: number, lon: number): string {
    return `${Math.floor(lat / CELL_DEG)},${Math.floor(lon / CELL_DEG)}`;
  }

  /** Insert or update an ambulance position in the grid. O(1). */
  upsert(id: string, lat: number, lon: number): void {
    const oldPos = this.positions.get(id);
    if (oldPos) {
      const oldKey = this.cellKey(oldPos.lat, oldPos.lon);
      const cell = this.cells.get(oldKey);
      if (cell) {
        const idx = cell.indexOf(id);
        if (idx >= 0) cell.splice(idx, 1);
        if (cell.length === 0) this.cells.delete(oldKey);
      }
    }
    const key = this.cellKey(lat, lon);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key)!.push(id);
    this.positions.set(id, { lat, lon });
  }

  /** Remove an ambulance from the index. O(cell size). */
  remove(id: string): void {
    const pos = this.positions.get(id);
    if (!pos) return;
    const key = this.cellKey(pos.lat, pos.lon);
    const cell = this.cells.get(key);
    if (cell) {
      const idx = cell.indexOf(id);
      if (idx >= 0) cell.splice(idx, 1);
      if (cell.length === 0) this.cells.delete(key);
    }
    this.positions.delete(id);
  }

  /**
   * Find all ambulance IDs within radiusM of (lat, lon).
   * Returns IDs sorted nearest-first with their distances.
   * Time: O(number of cells in bounding box + candidates found).
   */
  query(lat: number, lon: number, radiusM: number): Array<{ id: string; distM: number }> {
    const latDelta = (radiusM / R_M) * (180 / Math.PI);
    const lonDelta = latDelta / Math.cos(lat * Math.PI / 180);
    const latCells = Math.ceil(latDelta / CELL_DEG) + 1;
    const lonCells = Math.ceil(lonDelta / CELL_DEG) + 1;
    const minLatCell = Math.floor((lat - latDelta) / CELL_DEG);
    const minLonCell = Math.floor((lon - lonDelta) / CELL_DEG);

    const candidates: Array<{ id: string; distM: number }> = [];

    for (let i = -1; i <= latCells + 1; i++) {
      for (let j = -1; j <= lonCells + 1; j++) {
        const key = `${minLatCell + i},${minLonCell + j}`;
        const cell = this.cells.get(key);
        if (!cell) continue;
        for (const id of cell) {
          const pos = this.positions.get(id)!;
          const distM = haversineM(lat, lon, pos.lat, pos.lon);
          if (distM <= radiusM) {
            candidates.push({ id, distM });
          }
        }
      }
    }

    return candidates.sort((a, b) => a.distM - b.distM);
  }

  get size(): number {
    return this.positions.size;
  }
}

// Singleton grid — rebuilt from state on startup and kept in sync
export const grid = new SpatialGrid();

/** Sync the grid with an ambulance map. Call on startup and after updates. */
export function syncGrid(ambulances: Map<string, Ambulance>): void {
  for (const ambu of ambulances.values()) {
    grid.upsert(ambu.id, ambu.lat, ambu.lon);
  }
}

/**
 * Find AVAILABLE ambulances in radiusM, sorted nearest-first.
 * Returns IDs and distances (metres).
 */
export function findAvailable(
  ambulances: Map<string, Ambulance>,
  lat: number,
  lon: number,
  radiusM: number,
): Array<{ id: string; distM: number }> {
  const candidates = grid.query(lat, lon, radiusM);
  return candidates.filter(c => {
    const ambu = ambulances.get(c.id);
    return ambu && ambu.status === 'AVAILABLE';
  });
}
