/**
 * server/src/index.ts
 * SaHaay dispatch server entry point.
 * Starts Express REST API + WebSocket server on SERVER_PORT.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { Config } from './config-server';
import { initWss } from './ws';
import { createRouter } from './routes';
import { seedAmbulances } from './seed';
import { syncGrid } from './matching';
import { auditLog } from './audit';
import { state } from './state';

const app = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Downloads (APKs) ────────────────────────────────────────────────────────
const apkDir = path.join(__dirname, '../../artifacts/apk');
if (!fs.existsSync(apkDir)) {
  fs.mkdirSync(apkDir, { recursive: true });
}
app.use('/downloads', express.static(apkDir));

// ── Web Console (React app at apps/admin-web/dist) ─────────────────────────
const adminDist = path.join(__dirname, '../../apps/admin-web/dist');
if (fs.existsSync(adminDist)) {
  app.use('/assets', express.static(path.join(adminDist, 'assets')));
  app.use('/console/assets', express.static(path.join(adminDist, 'assets')));
  app.use('/admin/assets', express.static(path.join(adminDist, 'assets')));
  app.use('/console', express.static(adminDist));
  app.use('/admin', express.static(adminDist));
  app.get(['/console', '/console/*', '/admin', '/admin/*'], (_req, res) => {
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

// ── Control Dashboard (served at /control) ────────────────────────────────────
app.get('/control', (_req, res) => {
  res.sendFile(path.join(__dirname, 'control.html'));
});

// ── Citizen SOS Interface (served at /sos) ───────────────────────────────────
app.get('/sos', (_req, res) => {
  res.sendFile(path.join(__dirname, 'sos.html'));
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/', createRouter());

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
initWss(wss);

// ── Startup ───────────────────────────────────────────────────────────────────
seedAmbulances();
syncGrid(state.ambulances);
auditLog('SERVER_STARTED', { version: '1.0.0', port: Config.SERVER_PORT });

server.listen(Config.SERVER_PORT, () => {
  console.log(`\n🚑 SaHaay Dispatch Server`);
  console.log(`   Web Console: http://localhost:${Config.SERVER_PORT}/console`);
  console.log(`   REST API:    http://localhost:${Config.SERVER_PORT}/`);
  console.log(`   Control:     http://localhost:${Config.SERVER_PORT}/control`);
  console.log(`   Health:      http://localhost:${Config.SERVER_PORT}/health`);
  console.log(`   SMS in:      POST http://localhost:${Config.SERVER_PORT}/sms/inbound`);
  console.log(`\n   ${state.ambulances.size} ambulances seeded across Ahmedabad\n`);
});

export { app, server };
