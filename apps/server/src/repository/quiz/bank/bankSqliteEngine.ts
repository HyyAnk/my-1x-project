import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { RepositoryError } from "../../errors.js";

let SqliteDatabaseConstructor: (new (path: string) => SqliteDatabase) | null = null;
try {
  const req = createRequire(import.meta.url);
  const sqlite = req("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };
  SqliteDatabaseConstructor = sqlite.DatabaseSync;
} catch {
  SqliteDatabaseConstructor = null;
}

export const BANK_DB_FILENAME = "questions.db";

interface ScopedConnection {
  root: string;
  db: SqliteDatabase;
}

const asyncLocalStorage = new AsyncLocalStorage<ScopedConnection>();
const standalonePool = new Map<string, SqliteDatabase>();

export function getBankSqliteDbPath(runtimeBankRoot: string): string {
  return path.join(runtimeBankRoot, BANK_DB_FILENAME);
}

function openDatabaseInstance(runtimeBankRoot: string): SqliteDatabase {
  if (!SqliteDatabaseConstructor) {
    throw new RepositoryError("node:sqlite is unavailable in current runtime environment", "SQLITE_UNAVAILABLE");
  }
  const dbPath = getBankSqliteDbPath(runtimeBankRoot);
  mkdirSync(runtimeBankRoot, { recursive: true });
  const db = new SqliteDatabaseConstructor(dbPath);
  configureDatabase(db);
  initializeSchema(db);
  return db;
}

function configureDatabase(db: SqliteDatabase): void {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
}

function initializeSchema(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_questions (
      id TEXT PRIMARY KEY,
      entity_id TEXT,
      archetype_id TEXT NOT NULL,
      domain_id TEXT NOT NULL,
      subtopic_id TEXT NOT NULL,
      language TEXT DEFAULT NULL,
      question TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'multiple_choice',
      choices TEXT NOT NULL,
      correct_choice_id TEXT NOT NULL,
      explanation TEXT NOT NULL,
      fun_fact TEXT,
      visual_spec TEXT,
      age_band TEXT NOT NULL DEFAULT 'family',
      difficulty INTEGER NOT NULL DEFAULT 2,
      thinking_seconds INTEGER DEFAULT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      translations TEXT DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bank_questions_filter ON bank_questions (archetype_id, domain_id, subtopic_id);
    CREATE INDEX IF NOT EXISTS idx_bank_questions_entity ON bank_questions (entity_id);
    CREATE INDEX IF NOT EXISTS idx_bank_questions_status_updated ON bank_questions (status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bank_questions_domain_arch ON bank_questions (domain_id, archetype_id);

    CREATE TABLE IF NOT EXISTS bank_json_sync (
      file_path TEXT PRIMARY KEY,
      mtime_ms REAL NOT NULL,
      file_size INTEGER NOT NULL
    );
  `);
}

export async function withBankSqliteDb<T>(runtimeBankRoot: string, fn: (db: SqliteDatabase) => Promise<T> | T): Promise<T> {
  const existing = asyncLocalStorage.getStore();
  if (existing && existing.root === runtimeBankRoot) {
    return await fn(existing.db);
  }

  const pooled = standalonePool.get(runtimeBankRoot);
  if (pooled) {
    return await asyncLocalStorage.run({ root: runtimeBankRoot, db: pooled }, () => fn(pooled));
  }

  const db = openDatabaseInstance(runtimeBankRoot);
  try {
    return await asyncLocalStorage.run({ root: runtimeBankRoot, db }, () => fn(db));
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close error on exit
    }
  }
}

export function withBankSqliteDbSync<T>(runtimeBankRoot: string, fn: (db: SqliteDatabase) => T): T {
  const existing = asyncLocalStorage.getStore();
  if (existing && existing.root === runtimeBankRoot) {
    return fn(existing.db);
  }

  const pooled = standalonePool.get(runtimeBankRoot);
  if (pooled) {
    return asyncLocalStorage.run({ root: runtimeBankRoot, db: pooled }, () => fn(pooled));
  }

  const db = openDatabaseInstance(runtimeBankRoot);
  try {
    return asyncLocalStorage.run({ root: runtimeBankRoot, db }, () => fn(db));
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close error on exit
    }
  }
}

export function getBankSqliteDb(runtimeBankRoot: string): SqliteDatabase {
  const scoped = asyncLocalStorage.getStore();
  if (scoped && scoped.root === runtimeBankRoot) {
    return scoped.db;
  }

  let db = standalonePool.get(runtimeBankRoot);
  if (!db) {
    db = openDatabaseInstance(runtimeBankRoot);
    standalonePool.set(runtimeBankRoot, db);
  }
  return db;
}

export function closeBankSqliteDb(runtimeBankRoot: string): void {
  const db = standalonePool.get(runtimeBankRoot);
  if (db) {
    try {
      db.close();
    } catch {
      // Ignore close error
    }
    standalonePool.delete(runtimeBankRoot);
  }
}

export function closeAllBankSqliteDbs(): void {
  for (const db of standalonePool.values()) {
    try {
      db.close();
    } catch {
      // Ignore close error
    }
  }
  standalonePool.clear();
}
