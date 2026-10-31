/**
 * src/core/smsProtocol.ts
 *
 * GSM-7 Compact SMS Fallback Protocol (Spec Section 7).
 * All packets are ASCII <= 160 characters (single SMS) with CRC-8 checksum.
 * Total decoders that never throw.
 *
 * PACKET TYPES:
 *   S1: Citizen SOS              (Citizen -> Server/Gateway)
 *   A1: Ambulance Assigned       (Server/Gateway -> Citizen)
 *   T1: Live Tracking Ping       (Server/Driver -> Citizen)
 *   O1: Driver Mission Offer     (Server/Gateway -> Driver)
 *   D1: Driver Action/Telemetry  (Driver -> Server/Gateway)
 *   X1: Cancellation / Abort     (Either direction)
 */

import { toBase36, fromBase36, crc8 } from './sosCodec';

export function encodeLat(lat: number): string {
  const clamped = Math.max(-90, Math.min(90, lat));
  return toBase36(Math.round((clamped + 90) * 1e5));
}

export function decodeLat(s: string): number {
  return fromBase36(s) / 1e5 - 90;
}

export function encodeLon(lon: number): string {
  const clamped = Math.max(-180, Math.min(180, lon));
  return toBase36(Math.round((clamped + 180) * 1e5));
}

export function decodeLon(s: string): number {
  return fromBase36(s) / 1e5 - 180;
}

// ── Packet Types ─────────────────────────────────────────────────────────────

export interface S1Packet {
  type: 'S1';
  uid: string;
  lat: number;
  lon: number;
  ts: number;
  addrId: number;
  flags: number;
}

export interface A1Packet {
  type: 'A1';
  missionId: string;
  vehicleNo: string;
  driverName: string;
  etaS: number;
  lat: number;
  lon: number;
}

export interface T1Packet {
  type: 'T1';
  seq: number;
  lat: number;
  lon: number;
  speedKmh: number;
  heading: number;
  etaS: number;
  ts: number;
}

export interface O1Packet {
  type: 'O1';
  missionId: string;
  patientLat: number;
  patientLon: number;
  distanceM: number;
  ttlS: number;
}

export type DriverAction = 'ACC' | 'DEC' | 'ARR' | 'POS';

export interface D1Packet {
  type: 'D1';
  missionId: string;
  action: DriverAction;
  seq: number;
  lat: number;
  lon: number;
}

export type CancelReasonCode = 'CAN_PAT' | 'CAN_DRV' | 'BRK_VEH' | 'EXP_TTL' | 'NO_UNITS';

export interface X1Packet {
  type: 'X1';
  missionId: string;
  reasonCode: CancelReasonCode;
}

export type SmsPacket = S1Packet | A1Packet | T1Packet | O1Packet | D1Packet | X1Packet;

export type SmsDecodeResult =
  | { ok: true; packet: SmsPacket; raw: string }
  | { ok: false; error: string; raw: string };

// ── Encoders ─────────────────────────────────────────────────────────────────

export function encodeS1(p: Omit<S1Packet, 'type'>): string {
  const body = `S1|${p.uid}|${encodeLat(p.lat)}|${encodeLon(p.lon)}|${toBase36(p.ts)}|${toBase36(p.addrId)}|${toBase36(p.flags)}`;
  return `${body}|${crc8(body)}`;
}

export function encodeA1(p: Omit<A1Packet, 'type'>): string {
  const cleanVeh = p.vehicleNo.replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
  const cleanName = p.driverName.replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  const body = `A1|${p.missionId.slice(0, 8)}|${cleanVeh}|${cleanName}|${toBase36(Math.round(p.etaS))}|${encodeLat(p.lat)}|${encodeLon(p.lon)}`;
  return `${body}|${crc8(body)}`;
}

export function encodeT1(p: Omit<T1Packet, 'type'>): string {
  const body = `T1|${toBase36(p.seq)}|${encodeLat(p.lat)}|${encodeLon(p.lon)}|${toBase36(Math.round(p.speedKmh))}|${toBase36(Math.round(p.heading))}|${toBase36(Math.round(p.etaS))}|${toBase36(p.ts)}`;
  return `${body}|${crc8(body)}`;
}

export function encodeO1(p: Omit<O1Packet, 'type'>): string {
  const body = `O1|${p.missionId.slice(0, 8)}|${encodeLat(p.patientLat)}|${encodeLon(p.patientLon)}|${toBase36(Math.round(p.distanceM))}|${toBase36(Math.round(p.ttlS))}`;
  return `${body}|${crc8(body)}`;
}

