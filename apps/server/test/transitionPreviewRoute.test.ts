import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { computeCatalogRevision } from "@studio/shared";
import { registerTransitionPreviewsRoutes } from "../src/routes/transitionPreviews.js";
import { TransitionPreviewService } from "../src/quiz/transitionPreview/transitionPreviewService.js";
import { SPECIMEN_SAMPLE_REVISION } from "../src/quiz/render/transitions/prepareTransitionSpecimen.js";
import type {
  TransitionPreviewRunnerInput,
  TransitionPreviewRunnerPort,
  TransitionPreviewStorePort,
} from "../src/quiz/transitionPreview/transitionPreview.types.js";
import type {
  PublishedPreviewArtifact,
  VerifiedPreviewArtifact,
} from "../src/quiz/transitionPreview/transitionPreviewStore.js";

class RouteTestStore implements TransitionPreviewStorePort {
  private readonly artifacts = new Map<string, VerifiedPreviewArtifact>();

  async getPublishedArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    const found = this.artifacts.get(artifactId);
    if (!found) return null;
    return {
      ...found,
      manifestPath: `/mock/${artifactId}/manifest.json`,
    };
  }

  async findArtifactByFingerprint(fingerprint: string): Promise<PublishedPreviewArtifact | null> {
    for (const a of this.artifacts.values()) {
      if (a.manifest.inputFingerprint === fingerprint) {
        return {
          ...a,
          manifestPath: `/mock/${a.artifactId}/manifest.json`,
        };
      }
    }
    return null;
  }

  async publishArtifact(artifact: VerifiedPreviewArtifact): Promise<PublishedPreviewArtifact> {
    this.artifacts.set(artifact.artifactId, artifact);
    return {
      ...artifact,
      manifestPath: `/mock/${artifact.artifactId}/manifest.json`,
    };
  }

  async verifyArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    return this.getPublishedArtifact(artifactId);
  }
}

class RouteTestRunner implements TransitionPreviewRunnerPort {
  async render(input: TransitionPreviewRunnerInput): Promise<VerifiedPreviewArtifact> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), 60);
      input.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Render aborted"));
      });
    });
    return {
      artifactId: `route_art_${input.fingerprint.slice(0, 8)}`,
      videoPath: `/mock/${input.fingerprint}/output.mp4`,
      manifest: {
        artifactId: `route_art_${input.fingerprint.slice(0, 8)}`,
        artifactSha256: "routesha256",
        inputFingerprint: input.fingerprint,
        catalogRevision: input.catalogRevision,
        engineSnapshotHash: input.snapshot.snapshotHash,
        sourceKind: input.sourceKind,
        currentness: input.currentness,
        width: input.specimen.width,
        height: input.specimen.height,
        fps: input.specimen.fps,
        frameCount: input.specimen.totalDurationFrames,
        timeBase: { numerator: 1, denominator: 30 },
        frames: [{ index: 0, pts: 0 }],
        reviewWindow: input.specimen.reviewWindow,
        instances: [input.specimen.resolvedInstance],
      },
    };
  }
}

async function buildTestServer() {
  const store = new RouteTestStore();
  const runner = new RouteTestRunner();
  const service = new TransitionPreviewService({ store, runner });

  const app = Fastify({ logger: false });
  await app.register(registerTransitionPreviewsRoutes({ service, store }));
  return { app, store, service };
}

