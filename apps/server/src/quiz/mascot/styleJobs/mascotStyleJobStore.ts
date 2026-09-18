/**
 * Mascot Style Job Disk Persistence & Store Helper
 *
 * Provides atomic file read/write, directory resolution, and write locking
 * for mascot style generation batches.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { MascotStyleBatchJob } from "@studio/shared";
import { writeJsonAtomic } from "../../../utils/fs.js";
import { resolveMascotDir, resolveMascotsRoot, sanitizeMascotIdentifier } from "../slotJobs/mascotSlotJobStore.js";

const styleStoreLocks = new Map<string, Promise<void>>();

export { sanitizeMascotIdentifier, resolveMascotsRoot, resolveMascotDir };

/**
 * Resolves the path to the style batches state file for a mascot.
 */
export function resolveStyleBatchesPath(mascotsRoot: string, mascotId: string): string {
  return path.join(resolveMascotDir(mascotsRoot, mascotId), "style_batches.json");
}

/**
 * Serializes read-modify-write operations for a single mascot style batch store.
 */
export async function withStyleBatchStoreLock<T>(mascotId: string, operation: () => Promise<T>): Promise<T> {
  const safeId = sanitizeMascotIdentifier(mascotId);
  const previous = styleStoreLocks.get(safeId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  styleStoreLocks.set(
    safeId,
    previous.then(() => current),
  );

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (styleStoreLocks.get(safeId) === current) {
      styleStoreLocks.delete(safeId);
    }
  }
}

/**
 * Reads and parses the style batches store file for a mascot.
 */
export async function readStyleBatchStore(mascotsRoot: string, mascotId: string): Promise<Record<string, MascotStyleBatchJob>> {
  const filePath = resolveStyleBatchesPath(mascotsRoot, mascotId);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object" && "batches" in parsed) {
      const storeData = parsed as { batches: Record<string, MascotStyleBatchJob> };
      return storeData.batches ?? {};
    }

    if (Array.isArray(parsed)) {
      const record: Record<string, MascotStyleBatchJob> = {};
      for (const batch of parsed as MascotStyleBatchJob[]) {
        if (batch?.id) record[batch.id] = batch;
      }
      return record;
    }

    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, MascotStyleBatchJob>;
    }

    return {};
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

/**
 * Atomically writes the style batches store file for a mascot.
 */
export async function writeStyleBatchStore(
  mascotsRoot: string,
  mascotId: string,
  batches: Record<string, MascotStyleBatchJob>,
): Promise<void> {
  const filePath = resolveStyleBatchesPath(mascotsRoot, mascotId);
  await writeJsonAtomic(filePath, { batches });
}

/**
 * Discovers all existing mascot IDs by scanning the mascots root directory.
 */
export async function listMascotIdsForStyles(mascotsRoot: string): Promise<string[]> {
  try {
    const entries = await readdir(mascotsRoot, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")).map((e) => e.name);
  } catch {
    return [];
  }
}
