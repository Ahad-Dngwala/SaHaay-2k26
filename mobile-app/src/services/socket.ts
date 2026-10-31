/**
 * mobile-app/src/services/socket.ts
 * Real-time WebSocket connection to SaHaay dispatch server (server/src/ws.ts).
 */

import { Config } from '../config';

export type SocketMessage =
  | { type: 'MISSION_CREATED'; mission: any }
  | { type: 'MISSION_UPDATED'; mission: any }
  | { type: 'AMBULANCE_LOCATION'; ambulanceId: string; lat: number; lon: number; heading?: number; speedKmh?: number }
  | { type: 'OFFER_SENT'; missionId: string; ambulanceId: string; radiusM: number }
  | { type: 'DRIVER_OFFER'; missionId: string; ambulanceId: string; lat?: number; lon?: number; distanceM?: number }
  | { type: 'OFFER_CANCELLED'; missionId: string; ambulanceId: string }
  | { type: 'BREAKDOWN'; missionId: string; ambulanceId: string }
  | { type: 'AUDIT_ENTRY'; entry: any }
  | { type: 'PING' }
  | { type: 'PONG' };

type Listener = (msg: SocketMessage) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimer: any = null;
  private isConnected = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(Config.WS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notify(parsed);
        } catch {
          // ignore malformed
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(msg: SocketMessage) {
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch (err) {
        console.error('[Socket] listener error:', err);
      }
    }
  }

  getStatus() {
    return this.isConnected;
  }
}

export const socket = new SocketService();

