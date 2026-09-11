import { describe, expect, it } from "vitest";
import { computeCatalogRevision, type TransitionPreviewRequest } from "@studio/shared";
import { TransitionPreviewService } from "../src/quiz/transitionPreview/transitionPreviewService.js";
import { SPECIMEN_SAMPLE_REVISION } from "../src/quiz/render/transitions/prepareTransitionSpecimen.js";
import type {
  CallerContext,
  TransitionPreviewLimiterPort,
  TransitionPreviewRepositoryPort,
  TransitionPreviewRunnerInput,
  TransitionPreviewRunnerPort,
  TransitionPreviewStorePort,
} from "../src/quiz/transitionPreview/transitionPreview.types.js";
import type {
  PublishedPreviewArtifact,
  VerifiedPreviewArtifact,
} from "../src/quiz/transitionPreview/transitionPreviewStore.js";

class FakeTransitionPreviewStore implements TransitionPreviewStorePort {
  private readonly artifacts = new Map<string, VerifiedPreviewArtifact>();
  private readonly byFingerprint = new Map<string, VerifiedPreviewArtifact>();

  async getPublishedArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    const found = this.artifacts.get(artifactId);
    if (!found) return null;
    return {
      ...found,
      manifestPath: `/mock/${artifactId}/manifest.json`,
    };
  }

  async findArtifactByFingerprint(fingerprint: string): Promise<PublishedPreviewArtifact | null> {
    const found = this.byFingerprint.get(fingerprint);
    if (!found) return null;
    return {
      ...found,
      manifestPath: `/mock/${found.artifactId}/manifest.json`,
    };
  }

  async publishArtifact(artifact: VerifiedPreviewArtifact): Promise<PublishedPreviewArtifact> {
    this.artifacts.set(artifact.artifactId, artifact);
    this.byFingerprint.set(artifact.manifest.inputFingerprint, artifact);
    return {
      ...artifact,
      manifestPath: `/mock/${artifact.artifactId}/manifest.json`,
    };
  }

  async verifyArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    return this.getPublishedArtifact(artifactId);
  }
}

class FakeTransitionPreviewRunner implements TransitionPreviewRunnerPort {
  invocationCount = 0;
  lastSignal?: AbortSignal;
  delayMs = 10;
  shouldFail = false;
  failureCode?: string;

