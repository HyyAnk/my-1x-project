import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import {
  registerTransition,
  resetTransitionRegistry,
  isValidTransition,
  type TransitionDefinition,
} from "@studio/shared";
import { registerTransitionPreviewsRoutes } from "../src/routes/transitionPreviews.js";
import { TransitionPreviewService } from "../src/quiz/transitionPreview/transitionPreviewService.js";
import {
  prepareTransitionSpecimen,
  SPECIMEN_SAMPLE_REVISION,
} from "../src/quiz/render/transitions/prepareTransitionSpecimen.js";
import type {
  TransitionPreviewRunnerInput,
  TransitionPreviewRunnerPort,
  TransitionPreviewStorePort,
} from "../src/quiz/transitionPreview/transitionPreview.types.js";
import type {
  PublishedPreviewArtifact,
  VerifiedPreviewArtifact,
} from "../src/quiz/transitionPreview/transitionPreviewStore.js";

class ExtensibilityTestStore implements TransitionPreviewStorePort {
  private artifacts = new Map<string, VerifiedPreviewArtifact>();

  async findArtifactByFingerprint(fingerprint: string): Promise<VerifiedPreviewArtifact | null> {
    for (const artifact of this.artifacts.values()) {
      if (artifact.artifactId.includes(fingerprint.slice(0, 8))) {
        return artifact;
      }
    }
    return null;
  }

  async getPublishedArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    const found = this.artifacts.get(artifactId);
    if (!found) return null;
    return {
      artifactId: found.artifactId,
      manifestPath: `/mock/${found.artifactId}/manifest.json`,
      videoPath: found.videoPath,
      manifest: found.manifest,
      verification: {
        verifiedAt: new Date().toISOString(),
        videoSizeBytes: 1024,
        videoSha256: "test_sha",
        playable: true,
      },
    };
  }

  async publishArtifact(artifact: VerifiedPreviewArtifact): Promise<PublishedPreviewArtifact> {
    this.artifacts.set(artifact.artifactId, artifact);
    return {
      ...artifact,
      manifestPath: `/mock/${artifact.artifactId}/manifest.json`,
      verification: {
        verifiedAt: new Date().toISOString(),
        videoSizeBytes: 1024,
        videoSha256: "test_sha",
        playable: true,
      },
    };
  }

  async verifyArtifact(artifactId: string): Promise<PublishedPreviewArtifact | null> {
    return this.getPublishedArtifact(artifactId);
  }
}

class ExtensibilityTestRunner implements TransitionPreviewRunnerPort {
  async render(input: TransitionPreviewRunnerInput): Promise<VerifiedPreviewArtifact> {
    return {
      artifactId: `art_${input.fingerprint.slice(0, 8)}`,
      videoPath: `/mock/${input.fingerprint}/output.mp4`,
      manifest: {
        artifactId: `art_${input.fingerprint.slice(0, 8)}`,
        frameCount: input.specimen.totalDurationFrames,
        timeBase: { numerator: 1, denominator: 30 },
        frames: [{ index: 0, pts: 0 }],
        reviewWindow: input.specimen.reviewWindow,
        instances: [input.specimen.resolvedInstance],
      },
    };
  }
}

describe("Task 9: Dynamic Transition Registration & Extensibility End-to-End", () => {
  let app: ReturnType<typeof Fastify>;
  let store: ExtensibilityTestStore;
  let runner: ExtensibilityTestRunner;
  let service: TransitionPreviewService;

  beforeEach(async () => {
    resetTransitionRegistry();
    store = new ExtensibilityTestStore();
    runner = new ExtensibilityTestRunner();
    service = new TransitionPreviewService({ store, runner });

    app = Fastify({ logger: false });
    await app.register(registerTransitionPreviewsRoutes({ service, store }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    resetTransitionRegistry();
  });

  const testDynamicEffect: TransitionDefinition = {
    id: "test_laser_slice",
    name: "Laser Slice",
    description: "Futuristic laser slice transition with neon edge glow.",
    category: "scene",
    defaultDuration: 0.6,
    minDuration: 0.1,
    maxDuration: 2.0,
    cssClass: "transition-laser-slice",
    tag: "Sci-Fi",
    iconName: "Zap",
  };

  it("proves a brand new effect is registered dynamically and discovered by the API", async () => {
    // 1. Initially unregistered
    expect(isValidTransition("test_laser_slice")).toBe(false);

    const initialRes = await app.inject({
      method: "GET",
      url: "/api/transition-previews/catalog",
    });
    expect(initialRes.statusCode).toBe(200);
    const initialBody = JSON.parse(initialRes.body);
    expect(initialBody.entries.some((t: { id: string }) => t.id === "test_laser_slice")).toBe(false);
    const initialRevision = initialBody.revision;

    // 2. Dynamically register new effect in canonical registry
    registerTransition(testDynamicEffect);
    expect(isValidTransition("test_laser_slice")).toBe(true);

    // 3. Discovered by API without any route or server code changes
    const updatedRes = await app.inject({
      method: "GET",
      url: "/api/transition-previews/catalog",
    });
    expect(updatedRes.statusCode).toBe(200);
    const updatedBody = JSON.parse(updatedRes.body);

    const found = updatedBody.entries.find((t: { id: string }) => t.id === "test_laser_slice");
    expect(found).toBeDefined();
    expect(found.name).toBe("Laser Slice");
    expect(found.defaultDurationSeconds).toBe(0.6);
    expect(found.cssClass).toBe("transition-laser-slice");

    // Catalog revision must change reflecting the new registration
    expect(updatedBody.revision).not.toBe(initialRevision);
  });

  it("proves production/specimen rendering pipeline prepares and resolves new effect dynamically", () => {
    registerTransition(testDynamicEffect);

    const specimen = prepareTransitionSpecimen({
      selection: {
        id: "test_laser_slice",
        durationSeconds: 0.6,
      },
      source: {
        kind: "sample",
        sampleRevision: SPECIMEN_SAMPLE_REVISION,
        sandboxInput: { aspect_ratio: "16:9", theme: "candy_arcade" },
      },
      compactTiming: true,
    });

    expect(specimen.resolvedInstance.id).toBe("test_laser_slice");
    expect(specimen.resolvedInstance.durationFrames).toBe(18); // 0.6s * 30fps
    expect(specimen.compositionInput.transitionInstances[specimen.boundaryId]?.id).toBe("test_laser_slice");
  });

  it("proves transition preview service creates and executes job for dynamically registered effect", async () => {
    registerTransition(testDynamicEffect);

    const catalogRes = await app.inject({
      method: "GET",
      url: "/api/transition-previews/catalog",
    });
    const catalog = JSON.parse(catalogRes.body);

    const jobRes = await app.inject({
      method: "POST",
      url: "/api/transition-previews",
      payload: {
        clientRequestId: "req-test-dynamic-1",
        catalogRevision: catalog.revision,
        selection: {
          id: "test_laser_slice",
          durationSeconds: 0.6,
        },
        source: {
          kind: "sample",
          sampleRevision: SPECIMEN_SAMPLE_REVISION,
          sandboxInput: { aspect_ratio: "16:9", theme: "candy_arcade" },
        },
      },
    });

    expect(jobRes.statusCode).toBe(202);
    const job = JSON.parse(jobRes.body);
    expect(job.status).toBe("queued");
    expect(job.jobId).toBeDefined();
  });
});
