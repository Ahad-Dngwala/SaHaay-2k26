/**
 * src/core/sosCodec.ts
 *
 * Compact SMS-safe SOS token encoder / decoder.
 *
 * FORMAT:  S1|<uid36>|<lat36>|<lon36>|<ts36>|<addrId36>|<flags36>|<crc>
 *
 * Encoding formulas:
 *   uid36    = base36 UUID fragment (first 6 chars of random ID)
 *   lat36    = base36( round( (lat + 90)  * 1e5 ) )   → 5 decimal places, ~1 m resolution
 *   lon36    = base36( round( (lon + 180) * 1e5 ) )   → 5 decimal places, ~1 m resolution
 *   ts36     = base36( unix seconds )
 *   addrId36 = base36( nearest gazetteer entry index )  — 2 chars max for 200-entry gazetteer
 *   flags36  = base36( bitfield: 0=manual, 1=crash_auto )
 *   crc      = 2-char base36 CRC-8 checksum over everything before the last '|'
 *
 * Hard limit: 160 chars total; soft limit 100 chars (Config.SMS_TOKEN_MAX_CHARS).
 * ASCII only (GSM-7 subset).
 */

import { Config } from './config';

// ── Internal helpers ─────────────────────────────────────────────────────────

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Encode a non-negative integer as a base36 string. */
export function toBase36(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`toBase36: invalid input ${n}`);
  if (n === 0) return '0';
  let s = '';
  let v = n;
  while (v > 0) {
    s = BASE36[v % 36] + s;
    v = Math.floor(v / 36);
  }
  return s;
}

/** Decode a base36 string back to a non-negative integer. */
export function fromBase36(s: string): number {
  if (!/^[0-9a-z]+$/.test(s)) throw new RangeError(`fromBase36: invalid chars in "${s}"`);
  return parseInt(s, 36);
}

/**
 * CRC-8 (polynomial 0x07) over a string.
 * Returns a 2-character lowercase base36 string.
 */
export function crc8(input: string): string {
  let c = 0;
  for (let i = 0; i < input.length; i++) {
    c ^= input.charCodeAt(i);
    for (let b = 0; b < 8; b++) {
      c = (c & 0x80) ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
    }
  }
  return c.toString(36).padStart(2, '0');
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface SosToken {
  version: 1;
  uid: string;
  lat: number;
  lon: number;
  /** Unix timestamp in seconds */
  ts: number;
  /** Index into the gazetteer (nearest locality). -1 if unknown. */
  addrId: number;
  /** Bitfield: 0 = manual SOS, 1 = crash auto-SOS */
  flags: number;
}

export type EncodeResult = { ok: true; token: string; length: number };
export type DecodeResult = { ok: true; data: SosToken };
export type DecodeError   = { ok: false; reason: string };

/**
 * Encode a SOS into a compact ASCII token.
 * Validates coordinate bounds [-90, 90] and [-180, 180] before encoding.
 * NOTE: addrId locality centroid is an address hint only; lat/lon remain the primary location.
 */
export function encode(p: Omit<SosToken, 'version'>): EncodeResult {
  if (typeof p.lat !== 'number' || isNaN(p.lat) || p.lat < -90 || p.lat > 90) {
    throw new RangeError(`encode: latitude must be between -90 and 90, got ${p.lat}`);
  }
  if (typeof p.lon !== 'number' || isNaN(p.lon) || p.lon < -180 || p.lon > 180) {
    throw new RangeError(`encode: longitude must be between -180 and 180, got ${p.lon}`);
  }
  if (typeof p.ts !== 'number' || isNaN(p.ts) || p.ts < 0) {
    throw new RangeError(`encode: timestamp must be non-negative integer, got ${p.ts}`);
  }
  if (p.addrId !== undefined && (p.addrId < -1 || p.addrId > 1295)) {
    throw new RangeError(`encode: addrId out of gazetteer range (max 1295 for 2-char base36), got ${p.addrId}`);
  }

  const lat36    = toBase36(Math.round((p.lat  +  90) * 1e5));
  const lon36    = toBase36(Math.round((p.lon  + 180) * 1e5));
  const ts36     = toBase36(p.ts);
  const addrId36 = toBase36(p.addrId < 0 ? 0 : p.addrId);
  const flags36  = toBase36(p.flags);
  const uid6     = p.uid.toLowerCase().replace(/[^0-9a-z]/g, '').slice(0, 8) || '0';

  const body = `S1|${uid6}|${lat36}|${lon36}|${ts36}|${addrId36}|${flags36}`;
  const crc  = crc8(body);
  const token = `${body}|${crc}`;

  // Validate ASCII-only
  if (/[^\x20-\x7e]/.test(token)) {
    throw new Error(`SOS codec: non-ASCII characters in token: "${token}"`);
  }
  if (token.length > Config.SMS_MAX_CHARS) {
    throw new Error(`SOS codec: token length ${token.length} exceeds hard limit ${Config.SMS_MAX_CHARS}`);
  }

  return { ok: true, token, length: token.length };
}

/** Decode a received SMS token. Returns a typed result (never throws). */
export function decode(raw: string): DecodeResult | DecodeError {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'empty input' };

  const s = raw.trim();
  if (s.length > Config.SMS_MAX_CHARS) return { ok: false, reason: 'token exceeds 160 chars' };
  if (/[^\x20-\x7e]/.test(s))           return { ok: false, reason: 'non-ASCII characters' };

  const lastPipe = s.lastIndexOf('|');
  if (lastPipe < 0) return { ok: false, reason: 'missing CRC separator' };

  const body       = s.slice(0, lastPipe);
  const receivedCrc = s.slice(lastPipe + 1);
  const expectedCrc = crc8(body);

  if (receivedCrc !== expectedCrc) {
    return { ok: false, reason: `CRC mismatch: got "${receivedCrc}", expected "${expectedCrc}"` };
  }

  const parts = body.split('|');
  if (parts.length !== 7) return { ok: false, reason: `expected 7 fields, got ${parts.length}` };

  const [ver, uid, lat36, lon36, ts36, addrId36, flags36] = parts;

  if (ver !== 'S1') return { ok: false, reason: `unknown version "${ver}"` };

  try {
    const lat    = fromBase36(lat36)    / 1e5 - 90;
    const lon    = fromBase36(lon36)    / 1e5 - 180;
    const ts     = fromBase36(ts36);
    const addrId = fromBase36(addrId36);
    const flags  = fromBase36(flags36);

    // Sanity checks
    if (lat < -90  || lat  > 90)  return { ok: false, reason: `lat out of range: ${lat}` };
    if (lon < -180 || lon  > 180) return { ok: false, reason: `lon out of range: ${lon}` };
    if (ts < 0)                    return { ok: false, reason: `negative ts: ${ts}` };

    return { ok: true, data: { version: 1, uid, lat, lon, ts, addrId, flags } };
  } catch (e) {
    return { ok: false, reason: `parse error: ${(e as Error).message}` };
  }
}

/** Generate a short random UID (8 base36 chars). */
export function generateUid(): string {
  const arr = new Uint32Array(2);
  // Works in both Node and browser (crypto.getRandomValues in browser, crypto.randomFillSync in Node)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
  } else {
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomFillSync } = require('crypto');
    randomFillSync(arr);
  }
  return (arr[0].toString(36) + arr[1].toString(36)).slice(0, 8).padStart(8, '0');
}
