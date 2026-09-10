import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCompatibleShortReelRecord, type ShortReelRecord } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { resolvePath } from "./pathSafety.js";
import type { RepositoryRoots } from "./types.js";
import {
  writeShortReelJsonAtomic,
  setShortReelWriteHookForTesting,
  setShortReelRenameHookForTesting,
  setShortReelSyncHookForTesting,
  acquireWriterAdmission,
  releaseWriterAdmission,
  isWriterAdmissionHeld,
  ensureWriterAdmission,
  resolveCanonicalStorageRoot,
  runInCanonicalShortReelQueue,
} from "./shortReelAtomicWriter.js";

export {
  writeShortReelJsonAtomic,
  setShortReelWriteHookForTesting,
  setShortReelRenameHookForTesting,
  setShortReelSyncHookForTesting,
  acquireWriterAdmission,
  releaseWriterAdmission,
  isWriterAdmissionHeld,
  ensureWriterAdmission,
  resolveCanonicalStorageRoot,
  runInCanonicalShortReelQueue,
};

export function resolveShortReelsRoot(roots: RepositoryRoots, channelSlug: string): string {
  return resolvePath(roots, "channels", channelSlug, "short_reels");
}

export function resolveShortReelDirectory(roots: RepositoryRoots, channelSlug: string, reelId: string): string {
  if (!reelId || reelId.includes("/") || reelId.includes("\\") || reelId.includes("..") || reelId.includes("\0")) {
    throw new RepositoryError("Unsafe filesystem path in reel ID", "UNSAFE_PATH");
  }
  return resolvePath(roots, "channels", channelSlug, "short_reels", reelId);
}

export function resolveShortReelFile(roots: RepositoryRoots, channelSlug: string, reelId: string): string {
  const dir = resolveShortReelDirectory(roots, channelSlug, reelId);
  return path.join(dir, "reel.json");
}

export async function readShortReelJson(filePath: string): Promise<ShortReelRecord> {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseCompatibleShortReelRecord(JSON.parse(raw));
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      throw new RepositoryError("Short-Reel not found", "SHORT_REEL_NOT_FOUND");
    }
    throw error;
  }
}
