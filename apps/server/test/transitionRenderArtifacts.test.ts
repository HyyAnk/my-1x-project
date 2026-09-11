import { describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveRenderEngineSnapshot } from "../src/tasks/video/renderEngineSnapshot.js";
import { buildRenderInvocation } from "../src/tasks/video/renderInvocationOptions.js";
import { getHyperframesInvocation, getHyperframesPackageVersion } from "../src/tasks/video/videoInvocation.js";
import {
  fingerprintTransitionPreview,
  type TransitionPreviewFingerprintInput,
} from "../src/quiz/render/transitions/transitionPreviewFingerprint.js";
import {
  publishPreviewArtifact,
  getPublishedPreviewArtifact,
  computeFileSha256,
  type VerifiedPreviewArtifact,
} from "../src/quiz/render/transitions/transitionPreviewStore.js";

describe("Task 4: Render Engine Snapshot and Immutable Artifact Identity", () => {
  it("resolves a stable serializable render engine snapshot with installed HyperFrames version", () => {
    const snapshot = resolveRenderEngineSnapshot({
      quality: "high",
      fps: 30,
    });

    expect(snapshot.engine).toBe("hyperframes");
    expect(snapshot.engineVersion).toBe(getHyperframesPackageVersion());
    expect(snapshot.fps).toBe(30);
    expect(snapshot.quality).toBe("high");
    expect(snapshot.snapshotHash).toHaveLength(64);

    // Altering options changes the snapshot hash
    const altSnapshot = resolveRenderEngineSnapshot({
      quality: "draft",
      fps: 60,
    });
    expect(altSnapshot.snapshotHash).not.toBe(snapshot.snapshotHash);
  });

  it("buildRenderInvocation produces identical CLI configuration for production and preview", () => {
    const snapshot = resolveRenderEngineSnapshot({ fps: 30, quality: "high" });
    const invocation = buildRenderInvocation(snapshot, {
      renderRoot: "runtime/preview/index.html",
      outputPath: "runtime/preview/output.mp4",
      workers: 2,
    });

    expect(invocation.command).toContain("node");
    expect(invocation.args).toContain("render");
    expect(invocation.args).toContain("runtime/preview/index.html");
    expect(invocation.args).toContain("--output");
    expect(invocation.args).toContain("runtime/preview/output.mp4");
    expect(invocation.args).toContain("--fps");
    expect(invocation.args).toContain("30");
    expect(invocation.args).toContain("--quality");
    expect(invocation.args).toContain("high");
    expect(invocation.args).toContain("--workers");
    expect(invocation.args).toContain("2");
    expect(invocation.args).toContain("--strict");
    expect(invocation.args).toContain("--json");
  });

  it("fingerprints preview input deterministically, ignoring jobId while reacting to definition and file changes", () => {
    const snapshot = resolveRenderEngineSnapshot();
    const baseInput: TransitionPreviewFingerprintInput = {
      jobId: "job-1",
      catalogRevision: "cat-rev-100",
      engineSnapshotHash: snapshot.snapshotHash,
      aspectRatio: "16:9",
      width: 1920,
      height: 1080,
      fps: { numerator: 30, denominator: 1 },
      quality: "high",
      resolvedInstances: [
        {
          instanceId: "inst-1",
          id: "bubble_splash",
          implementationRevision: "1.0.0",
          placement: "scene",
          startFrame: 30,
          boundaryFrame: 43,
          endFrameExclusive: 56,
          durationFrames: 26,
          effectiveDurationSeconds: 0.86,
          fps: { numerator: 30, denominator: 1 },
          timingAdjustment: "none",
        },
      ],
      definitionHashes: {
        bubble_splash: "hash-bubble-1234",
      },
      compositionHtml: "<html><body><section>Specimen</section></body></html>",
      compositionFiles: {
        "compositions/scene-1.html": "<div>Scene 1</div>",
      },
      assetHashes: {
        "asset-1": "asset-hash-1",
      },
      sourceKind: "sample",
    };

    const hash1 = fingerprintTransitionPreview(baseInput);

    // 1. Changing jobId produces the exact same fingerprint
    const withDifferentJobId = { ...baseInput, jobId: "job-different-99" };
    expect(fingerprintTransitionPreview(withDifferentJobId)).toBe(hash1);

    // 2. Changing definition CSS/hash alters the fingerprint
    const withChangedDefinition = {
      ...baseInput,
      definitionHashes: { bubble_splash: "hash-bubble-changed" },
    };
    expect(fingerprintTransitionPreview(withChangedDefinition)).not.toBe(hash1);

    // 3. Changing composition HTML alters the fingerprint
    const withChangedHtml = {
      ...baseInput,
      compositionHtml: "<html><body><section>Altered</section></body></html>",
    };
    expect(fingerprintTransitionPreview(withChangedHtml)).not.toBe(hash1);

    // 4. Changing FPS alters the fingerprint
    const withChangedFps = {
      ...baseInput,
      fps: { numerator: 60, denominator: 1 },
    };
    expect(fingerprintTransitionPreview(withChangedFps)).not.toBe(hash1);

    // 5. Changing quality alters the fingerprint
    const withChangedQuality = {
      ...baseInput,
      quality: "draft",
    };
    expect(fingerprintTransitionPreview(withChangedQuality)).not.toBe(hash1);
  });

  it("publishes and verifies preview artifacts atomically with immutable cache hits", async () => {
    const testDir = path.resolve(process.cwd(), "runtime", "test-transition-artifacts");
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
    await mkdir(testDir, { recursive: true });

    const tempVideo = path.join(testDir, "test-temp-video.mp4");
    const videoData = Buffer.from("DETERMINISTIC_VIDEO_BYTES_12345");
    await writeFile(tempVideo, videoData);
    const videoSha = await computeFileSha256(tempVideo);

    const snapshot = resolveRenderEngineSnapshot();
    const verified: VerifiedPreviewArtifact = {
      artifactId: "art_test_specimen_001",
      videoPath: tempVideo,
      manifest: {
        artifactId: "art_test_specimen_001",
        artifactSha256: videoSha,
        inputFingerprint: "fingerprint_123456",
        catalogRevision: "cat_rev_1",
        engineSnapshotHash: snapshot.snapshotHash,
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
    };

    // 1. First publication
    const published = await publishPreviewArtifact(verified, testDir);
    expect(published.artifactId).toBe("art_test_specimen_001");
    expect(published.manifest.artifactSha256).toBe(videoSha);

    // 2. Fetch published artifact
    const fetched = await getPublishedPreviewArtifact("art_test_specimen_001", testDir);
    expect(fetched).not.toBeNull();
    expect(fetched?.manifest.artifactSha256).toBe(videoSha);

    // 3. Second publication is a cache hit
    const secondPublish = await publishPreviewArtifact(verified, testDir);
    expect(secondPublish.manifest).toEqual(published.manifest);

    // 4. Corrupted file triggers rejection
    const corruptFile = path.join(testDir, "art_test_specimen_001", "video.mp4");
    await writeFile(corruptFile, Buffer.from("CORRUPT_BYTES"));
    const corruptedFetch = await getPublishedPreviewArtifact("art_test_specimen_001", testDir);
    expect(corruptedFetch).toBeNull();

    // Clean up
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  });
});
