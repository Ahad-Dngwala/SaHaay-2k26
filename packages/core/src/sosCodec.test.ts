/**
 * src/core/sosCodec.test.ts
 * Unit tests for the SOS codec.
 * Run: npx jest src/core/sosCodec.test.ts
 */

import { encode, decode, crc8, toBase36, fromBase36, generateUid } from './sosCodec';
import { Config } from './config';

// ── Ahmedabad test coordinates ─────────────────────────────────────────────
const AHM_LAT = 23.0225; // Ahmedabad, Gujarat
const AHM_LON = 72.5714;

describe('sosCodec: base36 helpers', () => {
  test('toBase36(0) === "0"', () => expect(toBase36(0)).toBe('0'));
  test('toBase36(36) === "10"', () => expect(toBase36(36)).toBe('10'));
  test('fromBase36(toBase36(n)) === n for large n', () => {
    const n = 123456789;
    expect(fromBase36(toBase36(n))).toBe(n);
  });
  test('fromBase36 invalid chars throws', () => {
    expect(() => fromBase36('XYZ')).toThrow();
  });
});

describe('sosCodec: CRC-8', () => {
  test('crc8 returns 2-char lowercase base36', () => {
    const c = crc8('hello');
    expect(c).toMatch(/^[0-9a-z]{2}$/);
  });
  test('crc8 different strings have different CRC (basic)', () => {
    expect(crc8('abc')).not.toBe(crc8('abd'));
  });
  test('crc8 same string is deterministic', () => {
    expect(crc8('test|payload|here')).toBe(crc8('test|payload|here'));
  });
});

describe('sosCodec: encode', () => {
  test('Ahmedabad round-trip: token length < 160 chars', () => {
    const uid = '00test01';
    const result = encode({ uid, lat: AHM_LAT, lon: AHM_LON, ts: 1700000000, addrId: 42, flags: 0 });
    expect(result.ok).toBe(true);
    expect(result.length).toBeLessThan(Config.SMS_MAX_CHARS);
    expect(result.length).toBeLessThanOrEqual(Config.SMS_TOKEN_MAX_CHARS);
  });

  test('token contains only ASCII printable chars', () => {
    const result = encode({ uid: 'aabbccdd', lat: AHM_LAT, lon: AHM_LON, ts: 1700000000, addrId: 0, flags: 1 });
    expect(result.ok).toBe(true);
    expect(/[^\x20-\x7e]/.test(result.token)).toBe(false);
  });

  test('token starts with S1|', () => {
    const result = encode({ uid: '12345678', lat: 0, lon: 0, ts: 0, addrId: 0, flags: 0 });
    expect(result.token.startsWith('S1|')).toBe(true);
  });

  test('worst-case coordinates still within 160 chars', () => {
    // Extremes of lat/lon
    const result = encode({ uid: 'ffffffff', lat: 90, lon: 180, ts: 9999999999, addrId: 1295, flags: 63 });
    expect(result.ok).toBe(true);
    expect(result.length).toBeLessThan(Config.SMS_MAX_CHARS);
  });
});

