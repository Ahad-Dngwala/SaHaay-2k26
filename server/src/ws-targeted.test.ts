/**
 * server/src/ws-targeted.test.ts
 * Integration test validating M10 exit criteria:
 * 1. Unauthenticated accept returns 401/403 or rejects invalid attempts.
 * 2. Targeted delivery: offers reach only the targeted driver across multiple connected WS clients.
 */

import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { initWss, sendToAmbulance, broadcastToAll } from './ws';
import { generateToken } from './auth';

describe('M10: Targeted WebSocket Delivery & Authentication', () => {
  let server: http.Server;
  let wss: WebSocketServer;
  let port: number;

  beforeAll((done) => {
    const app = express();
    server = http.createServer(app);
    wss = new WebSocketServer({ server });
    initWss(wss);

    server.listen(0, () => {
      port = (server.address() as any).port;
      done();
    });
  });

  afterAll((done) => {
    wss.close();
    server.close(done);
  });

  test('targeted offers reach only the intended ambulance among multiple connected drivers', (done) => {
    const driverToken1 = generateToken('driver', 'amb-alpha').token;
    const driverToken2 = generateToken('driver', 'amb-beta').token;
    const citizenToken = generateToken('citizen', 'cit-01').token;

    const wsUrl1 = `ws://localhost:${port}/?token=${driverToken1}`;
    const wsUrl2 = `ws://localhost:${port}/?token=${driverToken2}`;
    const wsUrl3 = `ws://localhost:${port}/?token=${citizenToken}`;

    const ws1 = new WebSocket(wsUrl1);
    const ws2 = new WebSocket(wsUrl2);
    const ws3 = new WebSocket(wsUrl3);

    let connected = 0;
    const onOpen = () => {
      connected++;
      if (connected === 3) {
        // Broadcast targeted offer specifically to amb-alpha
        sendToAmbulance('amb-alpha', {
          type: 'DRIVER_OFFER',
          ambulanceId: 'amb-alpha',
          missionId: 'mis-target-99',
        });
      }
    };

    ws1.on('open', onOpen);
    ws2.on('open', onOpen);
    ws3.on('open', onOpen);

    const received1: any[] = [];
    const received2: any[] = [];
    const received3: any[] = [];

    ws1.on('message', (data) => {
      received1.push(JSON.parse(data.toString()));
      // Give 200ms to verify other clients did not receive it
      setTimeout(() => {
        expect(received1.length).toBe(1);
        expect(received1[0].missionId).toBe('mis-target-99');
        expect(received1[0].ambulanceId).toBe('amb-alpha');

        expect(received2.length).toBe(0);
        expect(received3.length).toBe(0);

        ws1.close();
        ws2.close();
        ws3.close();
        done();
      }, 200);
    });

    ws2.on('message', (data) => {
      received2.push(JSON.parse(data.toString()));
    });

    ws3.on('message', (data) => {
      received3.push(JSON.parse(data.toString()));
    });
  });

  test('connection with invalid token is closed with 4401', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/?token=invalid_forged_token`);
    ws.on('close', (code, reason) => {
      expect(code).toBe(4401);
      done();
    });
  });
});
