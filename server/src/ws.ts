/**
 * server/src/ws.ts
 * WebSocket hub: manages connected clients, routes messages with authenticated handshakes.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { WsClientMeta } from './types';
import { verifySession } from './auth';

const clients = new Map<WebSocket, WsClientMeta>();

export function initWss(wss: WebSocketServer): void {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = url.searchParams.get('token');
    const missionId = url.searchParams.get('missionId') ?? undefined;

    let role: WsClientMeta['role'] = (url.searchParams.get('role') as WsClientMeta['role']) ?? 'control';
    let ambulanceId = url.searchParams.get('ambulanceId') ?? undefined;

    // Authenticate if token provided, deriving verified identity
    if (token) {
      const session = verifySession(token);
      if (session) {
        if (session.role === 'driver') {
          role = 'driver';
          ambulanceId = session.userId;
        } else if (session.role === 'citizen') {
          role = 'citizen';
        } else if (session.role === 'admin') {
          role = 'control';
        }
      } else {
        // Invalid token provided -> reject connection
        ws.close(4401, 'Unauthorized token');
        return;
      }
    }

    clients.set(ws, { role, missionId, ambulanceId });
    console.log(`WS connected: role=${role} mission=${missionId} ambu=${ambulanceId}`);

    ws.on('close', () => { clients.delete(ws); });
    ws.on('error', () => { clients.delete(ws); });
  });
}

function send(ws: WebSocket, msg: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/** Broadcast to all connected clients. */
export function broadcastToAll(msg: unknown): void {
  for (const [ws] of clients) send(ws, msg);
}

/** Broadcast to clients subscribed to a specific mission (citizen + driver for that mission). */
export function broadcastToMission(missionId: string, msg: unknown): void {
  for (const [ws, meta] of clients) {
    if (meta.missionId === missionId || meta.role === 'control' || meta.role === 'authority') {
      send(ws, msg);
    }
  }
}

/** Send to a specific ambulance's driver client. */
export function sendToAmbulance(ambulanceId: string, msg: unknown): void {
  for (const [ws, meta] of clients) {
    if (meta.ambulanceId === ambulanceId) send(ws, msg);
  }
}