describe("Task 5: Transition Preview Routes", () => {
  it("GET /api/transition-previews/catalog returns catalog and supports ETag caching", async () => {
    const { app } = await buildTestServer();

    const res = await app.inject({
      method: "GET",
      url: "/api/transition-previews/catalog",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.revision).toBe(computeCatalogRevision());
    expect(body.sampleRevision).toBe(SPECIMEN_SAMPLE_REVISION);
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBeGreaterThanOrEqual(6);

    const etag = res.headers["etag"] as string;
    expect(etag).toBeTruthy();

    // Revalidation with If-None-Match
    const cachedRes = await app.inject({
      method: "GET",
      url: "/api/transition-previews/catalog",
      headers: { "if-none-match": etag },
    });
    expect(cachedRes.statusCode).toBe(304);
  });

  it("POST /api/transition-previews validates input and creates preview job", async () => {
    const { app } = await buildTestServer();

    // Invalid payload
    const badRes = await app.inject({
      method: "POST",
      url: "/api/transition-previews",
      payload: { invalid: true },
    });
    expect(badRes.statusCode).toBe(400);

    // Outdated catalog revision -> 409
    const outdatedRes = await app.inject({
      method: "POST",
      url: "/api/transition-previews",
      payload: {
        clientRequestId: "req-outdated",
        catalogRevision: "old-revision",
        selection: { id: "stinger_swipe" },
        source: {
          kind: "sample",
          sampleRevision: SPECIMEN_SAMPLE_REVISION,
          sandboxInput: { aspect_ratio: "16:9", theme: "candy_arcade" },
        },
      },
    });
    expect(outdatedRes.statusCode).toBe(409);

    // Valid payload -> 202 Queued
    const validRes = await app.inject({
      method: "POST",
      url: "/api/transition-previews",
      payload: {
        clientRequestId: "req-valid-1",
        catalogRevision: computeCatalogRevision(),
        selection: { id: "stinger_swipe", durationSeconds: 0.8 },
        source: {
          kind: "sample",
          sampleRevision: SPECIMEN_SAMPLE_REVISION,
          sandboxInput: { aspect_ratio: "16:9", theme: "candy_arcade" },
        },
      },
    });
    expect(validRes.statusCode).toBe(202);
    const job = JSON.parse(validRes.body);
    expect(job.status).toBe("queued");
    expect(job.jobId).toBeDefined();

    // GET job status
    const statusRes = await app.inject({
      method: "GET",
      url: `/api/transition-previews/jobs/${job.jobId}`,
    });
    expect(statusRes.statusCode).toBe(200);

    // DELETE job (cancellation)
    const cancelRes = await app.inject({
      method: "DELETE",
      url: `/api/transition-previews/jobs/${job.jobId}`,
    });
    expect(cancelRes.statusCode).toBe(200);
    const cancelBody = JSON.parse(cancelRes.body);
    expect(cancelBody.status).toBe("cancelled");
  });

  it("prevents path traversal on job and artifact routes", async () => {
    const { app } = await buildTestServer();

    const traversalJob = await app.inject({
      method: "GET",
      url: "/api/transition-previews/jobs/%2E%2E%2Fetc%2Fpasswd",
    });
    expect(traversalJob.statusCode).toBe(400);

    const traversalManifest = await app.inject({
      method: "GET",
      url: "/api/transition-previews/artifacts/%2E%2E%2Fetc%2Fpasswd/manifest",
    });
    expect(traversalManifest.statusCode).toBe(400);

    const traversalVideo = await app.inject({
      method: "GET",
      url: "/api/transition-previews/artifacts/invalid*id/video",
    });
    expect(traversalVideo.statusCode).toBe(400);
  });

  it("serves published manifest and video bytes with Range support", async () => {
    const { app, store } = await buildTestServer();

    // Create temporary video file
    const tmpDir = path.join(os.tmpdir(), `route-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const videoFile = path.join(tmpDir, "video.mp4");
    await writeFile(videoFile, Buffer.from("0123456789abcdefghijklmnopqrstuvwxyz"));

    const artifactId = "test_artifact_123";
    await store.publishArtifact({
      artifactId,
      videoPath: videoFile,
      manifest: {
        artifactId,
        artifactSha256: "samplehash",
        inputFingerprint: "fingerprint123",
        catalogRevision: computeCatalogRevision(),
        engineSnapshotHash: "enginesnap",
        sourceKind: "sample",
        currentness: "matches-request",
        width: 1920,
        height: 1080,
        fps: { numerator: 30, denominator: 1 },
        frameCount: 30,
        timeBase: { numerator: 1, denominator: 30 },
        frames: [{ index: 0, pts: 0 }],
        reviewWindow: { firstFrame: 0, lastFrameInclusive: 29, boundaryFrame: 15 },
        instances: [],
      },
    });

    // 1. GET manifest
    const manifestRes = await app.inject({
      method: "GET",
      url: `/api/transition-previews/artifacts/${artifactId}/manifest`,
    });
    expect(manifestRes.statusCode).toBe(200);
    expect(manifestRes.headers["etag"]).toBe('"samplehash"');
    expect(manifestRes.headers["cache-control"]).toContain("immutable");

    // ETag 304 for manifest
    const manifestCached = await app.inject({
      method: "GET",
      url: `/api/transition-previews/artifacts/${artifactId}/manifest`,
      headers: { "if-none-match": '"samplehash"' },
    });
    expect(manifestCached.statusCode).toBe(304);

    // 2. GET video (full)
    const videoRes = await app.inject({
      method: "GET",
      url: `/api/transition-previews/artifacts/${artifactId}/video`,
    });
    expect(videoRes.statusCode).toBe(200);
    expect(videoRes.headers["content-type"]).toBe("video/mp4");
    expect(videoRes.headers["accept-ranges"]).toBe("bytes");

    // 3. GET video (range request: bytes=0-9)
    const rangeRes = await app.inject({
      method: "GET",
      url: `/api/transition-previews/artifacts/${artifactId}/video`,
      headers: { range: "bytes=0-9" },
    });
    expect(rangeRes.statusCode).toBe(206);
    expect(rangeRes.headers["content-range"]).toBe("bytes 0-9/36");
    expect(rangeRes.body).toBe("0123456789");
  });
});
