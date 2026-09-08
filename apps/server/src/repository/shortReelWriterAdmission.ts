import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { RepositoryError } from "./errors.js";

// Older Vite test transforms do not recognize node:sqlite as a built-in import.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };

interface Owner {
  pending: number;
  closing?: Promise<void>;
  resolve?: () => void;
  reject?: (error: Error) => void;
}
interface Admission {
  db: SqliteDatabase;
  owners: Map<string, Owner>;
  state: "accepting" | "draining";
}
const anonymousOwner = "anonymous";
const admissions = new Map<string, Admission>();

export function resolveCanonicalStorageRoot(storageRoot: string): string {
  try {
    fs.mkdirSync(path.resolve(storageRoot), { recursive: true });
    return fs.realpathSync.native(path.resolve(storageRoot));
  } catch {
    throw new RepositoryError("Cannot resolve storage root", "STORAGE_BUSY");
  }
}

function openAdmission(root: string): Admission {
  let db: SqliteDatabase | undefined;
  try {
    db = new DatabaseSync(path.join(root, ".short_reel_writer.lock"));
    db.exec("PRAGMA busy_timeout = 50; PRAGMA locking_mode = EXCLUSIVE;");
    db.exec("CREATE TABLE IF NOT EXISTS lock_lease (id INTEGER PRIMARY KEY);");
    db.exec("BEGIN EXCLUSIVE;");
    return { db, owners: new Map(), state: "accepting" };
  } catch {
    db?.close();
    throw new RepositoryError("Storage root is unavailable or locked by another process", "STORAGE_BUSY");
  }
}

export function acquireWriterAdmission(storageRoot: string, ownerId = anonymousOwner): void {
  const root = resolveCanonicalStorageRoot(storageRoot);
  const lease = admissions.get(root) ?? openAdmission(root);
  if (lease.state === "draining" || lease.owners.get(ownerId)?.closing) {
    throw new RepositoryError("Storage writer is closing", "STORAGE_BUSY");
  }
  if (!lease.owners.has(ownerId)) lease.owners.set(ownerId, { pending: 0 });
  admissions.set(root, lease);
}

function finishDrainedOwners(root: string, lease: Admission): void {
  const drained = [...lease.owners.entries()].filter(([, owner]) => owner.closing && owner.pending === 0);
  if (drained.length === lease.owners.size) {
    try {
      // Closing SQLite rolls back the exclusive transaction and releases the OS lock.
      lease.db.close();
    } catch {
      lease.state = "draining";
      const error = new RepositoryError("Storage writer could not close safely", "STORAGE_BUSY");
      for (const [, owner] of drained) owner.reject?.(error);
      return; // Retain admission and reject new work if close fails.
    }
    admissions.delete(root);
  }
  for (const [id, owner] of drained) {
    lease.owners.delete(id);
    owner.resolve?.();
  }
}

export async function releaseWriterAdmission(storageRoot: string, ownerId?: string): Promise<void> {
  const root = resolveCanonicalStorageRoot(storageRoot);
  const lease = admissions.get(root);
  if (lease && ownerId === undefined) {
    // Explicit root-wide shutdown still drains every owner; it never force-unlocks.
    await Promise.all([...lease.owners.keys()].map((id) => releaseWriterAdmission(root, id)));
    return;
  }
  if (ownerId === undefined) return;
  const owner = lease?.owners.get(ownerId);
  if (!lease || !owner) return;
  if (!owner.closing) {
    owner.closing = new Promise<void>((resolve, reject) => {
      owner.resolve = resolve;
      owner.reject = reject;
    });
    if ([...lease.owners.values()].every((entry) => Boolean(entry.closing))) lease.state = "draining";
    finishDrainedOwners(root, lease);
  }
  await owner.closing;
}

export function isWriterAdmissionHeld(storageRoot: string, ownerId?: string): boolean {
  const lease = admissions.get(resolveCanonicalStorageRoot(storageRoot));
  return Boolean(lease && (ownerId === undefined || lease.owners.has(ownerId)));
}

export function ensureWriterAdmission(storageRoot: string, ownerId = anonymousOwner): void {
  acquireWriterAdmission(storageRoot, ownerId);
}

/** Reserve synchronously, before scheduling: pending work also owns the lock. */
export function reserveWriterOperation(storageRoot: string, ownerId = anonymousOwner): () => void {
  const root = resolveCanonicalStorageRoot(storageRoot);
  const lease = admissions.get(root);
  const owner = lease?.owners.get(ownerId);
  if (!lease || lease.state !== "accepting" || !owner || owner.closing) {
    throw new RepositoryError("Storage writer is not accepting work", "STORAGE_BUSY");
  }
  owner.pending += 1;
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    owner.pending -= 1;
    if (owner.closing) finishDrainedOwners(root, lease);
  };
}

process.on("exit", () => {
  for (const lease of admissions.values()) {
    try {
      lease.db.close();
    } catch {
      /* The OS closes remaining handles when the process exits. */
    }
  }
});
