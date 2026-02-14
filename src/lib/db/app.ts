import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getAppDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const env = getEnv();

  const appDbDir = path.dirname(env.APP_DB_PATH);
  if (!fs.existsSync(appDbDir)) {
    fs.mkdirSync(appDbDir, { recursive: true });
  }

  const sqlite = new Database(env.APP_DB_PATH);
  
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('cache_size = -64000');
  sqlite.pragma('temp_store = memory');
  sqlite.pragma('foreign_keys = ON');

  // Initialize database schema
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS style_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      system_prompt TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.7,
      max_tokens INTEGER NOT NULL DEFAULT 500,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auto_response_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_jid TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0,
      style_profile_id INTEGER REFERENCES style_profiles(id),
      require_approval INTEGER NOT NULL DEFAULT 1,
      max_daily_responses INTEGER,
      daily_response_count INTEGER NOT NULL DEFAULT 0,
      daily_count_reset_at TEXT,
      context_window_messages INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS auto_response_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_jid TEXT NOT NULL,
      trigger_message_id TEXT NOT NULL,
      response_message_id TEXT,
      style_profile_id INTEGER REFERENCES style_profiles(id),
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      approved INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approval_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_jid TEXT NOT NULL,
      trigger_message_id TEXT NOT NULL,
      proposed_response TEXT NOT NULL,
      style_profile_id INTEGER REFERENCES style_profiles(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS message_proposals_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_jid TEXT NOT NULL,
      trigger_message_id TEXT NOT NULL,
      context_hash TEXT NOT NULL,
      proposal_text TEXT NOT NULL,
      style_profile_id INTEGER REFERENCES style_profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS style_profiles_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_name TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_proposals_cache_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_name TEXT NOT NULL,
      context_hash TEXT NOT NULL,
      proposals TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timing_analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_jid TEXT NOT NULL,
      message_version_ts INTEGER NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chat_jid, message_version_ts)
    );

    CREATE TABLE IF NOT EXISTS dropout_analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_jid TEXT NOT NULL,
      message_version_ts INTEGER NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chat_jid, message_version_ts)
    );

    INSERT OR IGNORE INTO settings (key, value, updated_at) 
    VALUES ('auto_response_enabled', 'true', datetime('now'));
  `);

  dbInstance = drizzle(sqlite, { schema });
  return dbInstance;
}

export { schema };
