/**
 * src/core/transport/SmsTransport.ts
 *
 * SMS fallback transport.
 * In production (real Android device): would use expo-sms Linking.openURL composer
 * or a Kotlin native module to silently send SMS.
 *
 * In this prototype: delegates to SimulatedCarrier which POSTs the token
 * to POST /sms/inbound — exactly as a Twilio/Exotel SMS gateway webhook would.
 *
 * SIMULATED: This carrier is in-process. It does NOT send a real SMS.
 * Production path: replace SimulatedCarrier.deliver() with SmsManager.sendTextMessage()
 * in a Kotlin native module (see docs/ARCHITECTURE.md for the production path).
 */

import type { Transport, OutboundMessage, Ack } from './types';

// ── SimulatedCarrier (SIMULATED) ──────────────────────────────────────────────

export interface SimulatedCarrierConfig {
  /** Base URL of the dispatch server (for the webhook POST) */
  serverUrl: string;
  /** Simulated latency range in ms [min, max] */
  latencyMs: [number, number];
  /** Probability 0–1 that a delivery fails (simulates bad signal) */
  lossRate: number;
}

/**
 * [SIMULATED]
 * In-process carrier: converts the SMS token into a POST /sms/inbound
 * exactly as an SMS gateway webhook would. Configurable latency and loss.
 */
export class SimulatedCarrier {
  constructor(private config: SimulatedCarrierConfig) {}

  async deliver(token: string): Promise<{ ok: boolean; smsReply?: string }> {
    const { latencyMs, lossRate, serverUrl } = this.config;
    const [minL, maxL] = latencyMs;
    // Deterministic pseudo-jitter based on clock tick
    const pseudo = ((Date.now() % 1000) / 1000);
    const delay = minL + pseudo * (maxL - minL);

    await new Promise(r => setTimeout(r, delay));

    if (lossRate > 0 && pseudo < lossRate) {
      throw new Error('[SIMULATED] Carrier loss: packet dropped');
    }

    const resp = await fetch(`${serverUrl}/sms/inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data: { ok: boolean; smsReply?: string } = await resp.json() as any;
    return data;
  }
}

// ── SmsTransport ──────────────────────────────────────────────────────────────

export class SmsTransport implements Transport {
  private carrier: SimulatedCarrier;

  constructor(config: SimulatedCarrierConfig) {
    this.carrier = new SimulatedCarrier(config);
  }

  async send(msg: OutboundMessage): Promise<Ack> {
    if (!msg.token) throw new Error('SmsTransport: no token on message');

    const result = await this.carrier.deliver(msg.token);
    return { ok: result.ok, smsReply: result.smsReply };
  }

  isAvailable(): boolean { return true; } // SMS always "available" (carrier-dependent in production)
}
