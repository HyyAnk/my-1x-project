import path from "node:path";
import { readdir, rm, stat } from "node:fs/promises";
import {
  getDefaultPreviewStoreDir,
  getPublishedPreviewArtifact,
  publishPreviewArtifact,
  type PublishedPreviewArtifact,
  type TransitionPreviewArtifactManifest,
  type VerifiedPreviewArtifact,
} from "../render/transitions/transitionPreviewStore.js";
import type { TransitionPreviewStorePort } from "./transitionPreview.types.js";

export * from "../render/transitions/transitionPreviewStore.js";

export function artifactIdForFingerprint(fingerprint: string): string {
  return `tp_${fingerprint.slice(0, 32)}`;
}

export class DiskTransitionPreviewStore implements TransitionPreviewStorePort {
  private readonly storeDir: string;
  private readonly maxStorageBytes: number;

  constructor(options?: { storeDir?: string; maxStorageBytes?: number }) {
    this.storeDir = options?.storeDir ?? getDefaultPreviewStoreDir();
    this.maxStorageBytes = options?.maxStorageBytes ?? 2 * 1024 * 1024 * 1024; // 2 GiB default soft cap
  }

  getStoreDir(): string {
    return this.storeDir;
  }

  async getPublishedArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    return getPublishedPreviewArtifact(artifactId, this.storeDir);
  }

  async findArtifactByFingerprint(fingerprint: string): Promise<PublishedPreviewArtifact | null> {
    const artifactId = artifactIdForFingerprint(fingerprint);
    const published = await getPublishedPreviewArtifact(artifactId, this.storeDir);
    if (published && published.manifest.inputFingerprint === fingerprint) {
      return published;
    }
    return null;
  }

  async publishArtifact(artifact: VerifiedPreviewArtifact): Promise<PublishedPreviewArtifact> {
    const published = await publishPreviewArtifact(artifact, this.storeDir);
    // Bounded LRU eviction in the background (swallows errors)
    void this.evictIfOverQuota().catch(() => {});
    return published;
  }

  async verifyArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    return this.getPublishedArtifact(artifactId);
  }

  async evictIfOverQuota(): Promise<number> {
    try {
      const entries = await readdir(this.storeDir, { withFileTypes: true });
      const artifactDirs: Array<{ name: string; path: string; mtimeMs: number; sizeBytes: number }> = [];
      let totalBytes = 0;

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.includes(".staging.")) continue;
        const dirPath = path.join(this.storeDir, entry.name);
        try {
          const videoStat = await stat(path.join(dirPath, "video.mp4"));
          const manifestStat = await stat(path.join(dirPath, "manifest.json"));
          const size = videoStat.size + manifestStat.size;
          totalBytes += size;
          artifactDirs.push({
            name: entry.name,
            path: dirPath,
            mtimeMs: Math.max(videoStat.mtimeMs, manifestStat.mtimeMs),
            sizeBytes: size,
          });
        } catch {
          // Ignored if missing required files
        }
      }

      if (totalBytes <= this.maxStorageBytes) {
        return 0;
      }

      // Sort oldest first (LRU)
      artifactDirs.sort((a, b) => a.mtimeMs - b.mtimeMs);

      let freedBytes = 0;
      for (const item of artifactDirs) {
        if (totalBytes - freedBytes <= this.maxStorageBytes) {
          break;
        }
        try {
          await rm(item.path, { recursive: true, force: true });
          freedBytes += item.sizeBytes;
        } catch {
          // Continue if error removing
        }
      }

      return freedBytes;
    } catch {
      return 0;
    }
  }
}
