import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || './clyro.db';

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS vault (
    id INTEGER PRIMARY KEY,
    encrypted_vault TEXT NOT NULL,
    vault_version INTEGER NOT NULL,
    vault_salt TEXT NOT NULL,
    last_modified TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pairing_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_used_at TEXT
  );
`);
