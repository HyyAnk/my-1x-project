import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "./errors.js";

/**
 * Pre-write upgrade hook:
 * When writing a record over a file that currently exists on disk as v1:
 * - Creates an exclusive, byte-exact sibling `reel.v1.backup.json` in the same directory.
 * - Verifies the backup was written and matches the existing v1 bytes.
 * - If `reel.v1.backup.json` already exists and differs from the file on disk, throws UPGRADE_BACKUP_MISMATCH.
 * - If the file on disk is already v2 or does not exist, does nothing.
 */
export async function prepareShortReelV1UpgradeBackup(targetFile: string): Promise<void> {
  let existingBytes: Buffer;
  try {
    existingBytes = await readFile(targetFile);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      return; // New file creation, no v1 backup needed
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(existingBytes.toString("utf8"));
  } catch {
    return;
  }

  if (!parsed || typeof parsed !== "object") {
    return;
  }

  const record = parsed as Record<string, unknown>;
  if (record.schema_version !== 1) {
    return; // Already v2 or not v1, no v1 backup needed
  }

  const dir = path.dirname(targetFile);
  const backupFile = path.join(dir, "reel.v1.backup.json");

  try {
    const existingBackupBytes = await readFile(backupFile);
    if (!existingBackupBytes.equals(existingBytes)) {
      throw new RepositoryError("Existing reel.v1.backup.json does not match disk v1 record", "UPGRADE_BACKUP_MISMATCH");
    }
    return;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error instanceof RepositoryError) {
      throw error;
    }
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const tempBackup = `${backupFile}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tempBackup, existingBytes);
  try {
    await rename(tempBackup, backupFile);
  } catch {
    try {
      await unlink(tempBackup);
    } catch {}
    const concurrentBytes = await readFile(backupFile);
    if (!concurrentBytes.equals(existingBytes)) {
      throw new RepositoryError("Concurrent reel.v1.backup.json does not match disk v1 record", "UPGRADE_BACKUP_MISMATCH");
    }
  }

  const verifiedBytes = await readFile(backupFile);
  if (!verifiedBytes.equals(existingBytes)) {
    throw new RepositoryError("Created reel.v1.backup.json does not match disk v1 record", "UPGRADE_BACKUP_MISMATCH");
  }
}
