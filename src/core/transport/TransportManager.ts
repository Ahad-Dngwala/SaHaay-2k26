/**
 * src/core/transport/TransportManager.ts
 *
 * State machine: ONLINE → DEGRADED → OFFLINE_SMS → RECOVERED
 *
 * - ONLINE:      HTTP works fine; send via HttpTransport.
 * - DEGRADED:    HTTP failing but not yet giving up; retrying with backoff.
 * - OFFLINE_SMS: HTTP totally offline (forced blackout or N consecutive failures);
 *                route through SimulatedCarrier (SMS token to /sms/inbound).
 * - RECOVERED:   HTTP is back; draining the outbox before reverting to ONLINE.
 *
 * Pure reducer-style state transitions for easy unit testing.
 * Idempotency: duplicate messages (same id) are deduplicated in the outbox.
 * Visible status: getState() for the UI status chip.
 */

import type { Transport, OutboundMessage, Ack, TransportState, TransportManagerState } from './types';

const FAILURE_THRESHOLD  = 3;    // consecutive HTTP failures → DEGRADED
const SMS_THRESHOLD      = 6;    // consecutive HTTP failures → OFFLINE_SMS
const BACKOFF_BASE_MS    = 1000;
const BACKOFF_MAX_MS     = 30000;

interface OutboxItem {
  msg: OutboundMessage;
  attempts: number;
  nextRetryAt: number;
}

// ── Pure state reducer ────────────────────────────────────────────────────────

type TransportEvent =
  | { type: 'HTTP_SUCCESS' }
  | { type: 'HTTP_FAILURE' }
  | { type: 'FORCE_BLACKOUT'; enabled: boolean }
  | { type: 'OUTBOX_DRAINED' };

export function transportReducer(
  state: TransportManagerState,
  event: TransportEvent,
): TransportManagerState {
  switch (event.type) {
    case 'FORCE_BLACKOUT':
      return {
        ...state,
        blackoutForced: event.enabled,
        current: event.enabled ? 'OFFLINE_SMS' : 'ONLINE',
        consecutiveFailures: event.enabled ? SMS_THRESHOLD : 0,
      };

    case 'HTTP_SUCCESS':
      if (state.current === 'OFFLINE_SMS' || state.current === 'DEGRADED') {
        return { ...state, current: 'RECOVERED', consecutiveFailures: 0 };
      }
      return { ...state, current: 'ONLINE', consecutiveFailures: 0 };

    case 'HTTP_FAILURE': {
      const failures = state.consecutiveFailures + 1;
      let next: TransportState = state.current;
      if (failures >= SMS_THRESHOLD) next = 'OFFLINE_SMS';
      else if (failures >= FAILURE_THRESHOLD) next = 'DEGRADED';
      return { ...state, consecutiveFailures: failures, current: state.blackoutForced ? 'OFFLINE_SMS' : next };
    }

    case 'OUTBOX_DRAINED':
      if (state.current === 'RECOVERED') return { ...state, current: 'ONLINE' };
      return state;

    default:
      return state;
  }
}

// ── TransportManager class ────────────────────────────────────────────────────

export class TransportManager {
  private state: TransportManagerState;
  private outbox: Map<string, OutboxItem> = new Map();
  private listeners: Array<(s: TransportManagerState) => void> = [];

  constructor(
    private httpTransport: Transport,
    private smsTransport:  Transport,
  ) {
    this.state = {
      current: 'ONLINE',
      consecutiveFailures: 0,
      outboxCount: 0,
      lastAttemptAt: 0,
      blackoutForced: false,
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async send(msg: OutboundMessage): Promise<Ack> {
    // Deduplicate: if already in outbox, return a pending ack
    if (this.outbox.has(msg.id)) {
      return { ok: false, error: 'duplicate: queued' };
    }

    if (this.state.current === 'OFFLINE_SMS') {
      return this._sendSms(msg);
    }

    // Try HTTP first
    try {
      const ack = await this.httpTransport.send(msg);
      this._transition({ type: 'HTTP_SUCCESS' });
      this._drainOutbox();
      return ack;
    } catch (err) {
      this._transition({ type: 'HTTP_FAILURE' });
      // Queue in outbox for retry, fallback to SMS immediately
      this._enqueue(msg);
      return this._sendSms(msg);
    }
  }

  /** Force network blackout (Demo Director toggle). */
  setBlackout(enabled: boolean): void {
    this._transition({ type: 'FORCE_BLACKOUT', enabled });
  }

  getState(): TransportManagerState {
    return { ...this.state, outboxCount: this.outbox.size };
  }

  onStateChange(listener: (s: TransportManagerState) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private _transition(event: TransportEvent): void {
    const next = transportReducer(this.state, event);
    if (next.current !== this.state.current) {
      this.state = next;
      this._emit();
    } else {
      this.state = next;
    }
  }

  private _emit(): void {
    const s = this.getState();
    for (const l of this.listeners) l(s);
  }

  private async _sendSms(msg: OutboundMessage): Promise<Ack> {
    if (!msg.token) return { ok: false, error: 'no SMS token for offline send' };
    try {
      return await this.smsTransport.send(msg);
    } catch (err) {
      return { ok: false, error: `SMS send failed: ${(err as Error).message}` };
    }
  }

  private _enqueue(msg: OutboundMessage): void {
    this.outbox.set(msg.id, { msg, attempts: 0, nextRetryAt: Date.now() + BACKOFF_BASE_MS });
    this._emit();
  }

  private async _drainOutbox(): Promise<void> {
    if (this.outbox.size === 0) {
      this._transition({ type: 'OUTBOX_DRAINED' });
      return;
    }
    const now = Date.now();
    for (const [id, item] of this.outbox.entries()) {
      if (item.nextRetryAt > now) continue;
      try {
        await this.httpTransport.send(item.msg);
        this.outbox.delete(id);
        this._transition({ type: 'HTTP_SUCCESS' });
      } catch {
        item.attempts++;
        const backoff = Math.min(BACKOFF_BASE_MS * 2 ** item.attempts, BACKOFF_MAX_MS);
        item.nextRetryAt = Date.now() + backoff;
        this._transition({ type: 'HTTP_FAILURE' });
      }
    }
    if (this.outbox.size === 0) {
      this._transition({ type: 'OUTBOX_DRAINED' });
    }
  }
}
