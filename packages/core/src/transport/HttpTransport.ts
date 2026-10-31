/**
 * src/core/transport/HttpTransport.ts
 * HTTP + WebSocket transport to the SaHaay dispatch server.
 */

import type { Transport, OutboundMessage, Ack } from './types';

export class HttpTransport implements Transport {
  private baseUrl: string;
  private _available = true;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async send(msg: OutboundMessage): Promise<Ack> {
    const resp = await fetch(`${this.baseUrl}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: (msg.payload as any)?.lat,
        lon: (msg.payload as any)?.lon,
        addrId: (msg.payload as any)?.addrId ?? 0,
        flags: (msg.payload as any)?.flags ?? 0,
        sosUid: msg.id,
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: { ok: boolean; missionId?: string } = await resp.json() as any;
    this._available = true;
    return { ok: data.ok, missionId: data.missionId };
  }

  isAvailable(): boolean { return this._available; }
}
