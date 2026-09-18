/**
 * Mascot Slot Job Disk Persistence & Store Helper
 *
 * Provides atomic file read/write, directory resolution, and write locking
 * for mascot slot generation batches.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { MascotSlotBatchJob } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { writeJsonAtomic } from "../../../utils/fs.js";

const mascotStoreLocks = new Map<string, Promise<void>>();

/**
 * Sanitizes a mascot or style identifier to prevent directory traversal.
 */
export function sanitizeMascotIdentifier(id: string): string {
  const trimmed = id.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error(`Invalid mascot identifier: "${id}". Only alphanumeric, dash, and underscore are allowed.`);
  }
  return trimmed;
}

/**
 * Resolves the base mascots directory from either a storage root string or a RepositoryService.
 */
export function resolveMascotsRoot(target: string | RepositoryService): string {
  if (typeof target !== "string") {
    return target.roots?.mascots ?? path.join(target.rootDirectory, "mascots");
  }
  const base = path.basename(target);
  if (base === "mascots") {
    return target;
  }
  return path.join(target, "mascots");
}

/**
 * Resolves the directory path for a specific mascot.
 */
export function resolveMascotDir(mascotsRoot: string, mascotId: string): string {
  return path.join(mascotsRoot, sanitizeMascotIdentifier(mascotId));
}

/**
 * Resolves the path to the slot batches state file for a mascot.
 */
export function resolveSlotBatchesPath(mascotsRoot: string, mascotId: string): string {
  return path.join(resolveMascotDir(mascotsRoot, mascotId), "slot_batches.json");
}

/**
 * Serializes read-modify-write operations for a single mascot to ensure store consistency.
 */
export async function withBatchStoreLock<T>(mascotId: string, operation: () => Promise<T>): Promise<T> {
  const safeId = sanitizeMascotIdentifier(mascotId);
  const previous = mascotStoreLocks.get(safeId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  mascotStoreLocks.set(
    safeId,
    previous.then(() => current),
  );

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (mascotStoreLocks.get(safeId) === current) {
      mascotStoreLocks.delete(safeId);
    }
  }
}

/**
 * Reads and parses the slot batches store file for a mascot.
 * Returns an empty record if the file does not exist or cannot be parsed.
 */
export async function readBatchStore(mascotsRoot: string, mascotId: string): Promise<Record<string, MascotSlotBatchJob>> {
  const filePath = resolveSlotBatchesPath(mascotsRoot, mascotId);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object" && "batches" in parsed) {
      const storeData = parsed as { batches: Record<string, MascotSlotBatchJob> };
      return storeData.batches ?? {};
    }

    if (Array.isArray(parsed)) {
      const record: Record<string, MascotSlotBatchJob> = {};
      for (const batch of parsed as MascotSlotBatchJob[]) {
        if (batch?.id) record[batch.id] = batch;
      }
      return record;
    }

    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, MascotSlotBatchJob>;
    }

    return {};
  } catch {
    return {};
  }
}

/**
 * Atomically writes the slot batches store file for a mascot.
 */
export async function writeBatchStore(mascotsRoot: string, mascotId: string, batches: Record<string, MascotSlotBatchJob>): Promise<void> {
  const filePath = resolveSlotBatchesPath(mascotsRoot, mascotId);
  await writeJsonAtomic(filePath, { batches });
}

/**
 * Discovers all existing mascot IDs by listing subdirectories in the mascots root.
 */
export async function listMascotIds(mascotsRoot: string): Promise<string[]> {
  try {
    const entries = await readdir(mascotsRoot, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
