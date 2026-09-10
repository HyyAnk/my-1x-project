import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

export interface PruneRenderOptions {
  retainCheckpoint?: boolean;
  retainLog?: boolean;
}

export interface PruneResult {
  prunedFiles: string[];
  reclaimedBytes: number;
}

export interface StalePruneResult {
  prunedDirs: string[];
  reclaimedBytes: number;
}

export interface StorageUsageSummary {
  runtime_bytes: number;
  hyperframes_bytes: number;
}

const MEDIA_EXTENSIONS = new Set([".wav", ".mp4", ".mp3", ".ogg", ".webm", ".aac", ".m4a", ".mov", ".mkv", ".avi"]);

function isCheckpointFile(name: string): boolean {
  return name.toLowerCase().includes("checkpoint") && name.endsWith(".json");
}

function isLogFile(name: string): boolean {
  return name.endsWith(".log");
}

export async function calculatePathBytes(targetPath: string): Promise<number> {
  try {
    const stats = await stat(targetPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }
    const entries = await readdir(targetPath, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      total += await calculatePathBytes(path.join(targetPath, entry.name));
    }
    return total;
  } catch {
    return 0;
  }
}

export async function pruneRenderRootIntermediateFiles(renderRoot: string, options?: PruneRenderOptions): Promise<PruneResult> {
  const prunedFiles: string[] = [];
  let reclaimedBytes = 0;

  const retainCheckpoint = options?.retainCheckpoint ?? true;
  const retainLog = options?.retainLog ?? true;

  try {
    const entries = await readdir(renderRoot, { withFileTypes: true });

    for (const entry of entries) {
      const itemPath = path.join(renderRoot, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "compositions") continue;
        const dirSize = await calculatePathBytes(itemPath);
        await rm(itemPath, { recursive: true, force: true });
        prunedFiles.push(entry.name);
        reclaimedBytes += dirSize;
        continue;
      }

      if (isCheckpointFile(entry.name)) {
        if (retainCheckpoint) continue;
      } else if (isLogFile(entry.name)) {
        if (retainLog) continue;
      } else if (!MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) && !entry.name.endsWith(".tmp")) {
        continue;
      }

      try {
        const fileStat = await stat(itemPath);
        await rm(itemPath, { force: true });
        prunedFiles.push(entry.name);
        reclaimedBytes += fileStat.size;
      } catch {
        // Skip files that were already removed or cannot be accessed
      }
    }
  } catch {
    // Directory might not exist
  }

  return { prunedFiles, reclaimedBytes };
}

export async function pruneStaleHyperframesDirectories(
  hyperframesRoot: string,
  maxAgeMs = 24 * 60 * 60 * 1000,
  activeEpisodeIds?: Set<string>,
): Promise<StalePruneResult> {
  const prunedDirs: string[] = [];
  let reclaimedBytes = 0;
  const now = Date.now();

  try {
    const entries = await readdir(hyperframesRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const episodeId = entry.name;
      if (activeEpisodeIds?.has(episodeId)) continue;

      const dirPath = path.join(hyperframesRoot, episodeId);
      try {
        const stats = await stat(dirPath);
        let newestMtime = stats.mtimeMs;
        try {
          const children = await readdir(dirPath);
          for (const child of children) {
            const childStat = await stat(path.join(dirPath, child));
            if (childStat.mtimeMs > newestMtime) newestMtime = childStat.mtimeMs;
          }
        } catch {
          // Ignore children enumeration failures
        }

        if (now - newestMtime >= maxAgeMs) {
          const dirSize = await calculatePathBytes(dirPath);
          await rm(dirPath, { recursive: true, force: true });
          prunedDirs.push(episodeId);
          reclaimedBytes += dirSize;
        }
      } catch {
        // Skip unreadable or already deleted directory
      }
    }
  } catch {
    // Directory might not exist
  }

  return { prunedDirs, reclaimedBytes };
}

export async function getStorageUsageSummary(repositoryRoot: string, runtimeRoot: string): Promise<StorageUsageSummary> {
  const hyperframesRoot = path.join(runtimeRoot, "hyperframes");
  const [runtime_bytes, hyperframes_bytes] = await Promise.all([calculatePathBytes(runtimeRoot), calculatePathBytes(hyperframesRoot)]);

  return {
    runtime_bytes,
    hyperframes_bytes,
  };
}