  async render(input: TransitionPreviewRunnerInput): Promise<VerifiedPreviewArtifact> {
    this.invocationCount++;
    this.lastSignal = input.signal;

    if (input.signal?.aborted) {
      throw new Error("Render aborted");
    }

    if (this.delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), this.delayMs);
        input.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("Render aborted"));
        });
      });
    }

    if (this.shouldFail) {
      const err = new Error("Engine crashed") as Error & { code?: string };
      err.code = this.failureCode || "RENDER_FAILED";
      throw err;
    }

    input.onProgress?.({ phase: "capture", completedFrames: 30, totalFrames: 60 });

    return {
      artifactId: `mock_art_${input.fingerprint.slice(0, 8)}`,
      videoPath: `/mock/${input.fingerprint}/output.mp4`,
      manifest: {
        artifactId: `mock_art_${input.fingerprint.slice(0, 8)}`,
        artifactSha256: "mocksha256",
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

function createSampleRequest(overrides?: Partial<TransitionPreviewRequest>): TransitionPreviewRequest {
  return {
    clientRequestId: "req-1",
    catalogRevision: computeCatalogRevision(),
    selection: { id: "stinger_swipe", durationSeconds: 0.8 },
    source: {
      kind: "sample",
      sampleRevision: SPECIMEN_SAMPLE_REVISION,
      sandboxInput: {
        aspect_ratio: "16:9",
        theme: "candy_arcade",
        palette_id: "lime",
      },
    },
    ...overrides,
  };
}

describe("Task 5: TransitionPreviewService", () => {
  it("orchestrates cache miss, job creation, and completion", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();
    runner.delayMs = 5;

    const service = new TransitionPreviewService({ store, runner });
    const caller: CallerContext = { callerId: "user-1", clientRequestId: "req-1" };

    const request = createSampleRequest();
    const queued = await service.request(request, caller);

    expect(queued.status).toBe("queued");
    expect(queued.jobId).toBeDefined();
    expect(queued.fingerprint).toBeTruthy();
    expect(queued.revision).toBe(1);

    // Wait for fake render to complete
    await new Promise((r) => setTimeout(r, 25));

    const ready = await service.status(queued.jobId, caller);
    expect(ready.status).toBe("ready");
    if (ready.status === "ready") {
      expect(ready.artifactId).toBeTruthy();
      expect(ready.videoUrl).toContain(ready.artifactId);
      expect(ready.manifestUrl).toContain(ready.artifactId);
    }
    expect(runner.invocationCount).toBe(1);
  });

  it("handles fast-path cache hit without invoking runner", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();
    runner.delayMs = 0;

    const service = new TransitionPreviewService({ store, runner });
    const caller: CallerContext = { callerId: "user-1", clientRequestId: "req-1" };

    const request = createSampleRequest();
    // First request renders and publishes
    const first = await service.request(request, caller);
    await new Promise((r) => setTimeout(r, 15));
    expect(runner.invocationCount).toBe(1);

    // Second request with same inputs hits cache immediately
    const caller2: CallerContext = { callerId: "user-2", clientRequestId: "req-2" };
    const second = await service.request({ ...request, clientRequestId: "req-2" }, caller2);

    expect(second.status).toBe("ready");
    expect(second.requestId).toBe("req-2");
    expect(runner.invocationCount).toBe(1); // No second runner invocation!
  });

  it("shares internal work across concurrent leases and isolates cancellation", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();
    runner.delayMs = 50;

    const service = new TransitionPreviewService({ store, runner });
    const callerA: CallerContext = { callerId: "caller-A", clientRequestId: "req-A" };
    const callerB: CallerContext = { callerId: "caller-B", clientRequestId: "req-B" };

    const request = createSampleRequest();

    const first = await service.request(request, callerA);
    const second = await service.request(request, callerB);

    expect(first.jobId).not.toBe(second.jobId);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(runner.invocationCount).toBe(1);

    // Caller A cancels their lease
    const cancelled = await service.cancel(first.jobId, callerA);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.jobId).toBe(first.jobId);

    // Runner must NOT be aborted because Caller B is still waiting!
    expect(runner.invocationCount).toBe(1);
    expect(runner.lastSignal?.aborted).toBe(false);

    // Caller B's job must remain active
    const callerBStatus = await service.status(second.jobId, callerB);
    expect(callerBStatus.status).not.toBe("cancelled");

    // Wait for render to finish
    await new Promise((r) => setTimeout(r, 70));

    const finalB = await service.status(second.jobId, callerB);
    expect(finalB.status).toBe("ready");
  });

  it("aborts internal runner when all consumer leases are cancelled", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();
    runner.delayMs = 100;

    const service = new TransitionPreviewService({ store, runner });
    const callerA: CallerContext = { callerId: "caller-A", clientRequestId: "req-A" };
    const callerB: CallerContext = { callerId: "caller-B", clientRequestId: "req-B" };

    const request = createSampleRequest();

    const first = await service.request(request, callerA);
    const second = await service.request(request, callerB);

    await service.cancel(first.jobId, callerA);
    expect(runner.lastSignal?.aborted).toBe(false);

    // Now Caller B also cancels
    await service.cancel(second.jobId, callerB);
    expect(runner.lastSignal?.aborted).toBe(true);
  });

  it("fails explicitly when catalog revision changes", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();

    const service = new TransitionPreviewService({ store, runner });
    const caller: CallerContext = { callerId: "user-1", clientRequestId: "req-1" };

    const request = createSampleRequest({ catalogRevision: "outdated-revision-999" });
    const res = await service.request(request, caller);

    expect(res.status).toBe("failed");
    if (res.status === "failed") {
      expect(res.error.code).toBe("CATALOG_CHANGED");
      expect(res.error.retryable).toBe(true);
    }
    expect(runner.invocationCount).toBe(0);
  });

  it("fails explicitly for unknown transition ID", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();

    const service = new TransitionPreviewService({ store, runner });
    const caller: CallerContext = { callerId: "user-1", clientRequestId: "req-1" };

    const request = createSampleRequest({ selection: { id: "non_existent_effect" } });
    const res = await service.request(request, caller);

    expect(res.status).toBe("failed");
    if (res.status === "failed") {
      expect(res.error.code).toBe("UNKNOWN_TRANSITION");
      expect(res.error.retryable).toBe(false);
    }
    expect(runner.invocationCount).toBe(0);
  });

  it("handles episode sources with RENDER_REQUIRED when output is missing or draft differs", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();

    const repository: TransitionPreviewRepositoryPort = {
      getEpisodeRenderOutput: async (channelId, episodeId) => {
        if (episodeId === "unrendered-ep") return null;
        if (episodeId === "different-draft-ep") {
          return {
            videoPath: "/episodes/output.mp4",
            transitionSettings: { scene: { id: "cut" } }, // rendered with cut
          };
        }
        return {
          videoPath: "/episodes/output.mp4",
          transitionSettings: { scene: { id: "stinger_swipe" } }, // matches request
        };
      },
    };

    const service = new TransitionPreviewService({ store, runner, repository });
    const caller: CallerContext = { callerId: "user-1", clientRequestId: "req-1" };

    // Case 1: unrendered episode
    const unrenderedReq = createSampleRequest({
      source: { kind: "episode", channelId: "ch-1", episodeId: "unrendered-ep", boundaryId: "q1" },
    });
    const unrenderedRes = await service.request(unrenderedReq, caller);
    expect(unrenderedRes.status).toBe("failed");
    if (unrenderedRes.status === "failed") {
      expect(unrenderedRes.error.code).toBe("RENDER_REQUIRED");
    }

    // Case 2: draft differs from render
    const diffDraftReq = createSampleRequest({
      selection: { id: "brush_wave" },
      source: { kind: "episode", channelId: "ch-1", episodeId: "different-draft-ep", boundaryId: "q1" },
    });
    const diffDraftRes = await service.request(diffDraftReq, caller);
    expect(diffDraftRes.status).toBe("failed");
    if (diffDraftRes.status === "failed") {
      expect(diffDraftRes.error.code).toBe("RENDER_REQUIRED");
    }

    // Case 3: matches render output -> reuse actual output
    const matchReq = createSampleRequest({
      selection: { id: "stinger_swipe" },
      source: { kind: "episode", channelId: "ch-1", episodeId: "matched-ep", boundaryId: "q1" },
    });
    const matchRes = await service.request(matchReq, caller);
    expect(matchRes.status).toBe("ready");
    if (matchRes.status === "ready") {
      expect(matchRes.artifactId).toBe("ep_matched-ep");
    }
  });

  it("handles render timeout and marks job failed with RENDER_TIMEOUT", async () => {
    const store = new FakeTransitionPreviewStore();
    const runner = new FakeTransitionPreviewRunner();
    runner.delayMs = 200; // Will exceed timeout

    const service = new TransitionPreviewService({
      store,
      runner,
      renderTimeoutMs: 30, // 30ms timeout
    });
    const caller: CallerContext = { callerId: "user-1", clientRequestId: "req-1" };

    const request = createSampleRequest();
    const queued = await service.request(request, caller);

    // Wait for timeout to fire
    await new Promise((r) => setTimeout(r, 60));

    const finalStatus = await service.status(queued.jobId, caller);
    expect(finalStatus.status).toBe("failed");
    if (finalStatus.status === "failed") {
      expect(finalStatus.error.code).toBe("RENDER_TIMEOUT");
      expect(finalStatus.error.retryable).toBe(true);
    }
  });
});
