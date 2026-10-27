/**
 * server/src/audit.ts
 * Tamper-evident audit log with SHA-256 hash chain.
 * Each entry stores SHA-256(prevHash + timestamp + event + JSON(data)).
 * Described as "tamper-evident" — not foolproof (in-memory; a hostile
 * operator with write access to the process memory could alter entries).
 * Production path: write to an append-only database or write-once object store.
 */

import { createHash } from 'crypto';
import { state } from './state';
import type { AuditEntry } from './types';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function computeHash(prevHash: string, timestamp: number, event: string, data: unknown): string {
  const payload = `${prevHash}|${timestamp}|${event}|${JSON.stringify(data)}`;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

/** Append a new event to the audit log. Returns the new entry. */
export function auditLog(event: string, data: unknown = {}): AuditEntry {
  const timestamp = Date.now();
  const index = state.audit.length;
  const prevHash = index === 0 ? GENESIS_HASH : state.audit[index - 1].hash;
  const hash = computeHash(prevHash, timestamp, event, data);
  const entry: AuditEntry = { index, timestamp, event, data, prevHash, hash };
  state.audit.push(entry);
  return entry;
}

export interface VerifyResult {
  valid: boolean;
  checkedEntries: number;
  firstFailIndex?: number;
  reason?: string;
}

/** Verify the entire chain from genesis to current tail. */
export function verifyChain(entries: AuditEntry[] = state.audit): VerifyResult {
  if (entries.length === 0) return { valid: true, checkedEntries: 0 };

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];

    // Index must match position
    if (e.index !== i) {
      return { valid: false, checkedEntries: i, firstFailIndex: i, reason: `index mismatch: stored ${e.index}, position ${i}` };
    }

    // prevHash must match
    const expectedPrev = i === 0 ? GENESIS_HASH : entries[i - 1].hash;
    if (e.prevHash !== expectedPrev) {
      return { valid: false, checkedEntries: i, firstFailIndex: i, reason: `prevHash mismatch at index ${i}` };
    }

    // Hash integrity
    const recomputed = computeHash(e.prevHash, e.timestamp, e.event, e.data);
    if (recomputed !== e.hash) {
      return { valid: false, checkedEntries: i, firstFailIndex: i, reason: `hash mismatch at index ${i}: expected ${recomputed}, got ${e.hash}` };
    }
  }

  return { valid: true, checkedEntries: entries.length };
}

/**
 * DEMO ONLY: tamper a specific entry to demonstrate verification failure.
 * Returns the tampered entry.
 */
export function tamperEntry(index: number): AuditEntry | null {
  const entry = state.audit[index];
  if (!entry) return null;
  // Mutate the data without updating the hash — this will cause verify to fail
  (entry.data as Record<string, unknown>)['__tampered'] = true;
  return entry;
}
