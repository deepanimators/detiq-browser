import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dataDir = app.getPath('userData')
  mkdirSync(dataDir, { recursive: true })

  db = new Database(join(dataDir, 'detiq.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Load sqlite-vec extension for vector search
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqliteVec = require('sqlite-vec')
    sqliteVec.load(db)
    console.log('[db] sqlite-vec loaded')
  } catch (e) {
    console.warn('[db] sqlite-vec not available:', e)
  }

  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      companion_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool')),
      content TEXT NOT NULL,
      tool_calls TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instruction TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('schedule', 'webhook', 'manual')),
      trigger_config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS companion_memory (
      id TEXT PRIMARY KEY,
      companion_id TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS browser_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      title TEXT,
      visited_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_companion_memory_companion ON companion_memory(companion_id);
    CREATE INDEX IF NOT EXISTS idx_browser_history_visited ON browser_history(visited_at DESC);

    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('url_match', 'schedule', 'page_content')),
      trigger_pattern TEXT NOT NULL,
      companion_id TEXT NOT NULL,
      instruction TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run INTEGER,
      run_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `)

  // Create vec_memories virtual table (requires sqlite-vec extension)
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(embedding float[1536])`)
  } catch {
    // Extension not loaded — vector search will degrade to recency-based fallback
  }
}
