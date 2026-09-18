import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Channel, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../src/repository/service.js";
import { RepositoryError } from "../src/repository.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import { buildCandyArcadeCompositionBundle, type CandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { hasHyperframesBlockingIssues, isBlockingFinding } from "../src/quiz/qa/hyperframesQuality.js";
import { verifyAndCheckLayout } from "../src/tasks/video/videoLayoutChecker.js";
import { readRenderCheckpoint } from "../src/tasks/checkpoints.js";
import {
  compileTestTimeline,
  createMultiQuestionQuiz,
  extractVideoTagAttributes,
  parityChannelConfig,
  setupParityMascotWorkspace,
} from "./mascotVideoParityHelpers.js";
import { findFindingsByCode, runHyperframesCheckCli, writeCompositionBundle } from "./mascotVideoCheckHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRootDir = path.resolve(__dirname, "..");

describe("Mascot Video HyperFrames End-to-End Composition Validation (Phase 5)", () => {
  let tempDir: string;
  let renderRoot: string;
  let repository: RepositoryService;
  let channel: Channel;
  let localizedMascot: MascotProfile;
  let bundle: CandyArcadeCompositionBundle;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "mascot-e2e-check-"));
    renderRoot = path.join(tempDir, "render_output");
    const setup = await setupParityMascotWorkspace(tempDir);
    repository = setup.repository;
    channel = setup.channel;

    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);
    expect(localized).not.toBeNull();
    localizedMascot = localized!;

    const quiz = createMultiQuestionQuiz(2);
    const { director, timeline } = compileTestTimeline(quiz);
    bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: localizedMascot,
      mascotConfig: parityChannelConfig,
    });

    await writeCompositionBundle(renderRoot, bundle, serverRootDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it("passes real HyperFrames check with ZERO media and asset errors", async () => {
    const checkResult = await runHyperframesCheckCli(renderRoot, { samples: 1, timeoutMs: 90000 });
    const { report } = checkResult;

    expect(report).not.toBeNull();
    expect(hasHyperframesBlockingIssues(report)).toBe(false);

    const missingAssets = findFindingsByCode(report, "missing_local_asset");
    const webmMissing = missingAssets.filter((f) => f.message?.includes("video_transparent.webm"));
    expect(webmMissing).toHaveLength(0);

    const missingDataStart = findFindingsByCode(report, "media_missing_data_start");
    expect(missingDataStart).toHaveLength(0);

    const missingId = findFindingsByCode(report, "media_missing_id");
    expect(missingId).toHaveLength(0);

    const missingMuted = findFindingsByCode(report, "video_missing_muted");
    expect(missingMuted).toHaveLength(0);

    const blockingLint = (report?.lint?.findings ?? []).filter(isBlockingFinding);
    expect(blockingLint).toHaveLength(0);

    const blockingRuntime = (report?.runtime?.findings ?? []).filter(isBlockingFinding);
    expect(blockingRuntime).toHaveLength(0);
  }, 120000);

  it("successfully validates layout and caches checkpoint via verifyAndCheckLayout", async () => {
    const sourceFingerprint = "e2e_fingerprint_mascot_01";
    const checkpointPath = path.join(renderRoot, "render-checkpoint.json");

    const result = await verifyAndCheckLayout({
      renderRoot,
      rootDir: serverRootDir,
      sourceFingerprint,
      renderQuality: "draft",
    });

    expect(result.status).toBe("passed");
    expect(result.reused).toBe(false);
    expect(result.bypassed).toBe(false);

    const checkpoint = await readRenderCheckpoint(checkpointPath);
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.source_fingerprint).toBe(sourceFingerprint);
    expect(checkpoint?.check.status).toBe("passed");

    const cachedResult = await verifyAndCheckLayout({
      renderRoot,
      rootDir: serverRootDir,
      sourceFingerprint,
      renderQuality: "draft",
    });

    expect(cachedResult.status).toBe("passed");
    expect(cachedResult.reused).toBe(true);
    expect(cachedResult.samplesCount).toBe(0);
  }, 60000);

  it("detects missing video assets as blocking errors during pre-render checks", async () => {
    const compFiles = Object.keys(bundle.files).filter((f) => f.startsWith("compositions/"));
    expect(compFiles.length).toBeGreaterThan(0);

    const targetSubCompPath = path.join(renderRoot, compFiles[0]);
    const originalContent = await readFile(targetSubCompPath, "utf8");
    const corruptedContent = originalContent.replace(/src="(?:mascot-assets\/[^"]+)"/, 'src="mascot-assets/nonexistent_ghost_asset.webm"');
    await writeFile(targetSubCompPath, corruptedContent, "utf8");

    const checkResult = await runHyperframesCheckCli(renderRoot, { samples: 1 });
    expect(hasHyperframesBlockingIssues(checkResult.report)).toBe(true);

    const missingAssets = findFindingsByCode(checkResult.report, "missing_local_asset");
    const ghostAssetReported = missingAssets.some((f) => f.message?.includes("nonexistent_ghost_asset.webm"));
    expect(ghostAssetReported).toBe(true);

    await expect(
      verifyAndCheckLayout({
        renderRoot,
        rootDir: serverRootDir,
        sourceFingerprint: "corrupted_asset_fingerprint",
        renderQuality: "draft",
      }),
    ).rejects.toThrowError(RepositoryError);
  }, 60000);

  it("preserves required video attributes and local disk paths across multi-question rotation", async () => {
    for (const [relPath] of Object.entries(bundle.files)) {
      if (!relPath.startsWith("compositions/quiz-q")) continue;
      const html = await readFile(path.join(renderRoot, relPath), "utf8");
      const videoMatches = html.match(/<video\b[^>]*>/g);
      if (!videoMatches) continue;

      for (const videoTag of videoMatches) {
        const attrs = extractVideoTagAttributes(videoTag);
        expect(attrs.id).toMatch(/^mascot-video-/);
        expect(attrs.src).toMatch(/^(?:\.\/)?mascot-assets\/.*video_transparent\.webm$/);
        expect(attrs.dataStart).not.toBeNull();
        expect(parseFloat(attrs.dataStart!)).toBeGreaterThanOrEqual(0);
        expect(attrs.dataDuration).not.toBeNull();
        expect(parseFloat(attrs.dataDuration!)).toBeGreaterThan(0);
        expect(attrs.isMuted).toBe(true);
        expect(attrs.isAutoplay).toBe(true);
        const expectedLoop = Boolean(attrs.id?.includes("thinking"));
        expect(attrs.isLoop).toBe(expectedLoop);
        expect(attrs.isPlaysinline).toBe(true);

        const assetPathOnDisk = path.join(renderRoot, attrs.src!.replace(/^\.\//, ""));
        const fileExists = await readFile(assetPathOnDisk)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      }
    }
  }, 30000);
});
