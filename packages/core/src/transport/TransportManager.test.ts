/**
 * src/core/transport/TransportManager.test.ts
 * Unit tests for the TransportManager state machine.
 */

import { transportReducer } from './TransportManager';
import type { TransportManagerState } from './types';

const INITIAL: TransportManagerState = {
  current: 'ONLINE',
  consecutiveFailures: 0,
  outboxCount: 0,
  lastAttemptAt: 0,
  blackoutForced: false,
};

function failures(n: number, state = INITIAL): TransportManagerState {
  let s = state;
  for (let i = 0; i < n; i++) s = transportReducer(s, { type: 'HTTP_FAILURE' });
  return s;
}

describe('TransportManager reducer', () => {
  test('ONLINE → stays ONLINE after 1-2 failures', () => {
    expect(failures(1).current).toBe('ONLINE');
    expect(failures(2).current).toBe('ONLINE');
  });

  test('ONLINE → DEGRADED after 3 failures', () => {
    expect(failures(3).current).toBe('DEGRADED');
  });

  test('ONLINE → OFFLINE_SMS after 6 failures', () => {
    expect(failures(6).current).toBe('OFFLINE_SMS');
  });

  test('OFFLINE_SMS → RECOVERED after HTTP_SUCCESS', () => {
    const s = failures(6);
    expect(s.current).toBe('OFFLINE_SMS');
    const recovered = transportReducer(s, { type: 'HTTP_SUCCESS' });
    expect(recovered.current).toBe('RECOVERED');
  });

  test('RECOVERED → ONLINE after OUTBOX_DRAINED', () => {
    const s = transportReducer(failures(6), { type: 'HTTP_SUCCESS' });
    const online = transportReducer(s, { type: 'OUTBOX_DRAINED' });
    expect(online.current).toBe('ONLINE');
  });

  test('FORCE_BLACKOUT → immediate OFFLINE_SMS', () => {
    const s = transportReducer(INITIAL, { type: 'FORCE_BLACKOUT', enabled: true });
    expect(s.current).toBe('OFFLINE_SMS');
    expect(s.blackoutForced).toBe(true);
  });

  test('FORCE_BLACKOUT off → ONLINE when no failures', () => {
    const blackout = transportReducer(INITIAL, { type: 'FORCE_BLACKOUT', enabled: true });
    const back = transportReducer(blackout, { type: 'FORCE_BLACKOUT', enabled: false });
    expect(back.current).toBe('ONLINE');
    expect(back.blackoutForced).toBe(false);
  });

  test('HTTP_SUCCESS when ONLINE resets failures counter', () => {
    const degraded = failures(4);
    const recovered = transportReducer(degraded, { type: 'HTTP_SUCCESS' });
    expect(recovered.consecutiveFailures).toBe(0);
    expect(recovered.current).toBe('RECOVERED'); // was DEGRADED
  });

  test('consecutive failures count increments correctly', () => {
    const s = failures(5);
    expect(s.consecutiveFailures).toBe(5);
  });

  test('HTTP_FAILURE during forced blackout stays OFFLINE_SMS', () => {
    const blackout = transportReducer(INITIAL, { type: 'FORCE_BLACKOUT', enabled: true });
    const s = transportReducer(blackout, { type: 'HTTP_FAILURE' });
    expect(s.current).toBe('OFFLINE_SMS');
  });
});
