/**
 * server/src/db.ts
 * SQLite repository layer for SaHaay using better-sqlite3.
 * Manages schema, users, drivers, missions, mission_events, offers, positions, signals, hospitals, announcements, audit.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DB_DIR, 'sahaay.sqlite');
export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency
if (DB_PATH !== ':memory:') {
  db.pragma('journal_mode = WAL');
}

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      blood_group TEXT,
      medical_notes TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      license_no TEXT NOT NULL,
      vehicle_no TEXT NOT NULL,
      ambulance_type TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      is_on_duty INTEGER NOT NULL DEFAULT 0,
      current_lat REAL NOT NULL DEFAULT 0,
      current_lon REAL NOT NULL DEFAULT 0,
      heading REAL NOT NULL DEFAULT 0,
      speed_kmh REAL NOT NULL DEFAULT 0,
      assigned_mission_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      patient_phone TEXT NOT NULL,
      patient_lat REAL NOT NULL,
      patient_lon REAL NOT NULL,
      patient_lat_live REAL NOT NULL,
      patient_lon_live REAL NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_ambulance_id TEXT,
      current_radius_m REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mission_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mission_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_id TEXT,
      details_json TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (mission_id) REFERENCES missions(id)
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mission_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      sent_at INTEGER NOT NULL,
      ttl_s INTEGER NOT NULL,
      outcome TEXT NOT NULL DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS audit_chain (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seq INTEGER UNIQUE NOT NULL,
      prev_hash TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      body TEXT NOT NULL,
      official_source TEXT,
      source_url TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PUBLISHED',
      published_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

initSchema();
