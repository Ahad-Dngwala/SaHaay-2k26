/**
 * server/src/state.ts
 * Single in-memory state for the SaHaay dispatch server.
 * Node is single-threaded: no concurrent mutation concerns.
 */

import { Ambulance, Mission, AuditEntry } from './types';

export const state = {
  ambulances: new Map<string, Ambulance>(),
  missions:   new Map<string, Mission>(),
  audit:      [] as AuditEntry[],
  /** Active expansion timers: missionId → NodeJS.Timeout */
  expansionTimers: new Map<string, NodeJS.Timeout>(),
  /** DEMO_TIME_SCALE: set via API or Demo Director; default 1 */
  demoTimeScale: 1,
};

/** Reset all state (for Demo Director "Reset world") */
export function resetState(): void {
  // Cancel all expansion timers
  for (const timer of state.expansionTimers.values()) {
    clearTimeout(timer);
  }
  state.ambulances.clear();
  state.missions.clear();
  state.audit.length = 0;
  state.expansionTimers.clear();
  state.demoTimeScale = 1;
}
