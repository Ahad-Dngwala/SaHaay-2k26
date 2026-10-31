/**
 * src/core/transport/types.ts
 * Transport layer interface and types.
 */

export interface OutboundMessage {
  /** Unique message / SOS ID (for idempotency) */
  id: string;
  type: 'SOS' | 'CANCEL' | 'PING';
  token?: string;   // SMS-encoded token
  payload?: unknown; // HTTP payload
}

export interface Ack {
  ok: boolean;
  missionId?: string;
  smsReply?: string;
  error?: string;
}

export interface Transport {
  send(msg: OutboundMessage): Promise<Ack>;
  isAvailable(): boolean;
}

export type TransportState = 'ONLINE' | 'DEGRADED' | 'OFFLINE_SMS' | 'RECOVERED';

export interface TransportManagerState {
  current: TransportState;
  consecutiveFailures: number;
  outboxCount: number;
  lastAttemptAt: number;
  blackoutForced: boolean;
}