export function encodeD1(p: Omit<D1Packet, 'type'>): string {
  const body = `D1|${p.missionId.slice(0, 8)}|${p.action}|${toBase36(p.seq)}|${encodeLat(p.lat)}|${encodeLon(p.lon)}`;
  return `${body}|${crc8(body)}`;
}

export function encodeX1(p: Omit<X1Packet, 'type'>): string {
  const body = `X1|${p.missionId.slice(0, 8)}|${p.reasonCode}`;
  return `${body}|${crc8(body)}`;
}

// ── Decoder ──────────────────────────────────────────────────────────────────

export function decodeSmsPacket(rawMessage: string): SmsDecodeResult {
  const s = (rawMessage || '').trim();
  if (!s || s.length > 160) {
    return { ok: false, error: 'Empty or exceeds 160 chars', raw: s };
  }

  const lastPipe = s.lastIndexOf('|');
  if (lastPipe < 0) {
    return { ok: false, error: 'Missing CRC delimiter', raw: s };
  }

  const body = s.slice(0, lastPipe);
  const checksum = s.slice(lastPipe + 1);

  if (crc8(body) !== checksum.toLowerCase()) {
    return { ok: false, error: 'CRC mismatch', raw: s };
  }

  const parts = body.split('|');
  const type = parts[0];

  try {
    switch (type) {
      case 'S1': {
        if (parts.length < 7) return { ok: false, error: 'S1 malformed fields', raw: s };
        return {
          ok: true,
          packet: {
            type: 'S1',
            uid: parts[1],
            lat: decodeLat(parts[2]),
            lon: decodeLon(parts[3]),
            ts: fromBase36(parts[4]),
            addrId: fromBase36(parts[5]),
            flags: fromBase36(parts[6]),
          },
          raw: s,
        };
      }
      case 'A1': {
        if (parts.length < 7) return { ok: false, error: 'A1 malformed fields', raw: s };
        return {
          ok: true,
          packet: {
            type: 'A1',
            missionId: parts[1],
            vehicleNo: parts[2],
            driverName: parts[3],
            etaS: fromBase36(parts[4]),
            lat: decodeLat(parts[5]),
            lon: decodeLon(parts[6]),
          },
          raw: s,
        };
      }
      case 'T1': {
        if (parts.length < 8) return { ok: false, error: 'T1 malformed fields', raw: s };
        return {
          ok: true,
          packet: {
            type: 'T1',
            seq: fromBase36(parts[1]),
            lat: decodeLat(parts[2]),
            lon: decodeLon(parts[3]),
            speedKmh: fromBase36(parts[4]),
            heading: fromBase36(parts[5]),
            etaS: fromBase36(parts[6]),
            ts: fromBase36(parts[7]),
          },
          raw: s,
        };
      }
      case 'O1': {
        if (parts.length < 6) return { ok: false, error: 'O1 malformed fields', raw: s };
        return {
          ok: true,
          packet: {
            type: 'O1',
            missionId: parts[1],
            patientLat: decodeLat(parts[2]),
            patientLon: decodeLon(parts[3]),
            distanceM: fromBase36(parts[4]),
            ttlS: fromBase36(parts[5]),
          },
          raw: s,
        };
      }
      case 'D1': {
        if (parts.length < 6) return { ok: false, error: 'D1 malformed fields', raw: s };
        const action = parts[2] as DriverAction;
        if (!['ACC', 'DEC', 'ARR', 'POS'].includes(action)) {
          return { ok: false, error: `Invalid driver action: ${parts[2]}`, raw: s };
        }
        return {
          ok: true,
          packet: {
            type: 'D1',
            missionId: parts[1],
            action,
            seq: fromBase36(parts[3]),
            lat: decodeLat(parts[4]),
            lon: decodeLon(parts[5]),
          },
          raw: s,
        };
      }
      case 'X1': {
        if (parts.length < 3) return { ok: false, error: 'X1 malformed fields', raw: s };
        return {
          ok: true,
          packet: {
            type: 'X1',
            missionId: parts[1],
            reasonCode: parts[2] as CancelReasonCode,
          },
          raw: s,
        };
      }
      default:
        return { ok: false, error: `Unknown packet type: ${type}`, raw: s };
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Parse error', raw: s };
  }
}
