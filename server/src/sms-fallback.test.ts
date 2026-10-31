/**
 * server/src/sms-fallback.test.ts
 *
 * Automated verification suite for M16 Real SMS Fallback (Spec Section 7).
 */

import { state, resetState } from './state';
import {
  encodeS1,
  encodeA1,
  encodeT1,
  encodeO1,
  encodeD1,
  encodeX1,
  decodeSmsPacket,
  crc8,
} from './sms-protocol-adapter';
import { smsGateway, LoopbackProvider } from './sms-gateway';
import { createMission, acceptMission } from './dispatch';

describe('M16: Real SMS Fallback Protocol & Gateway', () => {
  beforeEach(() => {
    resetState();
    smsGateway.clearOutbox();
    smsGateway.setProvider(new LoopbackProvider());
  });

  describe('GSM-7 Compact Packet Encoders & Decoders', () => {
    it('roundtrips S1 (Citizen SOS) accurately within 160 chars', () => {
      const s1Data = {
        uid: 'sos123',
        lat: 23.03351,
        lon: 72.56082,
        ts: 1730380800,
        addrId: 42,
        flags: 1, // crash_auto
      };

      const raw = encodeS1(s1Data);
      expect(raw.startsWith('S1|')).toBe(true);
      expect(raw.length).toBeLessThanOrEqual(160);

      const decoded = decodeSmsPacket(raw);
      expect(decoded.ok).toBe(true);
      if (decoded.ok && decoded.packet.type === 'S1') {
        expect(decoded.packet.uid).toBe('sos123');
        expect(decoded.packet.lat).toBeCloseTo(23.03351, 4);
        expect(decoded.packet.lon).toBeCloseTo(72.56082, 4);
        expect(decoded.packet.flags).toBe(1);
        expect(decoded.packet.addrId).toBe(42);
      }
    });

    it('roundtrips A1 (Ambulance Assigned) accurately', () => {
      const a1Data = {
        missionId: 'm-987654',
        vehicleNo: 'GJ01AX9999',
        driverName: 'Ramesh',
        etaS: 180,
        lat: 23.02801,
        lon: 72.55902,
      };

      const raw = encodeA1(a1Data);
      expect(raw.startsWith('A1|')).toBe(true);
      expect(raw.length).toBeLessThanOrEqual(160);

      const decoded = decodeSmsPacket(raw);
      expect(decoded.ok).toBe(true);
      if (decoded.ok && decoded.packet.type === 'A1') {
        expect(decoded.packet.vehicleNo).toBe('GJ01AX9999');
        expect(decoded.packet.driverName).toBe('Ramesh');
        expect(decoded.packet.etaS).toBe(180);
        expect(decoded.packet.lat).toBeCloseTo(23.02801, 4);
        expect(decoded.packet.lon).toBeCloseTo(72.55902, 4);
      }
    });

    it('roundtrips T1 (Live Tracking Ping) with sequence deduplication data', () => {
      const t1Data = {
        seq: 14,
        lat: 23.03102,
        lon: 72.56011,
        speedKmh: 42,
        heading: 180,
        etaS: 95,
        ts: 1730381000,
      };

      const raw = encodeT1(t1Data);
      expect(raw.startsWith('T1|')).toBe(true);
      expect(raw.length).toBeLessThanOrEqual(160);

      const decoded = decodeSmsPacket(raw);
      expect(decoded.ok).toBe(true);
      if (decoded.ok && decoded.packet.type === 'T1') {
        expect(decoded.packet.seq).toBe(14);
        expect(decoded.packet.speedKmh).toBe(42);
        expect(decoded.packet.heading).toBe(180);
        expect(decoded.packet.etaS).toBe(95);
        expect(decoded.packet.lat).toBeCloseTo(23.03102, 4);
      }
    });

    it('roundtrips O1 (Driver Offer) and D1 (Driver Reply)', () => {
      const o1Data = {
        missionId: 'm-alpha1',
        patientLat: 23.04501,
        patientLon: 72.56112,
        distanceM: 1450,
        ttlS: 25,
      };
      const rawO1 = encodeO1(o1Data);
      const decO1 = decodeSmsPacket(rawO1);
      expect(decO1.ok).toBe(true);
      if (decO1.ok && decO1.packet.type === 'O1') {
        expect(decO1.packet.distanceM).toBe(1450);
        expect(decO1.packet.ttlS).toBe(25);
      }

      const d1Data = {
        missionId: 'm-alpha1',
        action: 'ACC' as const,
        seq: 1,
        lat: 23.02901,
        lon: 72.55801,
      };
      const rawD1 = encodeD1(d1Data);
      const decD1 = decodeSmsPacket(rawD1);
      expect(decD1.ok).toBe(true);
      if (decD1.ok && decD1.packet.type === 'D1') {
        expect(decD1.packet.action).toBe('ACC');
        expect(decD1.packet.seq).toBe(1);
      }
    });

    it('roundtrips X1 (Cancellation / Abort)', () => {
      const x1Data = {
        missionId: 'm-canc1',
        reasonCode: 'CAN_PAT' as const,
      };
      const rawX1 = encodeX1(x1Data);
      const decX1 = decodeSmsPacket(rawX1);
      expect(decX1.ok).toBe(true);
      if (decX1.ok && decX1.packet.type === 'X1') {
        expect(decX1.packet.missionId).toBe('m-canc1');
        expect(decX1.packet.reasonCode).toBe('CAN_PAT');
      }
    });

    it('rejects tampered CRC checksums and malformed packets without throwing', () => {
      const raw = encodeS1({
        uid: 'good1',
        lat: 23.0,
        lon: 72.0,
        ts: 1000,
        addrId: 0,
        flags: 0,
      });

      // Tamper with content before CRC
      const tampered = raw.replace('good1', 'bad99');
      const decTampered = decodeSmsPacket(tampered);
      expect(decTampered.ok).toBe(false);
      if (!decTampered.ok) {
        expect(decTampered.error).toContain('CRC mismatch');
      }

      // Garbage string
      const decGarbage = decodeSmsPacket('NOT_A_VALID_PACKET');
      expect(decGarbage.ok).toBe(false);

      // Empty string
      const decEmpty = decodeSmsPacket('');
      expect(decEmpty.ok).toBe(false);
    });
  });

  describe('SmsGateway Outbox and In-App Gateway Delivery', () => {
    it('queues outbound SMS and manages loopback delivery', async () => {
      const item = smsGateway.queueSms('+919876543210', 'A1|test|GJ01|Ramesh|120|72|23|ab');
      expect(item.id).toBeDefined();
      expect(item.to).toBe('+919876543210');

      const loopback = smsGateway.getProvider() as LoopbackProvider;
      expect(loopback.sentMessages.length).toBe(1);
      expect(loopback.sentMessages[0].to).toBe('+919876543210');

      expect(state.audit.some(a => a.event === 'SMS_QUEUED')).toBe(true);
    });

    it('executes full emergency journey lifecycle via SMS protocol packets', () => {
      // 1. Citizen sends S1 SOS
      const s1 = encodeS1({
        uid: 'patient-sim-1',
        lat: 23.0330,
        lon: 72.5610,
        ts: Math.floor(Date.now() / 1000),
        addrId: 1,
        flags: 0,
      });
      const decodedS1 = decodeSmsPacket(s1);
      expect(decodedS1.ok).toBe(true);

      const m = createMission({
        patientLat: (decodedS1 as any).packet.lat,
        patientLon: (decodedS1 as any).packet.lon,
        addrId: 1,
        flags: 0,
        sosUid: (decodedS1 as any).packet.uid,
      });
      expect(m.status).toBe('SEARCHING');

      // 2. Seed ambulance and send O1 offer
      state.ambulances.set('amb-sms-1', {
        id: 'amb-sms-1',
        driverName: 'Suresh',
        vehicleNo: 'GJ01ZZ0001',
        lat: 23.0300,
        lon: 72.5610,
        status: 'AVAILABLE',
        heading: 0,
        speedKmh: 30,
        zone: 'Ahmedabad West',
      });
      m.status = 'DISPATCHING';
      m.pendingOffers = ['amb-sms-1'];

      // 3. Driver accepts via D1 packet
      const d1Acc = encodeD1({
        missionId: m.id,
        action: 'ACC',
        seq: 1,
        lat: 23.0300,
        lon: 72.5610,
      });
      const decD1 = decodeSmsPacket(d1Acc);
      expect(decD1.ok).toBe(true);

      const acceptRes = acceptMission(m.id, 'amb-sms-1');
      expect(acceptRes.won).toBe(true);
      expect(state.missions.get(m.id)?.status).toBe('ASSIGNED');

      // 4. Server issues A1 packet to citizen
      const a1 = encodeA1({
        missionId: m.id,
        vehicleNo: 'GJ01ZZ0001',
        driverName: 'Suresh',
        etaS: 120,
        lat: 23.0300,
        lon: 72.5610,
      });
      const decA1 = decodeSmsPacket(a1);
      expect(decA1.ok).toBe(true);

      // 5. Driver sends telemetry via T1 packet to citizen
      const t1 = encodeT1({
        seq: 2,
        lat: 23.0315,
        lon: 72.5610,
        speedKmh: 35,
        heading: 0,
        etaS: 60,
        ts: Math.floor(Date.now() / 1000),
      });
      const decT1 = decodeSmsPacket(t1);
      expect(decT1.ok).toBe(true);
    });
  });
});
