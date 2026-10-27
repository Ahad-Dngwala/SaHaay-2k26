/**
 * server/src/state.ts
 * Single in-memory state for the SaHaay dispatch server.
 * Node is single-threaded: no concurrent mutation concerns.
 */

import { Ambulance, Mission, AuditEntry } from './types';

export interface ActiveTimer {
  timer: NodeJS.Timeout;
  startedAt: number;
  nominalDurationS: number;
}

export const state = {
  ambulances: new Map<string, Ambulance>(),
  missions:   new Map<string, Mission>(),
  audit:      [] as AuditEntry[],
  /** Active expansion timers: missionId → ActiveTimer */
  expansionTimers: new Map<string, ActiveTimer>(),
  /** DEMO_TIME_SCALE: set via API or Demo Director; default 1 */
  demoTimeScale: 1,
};

/** Reset all state (for Demo Director "Reset world") */
export function resetState(): void {
  // Cancel all expansion timers
  for (const item of state.expansionTimers.values()) {
    clearTimeout(item.timer);
  }
  state.ambulances.clear();
  state.missions.clear();
  state.audit.length = 0;
  state.expansionTimers.clear();
  state.demoTimeScale = 1;
}
