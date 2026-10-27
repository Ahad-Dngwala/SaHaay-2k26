/**
 * server/src/ws.ts
 * WebSocket hub: manages connected clients, routes messages.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { WsClientMeta } from './types';

const clients = new Map<WebSocket, WsClientMeta>();

export function initWss(wss: WebSocketServer): void {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const role = (url.searchParams.get('role') ?? 'control') as WsClientMeta['role'];
    const missionId   = url.searchParams.get('missionId')   ?? undefined;
    const ambulanceId = url.searchParams.get('ambulanceId') ?? undefined;

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

export function getClientCount(): number { return clients.size; }
