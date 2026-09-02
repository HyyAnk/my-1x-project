import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Ensures table schema exists and returns the SQLite database instance.
 * @param {string} workspaceRoot
 * @param {string} [customDbPath]
 * @returns {DatabaseSync}
 */
export function openClaimsDb(workspaceRoot, customDbPath) {
  const dbPath = customDbPath || path.join(workspaceRoot, ".agent-orchestrator", "state", "claims.db");
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      working_mode TEXT NOT NULL DEFAULT 'main-direct',
      base_revision TEXT,
      workspace_root TEXT NOT NULL,
      write_zones TEXT NOT NULL,
      read_stable_zones TEXT NOT NULL,
      planned_files TEXT,
      baseline_status TEXT,
      baseline_files TEXT,
      baseline_fingerprints TEXT,
      baseline_repository_fingerprint TEXT,
      verification_required TEXT,
      release_data TEXT,
      last_heartbeat_at TEXT,
      heartbeat_timeout_minutes INTEGER DEFAULT 15,
      queue_priority INTEGER DEFAULT 100,
      queue_status TEXT DEFAULT 'active',
      lease_token_hash TEXT,
      verification_data TEXT
    );
  `);

  ensureColumn(db, "last_heartbeat_at", "TEXT");
  ensureColumn(db, "heartbeat_timeout_minutes", "INTEGER DEFAULT 15");
  ensureColumn(db, "queue_priority", "INTEGER DEFAULT 100");
  ensureColumn(db, "queue_status", "TEXT DEFAULT 'active'");
  ensureColumn(db, "lease_token_hash", "TEXT");
  ensureColumn(db, "verification_data", "TEXT");
  ensureColumn(db, "baseline_fingerprints", "TEXT");
  ensureColumn(db, "baseline_repository_fingerprint", "TEXT");

  return db;
}

function ensureColumn(db, columnName, definition) {
  const columns = db.prepare("PRAGMA table_info(claims)").all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE claims ADD COLUMN ${columnName} ${definition}`);
  }
}

export function withImmediateTransaction(db, operation) {
  try {
    db.exec("BEGIN IMMEDIATE");
  } catch (error) {
    throw mapDatabaseContention(error);
  }

  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The original operation error remains the useful failure.
    }
    throw mapDatabaseContention(error);
  }
}

function mapDatabaseContention(error) {
  if (error?.code === "ERR_SQLITE_BUSY" || /database is locked/i.test(error?.message || "")) {
    return new Error("Coordination database remained busy for 5000ms. Retry the claim operation.");
  }
  return error;
}

/**
 * Deserializes database row into a structured Claim object.
 * @param {object} row
 * @returns {object|null}
 */
export function deserializeRow(row, { includeSecrets = false } = {}) {
  if (!row) return null;
  const claim = {
    id: row.id,
    agent: row.agent,
    task: row.task,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    workingMode: row.working_mode,
    baseRevision: row.base_revision,
    workspaceRoot: row.workspace_root,
    writeZones: JSON.parse(row.write_zones || "[]"),
    readStableZones: JSON.parse(row.read_stable_zones || "[]"),
    plannedFiles: JSON.parse(row.planned_files || "[]"),
    baseline: {
      baseRevision: row.base_revision,
      gitStatusShort: JSON.parse(row.baseline_status || "[]"),
      changedFiles: JSON.parse(row.baseline_files || "[]"),
      fileFingerprints: JSON.parse(row.baseline_fingerprints || "{}"),
      repositoryFingerprint: row.baseline_repository_fingerprint || null,
      note: "Files already dirty before this claim must not be edited unless covered by writeZones and explained in the release summary.",
    },
    verificationRequired: JSON.parse(row.verification_required || "[]"),
    release: row.release_data ? JSON.parse(row.release_data) : null,
    lastHeartbeatAt: row.last_heartbeat_at || row.created_at,
    heartbeatTimeoutMinutes: row.heartbeat_timeout_minutes ?? 15,
    queuePriority: row.queue_priority ?? 100,
    queueStatus: row.queue_status || row.status || "active",
    verification: row.verification_data ? JSON.parse(row.verification_data) : null,
  };
  if (includeSecrets) claim.leaseTokenHash = row.lease_token_hash || null;
  return claim;
}

/**
 * Inserts a new claim into the database.
 * @param {DatabaseSync} db
 * @param {object} claim
 */
export function insertClaimRecord(db, claim) {
  const stmt = db.prepare(`
    INSERT INTO claims (
      id, agent, task, status, created_at, updated_at, expires_at,
      working_mode, base_revision, workspace_root, write_zones,
      read_stable_zones, planned_files, baseline_status, baseline_files,
      baseline_fingerprints, baseline_repository_fingerprint,
      verification_required, release_data, last_heartbeat_at,
      heartbeat_timeout_minutes, queue_priority, queue_status,
      lease_token_hash, verification_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  stmt.run(
    claim.id,
    claim.agent,
    claim.task,
    claim.status,
    claim.createdAt,
    claim.updatedAt,
    claim.expiresAt,
    claim.workingMode || "main-direct",
    claim.baseRevision || null,
    claim.workspaceRoot,
    JSON.stringify(claim.writeZones || []),
    JSON.stringify(claim.readStableZones || []),
    JSON.stringify(claim.plannedFiles || []),
    JSON.stringify(claim.baseline?.gitStatusShort || []),
    JSON.stringify(claim.baseline?.changedFiles || []),
    JSON.stringify(claim.baseline?.fileFingerprints || {}),
    claim.baseline?.repositoryFingerprint || null,
    JSON.stringify(claim.verificationRequired || []),
    claim.release ? JSON.stringify(claim.release) : null,
    claim.lastHeartbeatAt || claim.createdAt,
    claim.heartbeatTimeoutMinutes ?? 15,
    claim.queuePriority ?? 100,
    claim.queueStatus || "active",
    claim.leaseTokenHash || null,
    claim.verification ? JSON.stringify(claim.verification) : null,
  );
}

/**
 * Queries active claims.
 * @param {DatabaseSync} db
 * @returns {Array<object>}
 */
export function getActiveClaims(db) {
  const stmt = db.prepare(`
    SELECT * FROM claims WHERE status = 'active' ORDER BY created_at ASC
  `);
  const rows = stmt.all();
  return rows.map(deserializeRow);
}

/**
 * Queries a single claim by id.
 * @param {DatabaseSync} db
 * @param {string} claimId
 * @returns {object|null}
 */
export function getClaimById(db, claimId, options) {
  const stmt = db.prepare(`SELECT * FROM claims WHERE id = ?`);
  const row = stmt.get(claimId);
  return deserializeRow(row, options);
}