describe('sosCodec: decode', () => {
  test('round-trip decode gives lat/lon within ~1 m precision', () => {
    const lat = AHM_LAT;
    const lon = AHM_LON;
    const ts = Math.floor(Date.now() / 1000);
    const encoded = encode({ uid: 'ahd00001', lat, lon, ts, addrId: 7, flags: 0 });
    const decoded = decode(encoded.token);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    // 1/1e5 degree ≈ 1.11 m at equator, ≈ 1.02 m at 23° N → within 2 m
    expect(Math.abs(decoded.data.lat - lat)).toBeLessThan(0.00002); // ≈ 2.2 m
    expect(Math.abs(decoded.data.lon - lon)).toBeLessThan(0.00002);
    expect(decoded.data.ts).toBe(ts);
    expect(decoded.data.addrId).toBe(7);
    expect(decoded.data.flags).toBe(0);
    expect(decoded.data.version).toBe(1);
  });

  test('corrupted CRC is rejected', () => {
    const encoded = encode({ uid: 'test0001', lat: AHM_LAT, lon: AHM_LON, ts: 1700000000, addrId: 0, flags: 0 });
    // Corrupt the last 2 chars (CRC)
    const corrupted = encoded.token.slice(0, -2) + 'zz';
    const result = decode(corrupted);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('CRC mismatch');
  });

  test('truncated token is rejected', () => {
    const encoded = encode({ uid: 'test0002', lat: AHM_LAT, lon: AHM_LON, ts: 1700000000, addrId: 0, flags: 0 });
    const truncated = encoded.token.slice(0, 10);
    const result = decode(truncated);
    expect(result.ok).toBe(false);
  });

  test('empty string is rejected', () => {
    expect(decode('').ok).toBe(false);
    expect(decode('  ').ok).toBe(false);
  });

  test('non-ASCII characters are rejected', () => {
    const result = decode('S1|ñ|ñ|ñ|0|0|0|xx');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('non-ASCII');
  });

  test('wrong version identifier rejected', () => {
    // Build a valid S2 token manually — should fail version check
    const encoded = encode({ uid: 'ver0test', lat: AHM_LAT, lon: AHM_LON, ts: 1700000000, addrId: 0, flags: 0 });
    const s2 = encoded.token.replace(/^S1\|/, 'S2|');
    // CRC will be wrong too; either way it must be rejected
    const result = decode(s2);
    expect(result.ok).toBe(false);
  });

  test('replay idempotency: same token decodes twice to same result', () => {
    const tok = encode({ uid: 'replay01', lat: AHM_LAT, lon: AHM_LON, ts: 1700000000, addrId: 0, flags: 0 }).token;
    const r1 = decode(tok);
    const r2 = decode(tok);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.data).toEqual(r2.data);
    }
  });
  test('out-of-bounds coordinates throw RangeError on encode', () => {
    expect(() => encode({ uid: 'badlat', lat: 91, lon: 72, ts: 1700000000, addrId: 0, flags: 0 })).toThrow(RangeError);
    expect(() => encode({ uid: 'badlat', lat: -95, lon: 72, ts: 1700000000, addrId: 0, flags: 0 })).toThrow(RangeError);
    expect(() => encode({ uid: 'badlon', lat: 23, lon: 185, ts: 1700000000, addrId: 0, flags: 0 })).toThrow(RangeError);
    expect(() => encode({ uid: 'badlon', lat: 23, lon: -190, ts: 1700000000, addrId: 0, flags: 0 })).toThrow(RangeError);
  });

  test('oversized token exceeding 160 chars is rejected by decode', () => {
    const longGarbage = 'S1|' + 'a'.repeat(165) + '|00';
    const result = decode(longGarbage);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('160 chars');
  });

  test('validates assets/gazetteer.json structure and 2-char base36 ID bound', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const gazetteer = require('../../assets/gazetteer.json');
    expect(Array.isArray(gazetteer)).toBe(true);
    expect(gazetteer.length).toBeGreaterThan(150);
    expect(gazetteer.length).toBeLessThanOrEqual(1296); // Must fit in 2 base36 chars (36^2)

    for (const entry of gazetteer) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('lat');
      expect(entry).toHaveProperty('lon');
      expect(entry.id).toBeLessThan(1296);
      expect(entry.lat).toBeGreaterThan(20);
      expect(entry.lat).toBeLessThan(25);
      expect(entry.lon).toBeGreaterThan(68);
      expect(entry.lon).toBeLessThan(76);
    }
  });
});

describe('sosCodec: generateUid', () => {
  test('returns 8 base36 chars', () => {
    const uid = generateUid();
    expect(uid).toMatch(/^[0-9a-z]{8}$/);
  });
  test('two calls return different UIDs (with overwhelming probability)', () => {
    expect(generateUid()).not.toBe(generateUid());
  });
});
