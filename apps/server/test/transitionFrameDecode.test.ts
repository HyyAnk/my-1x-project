import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import Fastify from "fastify";
import {
  decodePngToRawRgba,
  decodeVideoFrameToPng,
  decodeVideoFrameToRawRgba,
} from "../src/tasks/video/videoFrameDecoder.js";
import { TransitionPreviewFramesService } from "../src/quiz/transitionPreview/transitionPreviewFrames.js";
import { registerTransitionPreviewsRoutes } from "../src/routes/transitionPreviews.js";
import { TransitionPreviewService } from "../src/quiz/transitionPreview/transitionPreviewService.js";
import type {
  TransitionPreviewStorePort,
  TransitionPreviewRunnerPort,
  TransitionPreviewRunnerInput,
} from "../src/quiz/transitionPreview/transitionPreview.types.js";
import type {
  PublishedPreviewArtifact,
  VerifiedPreviewArtifact,
} from "../src/quiz/transitionPreview/transitionPreviewStore.js";

async function generateBFrameVideo(outputPath: string, durationSeconds = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `testsrc=size=128x128:rate=30:duration=${durationSeconds}`,
        "-c:v",
        "libx264",
        "-bf",
        "2",
        "-g",
        "30",
        "-pix_fmt",
        "yuv420p",
        outputPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );

    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg testsrc generation failed (${code}): ${stderr.slice(-500)}`));
    });
    child.on("error", reject);
  });
}

function sha256Buffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

class InMemoryFrameTestStore implements TransitionPreviewStorePort {
  private readonly artifacts = new Map<string, VerifiedPreviewArtifact>();

  async getPublishedArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    const item = this.artifacts.get(artifactId);
    if (!item) return null;
    return { ...item, manifestPath: `/mock/${artifactId}/manifest.json` };
  }

  async findArtifactByFingerprint(fingerprint: string): Promise<PublishedPreviewArtifact | null> {
    for (const a of this.artifacts.values()) {
      if (a.manifest.inputFingerprint === fingerprint) {
        return { ...a, manifestPath: `/mock/${a.artifactId}/manifest.json` };
      }
    }
    return null;
  }

  async publishArtifact(artifact: VerifiedPreviewArtifact): Promise<PublishedPreviewArtifact> {
    this.artifacts.set(artifact.artifactId, artifact);
    return { ...artifact, manifestPath: `/mock/${artifact.artifactId}/manifest.json` };
  }

  async verifyArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    return this.getPublishedArtifact(artifactId);
  }
}

describe("Task 6: Video Frame Decoder & Exact Frames Verification", () => {
  it("decodes display-order frames with exact zero-pixel RGBA parity against independent reference decode", async () => {
    const tmpDir = path.join(os.tmpdir(), `frame-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
    const videoPath = path.join(tmpDir, "bframe_test.mp4");

    try {
      await generateBFrameVideo(videoPath, 1); // 30 frames at 30 fps

      const framesToTest = [0, 7, 14, 29]; // first, middle/b-frame, boundary, last

      for (const frameIndex of framesToTest) {
        // 1. Decoder under test: outputs PNG
        const png = await decodeVideoFrameToPng({ videoPath, frameIndex });
        expect(png.length).toBeGreaterThan(0);
        // Verify PNG magic bytes
        expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

        // Decode test PNG to uncompressed RGBA
        const actualRgba = await decodePngToRawRgba(png);
        const actualHash = sha256Buffer(actualRgba);

        // 2. Independent reference command: decodes video frame directly to uncompressed RGBA
        const referenceRgba = await decodeVideoFrameToRawRgba(videoPath, frameIndex);
        const referenceHash = sha256Buffer(referenceRgba);

        expect(actualRgba.length).toBe(128 * 128 * 4);
        expect(referenceRgba.length).toBe(128 * 128 * 4);
        // Zero differing pixels: exactly identical RGBA hash
        expect(actualHash).toBe(referenceHash);
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("TransitionPreviewFramesService manages caching, deduplication, and bounds validation", async () => {
    const tmpDir = path.join(os.tmpdir(), `frames-svc-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const videoPath = path.join(tmpDir, "sample.mp4");

    try {
      await generateBFrameVideo(videoPath, 1); // 30 frames
      const store = new InMemoryFrameTestStore();
      const artifactId = "art_preview_test";
      const artifactSha256 = "sha256_mock_video";

      await store.publishArtifact({
        artifactId,
        videoPath,
        manifest: {
          artifactId,
          artifactSha256,
          inputFingerprint: "fp_test",
          catalogRevision: "cat_rev",
          engineSnapshotHash: "eng_hash",
          sourceKind: "sample",
          currentness: "matches-request",
          width: 128,
          height: 128,
          fps: { numerator: 30, denominator: 1 },
          frameCount: 30,
          timeBase: { numerator: 1, denominator: 30 },
          frames: Array.from({ length: 30 }, (_, i) => ({ index: i, pts: i })),
          reviewWindow: { firstFrame: 0, lastFrameInclusive: 29, boundaryFrame: 15 },
          instances: [],
        },
      });

      const framesService = new TransitionPreviewFramesService(store);

      // 1. Decode frame 7
      const res1 = await framesService.decodeArtifactFrame(artifactId, 7);
      expect(res1.artifactId).toBe(artifactId);
      expect(res1.artifactSha256).toBe(artifactSha256);
      expect(res1.frameIndex).toBe(7);
      expect(res1.png.length).toBeGreaterThan(0);

      // 2. Cache hit: second request returns identical cached buffer
      const res2 = await framesService.decodeArtifactFrame(artifactId, 7);
      expect(res2.png).toBe(res1.png); // Exact same buffer instance

      // 3. Concurrent duplicate requests coalesce
      const [p1, p2] = await Promise.all([
        framesService.decodeArtifactFrame(artifactId, 12),
        framesService.decodeArtifactFrame(artifactId, 12),
      ]);
      expect(p1.png).toEqual(p2.png);

      // 4. Out of bounds throws INVALID_TIMING
      await expect(framesService.decodeArtifactFrame(artifactId, -1)).rejects.toThrow();
      await expect(framesService.decodeArtifactFrame(artifactId, 30)).rejects.toThrow();

      // 5. Expired / missing artifact throws ARTIFACT_EXPIRED
      await expect(framesService.decodeArtifactFrame("non_existent_art", 0)).rejects.toThrow();
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("HTTP GET /api/transition-previews/artifacts/:id/frames/:index serves exact PNG with ETag and headers", async () => {
    const tmpDir = path.join(os.tmpdir(), `frames-route-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const videoPath = path.join(tmpDir, "route_video.mp4");

    try {
      await generateBFrameVideo(videoPath, 1);
      const store = new InMemoryFrameTestStore();
      const artifactId = "art_route_test";
      const artifactSha256 = "sha256_route_video";

      await store.publishArtifact({
        artifactId,
        videoPath,
        manifest: {
          artifactId,
          artifactSha256,
          inputFingerprint: "fp_route",
          catalogRevision: "cat_rev",
          engineSnapshotHash: "eng_hash",
          sourceKind: "sample",
          currentness: "matches-request",
          width: 128,
          height: 128,
          fps: { numerator: 30, denominator: 1 },
          frameCount: 30,
          timeBase: { numerator: 1, denominator: 30 },
          frames: Array.from({ length: 30 }, (_, i) => ({ index: i, pts: i })),
          reviewWindow: { firstFrame: 0, lastFrameInclusive: 29, boundaryFrame: 15 },
          instances: [],
        },
      });

      const runner: TransitionPreviewRunnerPort = {
        render: async () => {
          throw new Error("Not used in frame test");
        },
      };
      const service = new TransitionPreviewService({ store, runner });
      const framesService = new TransitionPreviewFramesService(store);

      const app = Fastify({ logger: false });
      await app.register(registerTransitionPreviewsRoutes({ service, store, framesService }));

      // 1. Successful frame request
      const res = await app.inject({
        method: "GET",
        url: `/api/transition-previews/artifacts/${artifactId}/frames/5`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["x-artifact-sha256"]).toBe(artifactSha256);
      expect(res.headers["x-frame-index"]).toBe("5");
      expect(res.headers["cache-control"]).toContain("immutable");

      const etag = res.headers["etag"] as string;
      expect(etag).toBe(`"${artifactSha256}-f5"`);

      // 2. Revalidation with ETag returns 304
      const cached = await app.inject({
        method: "GET",
        url: `/api/transition-previews/artifacts/${artifactId}/frames/5`,
        headers: { "if-none-match": etag },
      });
      expect(cached.statusCode).toBe(304);

      // 3. Out of bounds index returns 400
      const outOfBounds = await app.inject({
        method: "GET",
        url: `/api/transition-previews/artifacts/${artifactId}/frames/100`,
      });
      expect(outOfBounds.statusCode).toBe(400);

      // 4. Missing artifact returns 404
      const missing = await app.inject({
        method: "GET",
        url: `/api/transition-previews/artifacts/unknown_artifact/frames/0`,
      });
      expect(missing.statusCode).toBe(404);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
