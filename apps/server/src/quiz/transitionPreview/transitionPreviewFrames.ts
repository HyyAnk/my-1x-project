import { TransitionDomainError } from "@studio/shared";
import { decodeVideoFrameToPng } from "../../tasks/video/videoFrameDecoder.js";
import type { TransitionPreviewStorePort } from "./transitionPreview.types.js";

export type DecodedFrameResult = {
  artifactId: string;
  artifactSha256: string;
  frameIndex: number;
  png: Buffer;
};

export class TransitionPreviewFramesService {
  private readonly store: TransitionPreviewStorePort;
  private readonly memoryCache = new Map<string, Buffer>();
  private readonly inFlight = new Map<string, Promise<DecodedFrameResult>>();
  private readonly prefetching = new Set<string>();

  constructor(store: TransitionPreviewStorePort) {
    this.store = store;
  }

  async decodeArtifactFrame(
    artifactId: string,
    frameIndex: number,
    signal?: AbortSignal,
  ): Promise<DecodedFrameResult> {
    if (!Number.isInteger(frameIndex) || frameIndex < 0) {
      throw new TransitionDomainError("INVALID_TIMING", `Frame index must be a non-negative integer: ${frameIndex}`);
    }

    const artifact = await this.store.getPublishedArtifact(artifactId);
    if (!artifact) {
      throw new TransitionDomainError("ARTIFACT_EXPIRED", `Artifact not found or expired: ${artifactId}`);
    }

    const totalFrames = artifact.manifest.frameCount;
    if (frameIndex >= totalFrames) {
      throw new TransitionDomainError(
        "INVALID_TIMING",
        `Frame index ${frameIndex} is out of range [0, ${totalFrames - 1}]`,
      );
    }

    const cacheKey = `${artifact.manifest.artifactSha256}:f${frameIndex}`;

    // 1. Check in-memory cache
    const cached = this.memoryCache.get(cacheKey);
    if (cached) {
      this.triggerPrefetch(artifact.artifactId, artifact.videoPath, artifact.manifest.artifactSha256, frameIndex, totalFrames);
      return {
        artifactId,
        artifactSha256: artifact.manifest.artifactSha256,
        frameIndex,
        png: cached,
      };
    }

    // 2. Check in-flight promise deduplication
    const active = this.inFlight.get(cacheKey);
    if (active) {
      return active;
    }

    // 3. Decode frame
    const promise = (async () => {
      try {
        const png = await decodeVideoFrameToPng({
          videoPath: artifact.videoPath,
          frameIndex,
          signal,
        });

        this.memoryCache.set(cacheKey, png);
        this.triggerPrefetch(
          artifact.artifactId,
          artifact.videoPath,
          artifact.manifest.artifactSha256,
          frameIndex,
          totalFrames,
        );

        return {
          artifactId,
          artifactSha256: artifact.manifest.artifactSha256,
          frameIndex,
          png,
        };
      } finally {
        this.inFlight.delete(cacheKey);
      }
    })();

    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  private triggerPrefetch(
    artifactId: string,
    videoPath: string,
    artifactSha256: string,
    currentFrame: number,
    totalFrames: number,
  ): void {
    const neighbors = [
      currentFrame - 1,
      currentFrame + 1,
      currentFrame - 2,
      currentFrame + 2,
    ].filter((f) => f >= 0 && f < totalFrames);

    for (const neighbor of neighbors) {
      const key = `${artifactSha256}:f${neighbor}`;
      if (this.memoryCache.has(key) || this.prefetching.has(key)) continue;

      this.prefetching.add(key);
      void decodeVideoFrameToPng({ videoPath, frameIndex: neighbor })
        .then((png) => {
          this.memoryCache.set(key, png);
        })
        .catch(() => {
          // Prefetch failure is non-fatal
        })
        .finally(() => {
          this.prefetching.delete(key);
        });
    }
  }

  clearCache(): void {
    this.memoryCache.clear();
    this.inFlight.clear();
    this.prefetching.clear();
  }
}
