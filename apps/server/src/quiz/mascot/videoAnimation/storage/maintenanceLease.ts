import { createRequire } from "node:module";
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync as Database } from "node:sqlite";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (filename: string) => Database };

/** OS-backed lease shared by the production server and offline maintenance. No stale lock deletion. */
export function acquireStorageMaintenanceLease(storageRoot: string): () => void {
  if (!path.isAbsolute(storageRoot) || lstatSync(storageRoot).isSymbolicLink())
    throw new Error("Storage root must be an absolute real directory");
  const root = realpathSync.native(storageRoot);
  const filename = path.join(root, ".storage-maintenance.lock");
  try {
    if (lstatSync(filename).isSymbolicLink()) throw new Error("Maintenance lock must not be a link");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const db = new DatabaseSync(filename);
  try {
    db.exec(
      "PRAGMA busy_timeout = 50; PRAGMA locking_mode = EXCLUSIVE; CREATE TABLE IF NOT EXISTS lease (id INTEGER PRIMARY KEY); BEGIN EXCLUSIVE;",
    );
  } catch {
    db.close();
    throw new Error("Storage is busy: stop the server and other maintenance processes before retrying");
  }
  let closed = false;
  return () => {
    if (!closed) {
      db.close();
      closed = true;
    }
  };
}
