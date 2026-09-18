import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Channel, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../src/repository/service.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { findSnapshotEntry } from "../src/quiz/render/productionMascotRenderer.js";
import {
  compileTestTimeline,
  createMultiQuestionQuiz,
  createVideoAnimationAsset,
  extractVideoTagAttributes,
  findQuestionComposition,
  parityChannelConfig,
  setupParityMascotWorkspace,
} from "./mascotVideoParityHelpers.js";

describe("Mascot Video HyperFrames Parity (Phase 4)", () => {
  let tempDir: string;
  let renderRoot: string;
  let repository: RepositoryService;
  let channel: Channel;
  let mascot: MascotProfile;
  let mockWebmThinking: Buffer;
  let mockWebmCelebrate: Buffer;
  let mockAtlas: Buffer;
  let mockManifest: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "mascot-parity-test-"));
    renderRoot = path.join(tempDir, "render_output");
    const setup = await setupParityMascotWorkspace(tempDir);
    repository = setup.repository;
    channel = setup.channel;
    mascot = setup.mascot;
    mockWebmThinking = setup.mockWebmThinking;
    mockWebmCelebrate = setup.mockWebmCelebrate;
    mockAtlas = setup.mockAtlas;
    mockManifest = setup.mockManifest;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  describe("Suite 1: Asset Localization & Storage Pipeline", () => {
    it("copies WebM videos, atlases, and manifests to renderRoot and rewrites URLs", async () => {
      const localized = await prepareLocalizedMascot(channel, repository, renderRoot);
      expect(localized).not.toBeNull();

      const thinkAnim = localized?.styles?.[0]?.states.thinking[1]?.animation;
      expect(thinkAnim).toBeDefined();
      expect(thinkAnim?.transparent_video_url).toBe(`./mascot-assets/${mascot.id}_core_thinking_s2_video_transparent.webm`);
      expect(thinkAnim?.atlas_url).toBe(`./mascot-assets/${mascot.id}_core_thinking_s2_atlas.png`);
      expect(thinkAnim?.manifest_url).toBe(`./mascot-assets/${mascot.id}_core_thinking_s2_manifest.json`);

      const celebAnim = localized?.styles?.[0]?.states.celebrate[0]?.animation;
      expect(celebAnim).toBeDefined();
      expect(celebAnim?.transparent_video_url).toBe(`./mascot-assets/${mascot.id}_core_celebrate_s1_video_transparent.webm`);

      const thinkWebmOnDisk = await readFile(
        path.join(renderRoot, "mascot-assets", `${mascot.id}_core_thinking_s2_video_transparent.webm`),
      );
      expect(thinkWebmOnDisk).toEqual(mockWebmThinking);

      const celebWebmOnDisk = await readFile(
        path.join(renderRoot, "mascot-assets", `${mascot.id}_core_celebrate_s1_video_transparent.webm`),
      );
      expect(celebWebmOnDisk).toEqual(mockWebmCelebrate);

      const atlasOnDisk = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_core_thinking_s2_atlas.png`));
      expect(atlasOnDisk).toEqual(mockAtlas);

      const manifestOnDisk = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_core_thinking_s2_manifest.json`), "utf-8");
      expect(manifestOnDisk).toBe(mockManifest);
    });

    it("verifies localized profile never exposes raw /api/mascots/ or file:/// URLs", async () => {
      const localized = await prepareLocalizedMascot(channel, repository, renderRoot);
      const serialized = JSON.stringify(localized);

      expect(serialized).not.toMatch(/file:\/\/\/[A-Za-z]:/);
      expect(serialized).not.toContain("/api/mascots/");
      expect(serialized).toContain("./mascot-assets/");
    });
  });

  describe("Suite 2: HyperFrames Video Element Attributes & Scene Timing", () => {
    it("renders valid <video> elements with correct timing and local src in subcompositions", async () => {
      const localizedMascot = (await prepareLocalizedMascot(channel, repository, renderRoot))!;
      const quiz = createMultiQuestionQuiz(4);
      const { director, timeline } = compileTestTimeline(quiz);

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: parityChannelConfig,
      });

      expect(bundle.files).toBeDefined();
      const snapshot = bundle.mascotAnimationSnapshot;
      expect(snapshot).toBeDefined();

      for (let i = 1; i <= quiz.questions.length; i++) {
        const qHtml = findQuestionComposition(bundle.files, i);
        expect(qHtml).toBeDefined();

        const thinkingEntry = findSnapshotEntry(snapshot, {
          videoId: quiz.episode_id,
          questionId: `q-parity-0${i}`,
          state: "thinking",
          styleId: "core",
        });
        expect(thinkingEntry).toBeDefined();

        if (thinkingEntry!.slot_index === 2) {
          const videoMatch = qHtml!.match(/<video\b[^>]*>/);
          expect(videoMatch).not.toBeNull();
          const attrs = extractVideoTagAttributes(videoMatch![0]);

          expect(attrs.id).toMatch(/^mascot-video-thinking-2-\d+$/);
          expect(attrs.src).toMatch(/^(?:\.\/)?mascot-assets\/.*video_transparent\.webm$/);
          expect(attrs.src).not.toContain("/api/mascots/");
          expect(attrs.src).not.toContain("file:///");

          expect(attrs.dataStart).not.toBeNull();
          const localStart = parseFloat(attrs.dataStart!);
          expect(localStart).toBeGreaterThanOrEqual(0);
          expect(attrs.dataDuration).not.toBeNull();
          const duration = parseFloat(attrs.dataDuration!);
          expect(duration).toBeGreaterThan(0);
          // Verify dataStart is subcomposition-relative rather than master-timeline absolute
          expect(localStart).toBeLessThan(duration + 5);

          expect(attrs.dataVideoCycle).toBe("4");
          expect(attrs.dataVideoTime).not.toBeNull();
          expect(attrs.isLoop).toBe(true);
          expect(attrs.isAutoplay).toBe(true);
          expect(attrs.isMuted).toBe(true);
          expect(attrs.isPlaysinline).toBe(true);
        }
      }
    });
  });

  describe("Suite 3: Multi-Question Variant Rotation & Deterministic Replay", () => {
    it("alternates between video and static slots while avoiding adjacent repetition", async () => {
      const localizedMascot = (await prepareLocalizedMascot(channel, repository, renderRoot))!;
      const quiz = createMultiQuestionQuiz(5);
      const { director, timeline } = compileTestTimeline(quiz);

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: parityChannelConfig,
      });

      const snapshot = bundle.mascotAnimationSnapshot!;
      const thinkingSlots: number[] = [];

      for (let i = 1; i <= 5; i++) {
        const qHtml = findQuestionComposition(bundle.files, i)!;
        const entry = findSnapshotEntry(snapshot, {
          videoId: quiz.episode_id,
          questionId: `q-parity-0${i}`,
          state: "thinking",
          styleId: "core",
        });
        expect(entry).toBeDefined();
        thinkingSlots.push(entry!.slot_index);

        if (entry!.slot_index === 2) {
          expect(qHtml).toContain("<video");
          expect(qHtml).toContain("mascot-v2-animation-video");
        } else {
          expect(qHtml).toContain("<img");
          expect(qHtml).toContain("mascot-v2-image");
          expect(qHtml).toContain('data-mascot-motion-preset="sway"');
        }
      }

      for (let i = 0; i < thinkingSlots.length - 1; i++) {
        expect(thinkingSlots[i]).not.toBe(thinkingSlots[i + 1]);
      }

      const reRenderBundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: parityChannelConfig,
        mascotAnimationSnapshot: snapshot,
      });

      expect(reRenderBundle.html).toBe(bundle.html);
      for (const [filePath, content] of Object.entries(bundle.files)) {
        expect(reRenderBundle.files[filePath]).toBe(content);
      }
    });
  });

  describe("Suite 4: Graceful Storage & Asset Fallback", () => {
    it("handles missing video storage file gracefully during localization and render", async () => {
      const corruptMascot: Partial<MascotProfile> & { name: string } = {
        ...mascot,
        styles: [
          {
            id: "core",
            name: "Core Style",
            keyword: "core",
            anchor_image_url: null,
            is_default: true,
            states: {
              thinking: [
                {
                  id: "missing_video_slot",
                  slot_index: 5,
                  image_url: `/api/mascots/${mascot.id}/assets/think_slot1.png`,
                  status: "ready",
                  animation: createVideoAnimationAsset(mascot.id, "thinking", 5, true, 4000, 24),
                },
              ],
              celebrate: [],
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await repository.saveMascot(corruptMascot);

      const localized = await prepareLocalizedMascot(channel, repository, renderRoot);
      expect(localized).not.toBeNull();

      const missingWebmPath = path.join(renderRoot, "mascot-assets", `${mascot.id}_core_thinking_s5_video_transparent.webm`);
      const exists = await readFile(missingWebmPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);

      const quiz = createMultiQuestionQuiz(3);
      const { director, timeline } = compileTestTimeline(quiz);

      expect(() =>
        buildCandyArcadeCompositionBundle({
          quiz,
          director,
          timeline,
          styleContext: { theme: "candy_arcade" },
          audioPath: "./narration.wav",
          narrationDurationSeconds: timeline.duration_seconds,
          mascot: localized,
          mascotConfig: parityChannelConfig,
        }),
      ).not.toThrow();

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localized,
        mascotConfig: parityChannelConfig,
      });

      for (let i = 1; i <= 3; i++) {
        const qHtml = findQuestionComposition(bundle.files, i)!;
        expect(qHtml).toBeDefined();
        expect(qHtml).not.toContain("state-celebrate");
      }
    });
  });
});
