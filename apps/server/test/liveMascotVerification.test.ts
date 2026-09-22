import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  filterAvailableVariants,
  MascotProfileSchema,
  selectQuestionMascotVariant,
  selectQuestionMascotVariantResult,
  type ChannelMascotConfig,
  type MascotProfile,
} from "@studio/shared";
import { adaptMascotForQuestion, renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";
import { resolveProductionMascotTimelineAtTime } from "../src/quiz/render/productionMascotTimeline.js";
import { createVideoAnimationAsset } from "./mascotVideoParityHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IN_TREE_MASCOT_PATH = path.resolve(__dirname, "fixtures/liveMascotVerificationFixture.json");
function resolveExternalLiveMascotPath(): string | null {
  if (process.env.LIVE_MASCOT_PATH && fs.existsSync(process.env.LIVE_MASCOT_PATH)) {
    return process.env.LIVE_MASCOT_PATH;
  }
  if (process.env.STUDIO_STORAGE_PATH) {
    const candidate = path.join(
      process.env.STUDIO_STORAGE_PATH,
      ".quiz-studio",
      "mascots",
      "mascot_22cb190ece7b4475",
      "mascot.json"
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  const projectRoot = path.resolve(__dirname, "../../..");
  const storageConfig = path.join(projectRoot, ".quiz-studio", "storage.local.json");
  if (fs.existsSync(storageConfig)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(storageConfig, "utf8")) as { storage_path?: string };
      if (parsed.storage_path) {
        const candidate = path.join(
          parsed.storage_path,
          ".quiz-studio",
          "mascots",
          "mascot_22cb190ece7b4475",
          "mascot.json"
        );
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch { }
  }
  return null;
}

const EXTERNAL_LIVE_MASCOT_PATH = resolveExternalLiveMascotPath();

// Decoupled resolution: use external live mascot path if present, otherwise fall back to in-tree fixture
const hasExternalLiveMascot = Boolean(EXTERNAL_LIVE_MASCOT_PATH && fs.existsSync(EXTERNAL_LIVE_MASCOT_PATH));
const LIVE_MASCOT_PATH = hasExternalLiveMascot && EXTERNAL_LIVE_MASCOT_PATH ? EXTERNAL_LIVE_MASCOT_PATH : IN_TREE_MASCOT_PATH;

const testMascotConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_left",
  scale: 1.5,
  offset_x: 0,
  offset_y: 0,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

describe("Phase 6 — Regression & Verification: Live Mascot Data & Edge Cases", () => {
  const inTreeMascotFixture: MascotProfile = MascotProfileSchema.parse(JSON.parse(fs.readFileSync(IN_TREE_MASCOT_PATH, "utf8")));
  const fileExists = fs.existsSync(LIVE_MASCOT_PATH);
  const liveMascot: MascotProfile = fileExists
    ? MascotProfileSchema.parse(JSON.parse(fs.readFileSync(LIVE_MASCOT_PATH, "utf8")))
    : inTreeMascotFixture;

  describe("Live Mascot File Integrity", () => {
    it("verifies live mascot file exists and passes MascotProfileSchema validation", () => {
      expect(fileExists).toBe(true);
      expect(liveMascot).toBeDefined();
      expect(liveMascot.id).toBe("mascot_22cb190ece7b4475");
    });

    it("verifies zero references to mock atlas.png across the entire live mascot JSON", () => {
      const rawJson = fs.readFileSync(LIVE_MASCOT_PATH, "utf8");
      expect(rawJson).not.toContain("atlas.png");
      expect(rawJson).not.toContain("mock_atlas");
      expect(rawJson).not.toContain("synthetic_sprite");
    });

    it("verifies Core Style Thinking variants: Slot 2 has WebM video, Slots 1 and 3-10 have static 3D images", () => {
      const coreStyle = liveMascot.styles?.find((s) => s.id === "core");
      expect(coreStyle).toBeDefined();

      const thinking = coreStyle!.states.thinking;
      expect(thinking.length).toBe(10);

      // Slot 2: WebM transparent video
      const slot2 = thinking.find((v) => v.slot_index === 2);
      expect(slot2).toBeDefined();
      if (slot2?.animation?.transparent_video_url) {
        expect(slot2.animation.transparent_video_url).toContain(".webm");
        expect(slot2.animation.alpha_codec).toBe("vp9_alpha");
        expect(slot2.animation.fps).toBe(24);
        expect(slot2.animation.duration_ms).toBe(8000);
      } else {
        expect(slot2?.image_url).toBeTruthy();
      }

      // Slots 1, 3..10: 3D character static images with NO atlas.png
      for (const slot of thinking) {
        if (slot.slot_index !== 2) {
          expect(slot.image_url).toBeTruthy();
          expect(slot.image_url).not.toContain("atlas.png");
          expect(slot.animation?.transparent_video_url).toBeUndefined();
        }
      }
    });

    it("verifies Core Style Celebrate variants: Slots 1..10 all resolve to 3D static images", () => {
      const coreStyle = liveMascot.styles?.find((s) => s.id === "core");
      const celebrate = coreStyle!.states.celebrate;
      expect(celebrate.length).toBe(10);

      for (const slot of celebrate) {
        expect(slot.image_url).toBeTruthy();
        expect(slot.image_url).not.toContain("atlas.png");
        expect(slot.animation?.transparent_video_url).toBeUndefined();
      }
    });
  });

  describe("Rendering Pipeline Parity on Live Mascot Data", () => {
    it("renders Core Thinking Slot 2 as transparent WebM video element with seek time", () => {
      const rawSlot2 = liveMascot.styles![0].states.thinking.find((v) => v.slot_index === 2)!;
      const testSlot2 = rawSlot2.animation?.transparent_video_url
        ? rawSlot2
        : {
            ...rawSlot2,
            animation: createVideoAnimationAsset("mascot_22cb190ece7b4475", "thinking", 2, true, 8000, 24),
          };
      const slot2OnlyMascot: MascotProfile = {
        ...liveMascot,
        render_bundle: undefined,
        actions: {},
        styles: [
          {
            ...liveMascot.styles![0],
            states: {
              ...liveMascot.styles![0].states,
              thinking: [testSlot2],
            },
          },
        ],
      };

      const adapted = adaptMascotForQuestion(slot2OnlyMascot, "core", 0, {
        videoId: "live_test",
        questionId: "q_video_seek",
      });

      expect(adapted).toBeDefined();
      expect(adapted?.render_bundle?.assets?.actions?.thinking?.animation?.transparent_video_url).toContain(".webm");

      const timelineOpts = {
        phase: "question" as const,
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        styleId: "core",
        timelineEvents: [
          { type: "choices.enter" as const, at_seconds: 1.0 },
          { type: "countdown.start" as const, at_seconds: 2.0 },
        ],
      };

      const html = renderProductionMascotHtmlLayer(adapted!, testMascotConfig, timelineOpts);

      // Must contain <video with transparent WebM source and seek time attributes
      expect(html).toContain("<video");
      expect(html).toContain(".webm");
      expect(html).toContain("data-mascot-animation-video");
      expect(html).toContain("data-mascot-video-time");

      // Verify frame at 3.0s resolves seekTimeSeconds and transparentVideoUrl
      const frame = resolveProductionMascotTimelineAtTime(timelineOpts, adapted!.render_bundle!, 3.0);
      expect(frame).not.toBeNull();
      expect(frame?.transparentVideoUrl).toContain(".webm");
      expect(frame?.seekTimeSeconds).toBe(1.0);
    });

    it("renders Core Thinking Slots 1 and 3..10 as 3D static images with CSS motion", () => {
      const staticOnlyMascot: MascotProfile = {
        ...liveMascot,
        styles: [
          {
            ...liveMascot.styles![0],
            states: {
              ...liveMascot.styles![0].states,
              thinking: [liveMascot.styles![0].states.thinking.find((v) => v.slot_index === 1)!],
            },
          },
        ],
      };

      const adapted = adaptMascotForQuestion(staticOnlyMascot, "core", 0, {
        videoId: "live_test",
        questionId: "q_static",
      });

      const html = renderProductionMascotHtmlLayer(adapted!, testMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        styleId: "core",
        timelineEvents: [
          { type: "choices.enter", at_seconds: 1.0 },
          { type: "countdown.start", at_seconds: 2.0 },
        ],
      });

      expect(html).toContain("<img");
      expect(html).not.toContain("<video");
      expect(html).toContain("data-mascot-motion-preset");
      expect(html).toContain("style_core_thinking_slot1");
    });

    it("verifies style with 0 celebrate variants and no anchor image resolves to cleanly omitted (null / visible: false)", () => {
      const styleWithoutCelebrate: MascotProfile = {
        ...liveMascot,
        styles: [
          {
            id: "no-celebrate-style",
            name: "No Celebrate Style",
            keyword: "no_celebrate",
            anchor_image_url: null,
            is_default: false,
            states: {
              thinking: [liveMascot.styles![0].states.thinking[0]],
              celebrate: [],
            },
            created_at: "2026-09-01T00:00:00.000Z",
            updated_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      const adapted = adaptMascotForQuestion(styleWithoutCelebrate, "no-celebrate-style", 0, {
        videoId: "live_test",
        questionId: "q_no_celebrate",
      });

      // Celebrate action must be cleanly omitted
      expect(adapted?.render_bundle?.assets?.actions?.celebrate).toBeUndefined();

      // Visibility phase rule for reveal & explain must be false
      expect(adapted?.render_bundle?.config.visibility.phase_rules.reveal.visible).toBe(false);
      expect(adapted?.render_bundle?.config.visibility.phase_rules.explain.visible).toBe(false);

      const timelineOpts = {
        phase: "question" as const,
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        styleId: "no-celebrate-style",
        timelineEvents: [{ type: "answer.reveal" as const, at_seconds: 2.0 }],
      };

      // Frame during reveal phase (2.5s) resolves to null
      const celebrateFrame = resolveProductionMascotTimelineAtTime(timelineOpts, adapted!.render_bundle!, 2.5);
      expect(celebrateFrame).toBeNull();

      // HTML rendering celebrate phase produces no celebrate markup (clean omission)
      const celebrateHtml = renderProductionMascotHtmlLayer(adapted!, testMascotConfig, timelineOpts);
      expect(celebrateHtml).not.toContain("mascot-state-celebrate");
      expect(celebrateHtml).not.toContain("state-celebrate");
    });

    it("verifies Police Style Celebrate with 0 variants gracefully falls back to its style anchor image", () => {
      const mascotWithPolice = liveMascot.styles?.some((s) => s.name === "Police") ? liveMascot : inTreeMascotFixture;
      const policeStyle = mascotWithPolice.styles?.find((s) => s.name === "Police");
      expect(policeStyle).toBeDefined();
      expect(policeStyle?.anchor_image_url).toBeTruthy();

      const adapted = adaptMascotForQuestion(mascotWithPolice, policeStyle!.id, 0, {
        videoId: "live_test",
        questionId: "q_police_anchor",
      });

      // When anchor is present, falls back to style anchor image
      expect(adapted?.render_bundle?.assets?.actions?.celebrate?.image_url).toBe(policeStyle!.anchor_image_url);
    });

    it("verifies Police Style Thinking (single variant) safely selects that variant without repeat-avoidance error", () => {
      const mascotWithPolice = liveMascot.styles?.some((s) => s.name === "Police") ? liveMascot : inTreeMascotFixture;
      const policeStyle = mascotWithPolice.styles?.find((s) => s.name === "Police");
      expect(policeStyle).toBeDefined();
      const availableThinking = filterAvailableVariants(policeStyle!.states.thinking);
      expect(availableThinking.length).toBe(1);
      expect(availableThinking[0].slot_index).toBe(1);

      let lastSlot: number | undefined;
      for (let q = 1; q <= 5; q++) {
        const result = selectQuestionMascotVariantResult({
          videoId: "police_episode",
          questionId: `q_${q}`,
          state: "thinking",
          styleId: policeStyle!.id,
          variants: availableThinking,
          previousSlotIndex: lastSlot,
        });

        expect(result).toBeDefined();
        expect(result?.slot_index).toBe(1);
        expect(result?.candidate_index).toBe(0);
        lastSlot = result?.slot_index;
      }
    });
  });

  describe("Edge Cases: Zero-Variant and Single-Variant Styles", () => {
    it("handles zero-variant style cleanly without exceptions or crashes", () => {
      const zeroVariantMascot: MascotProfile = {
        ...liveMascot,
        styles: [
          {
            id: "zero_style",
            name: "Empty Style",
            keyword: "",
            anchor_image_url: null,
            raw_anchor_image_url: null,
            is_default: false,
            states: {
              thinking: [],
              celebrate: [],
            },
            created_at: "2026-09-01T00:00:00.000Z",
            updated_at: "2026-09-01T00:00:00.000Z",
          },
        ],
      };

      const selected = selectQuestionMascotVariant({
        videoId: "v1",
        questionId: "q1",
        state: "thinking",
        styleId: "zero_style",
        variants: [],
      });
      expect(selected).toBeNull();

      const adapted = adaptMascotForQuestion(zeroVariantMascot, "zero_style", 0, {
        videoId: "v1",
        questionId: "q1",
      });

      expect(adapted).toBeDefined();
      expect(adapted?.render_bundle?.assets?.actions?.thinking).toBeUndefined();
      expect(adapted?.render_bundle?.assets?.actions?.celebrate).toBeUndefined();

      const html = renderProductionMascotHtmlLayer(adapted!, testMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        styleId: "zero_style",
        timelineEvents: [{ type: "countdown.start", at_seconds: 2.0 }],
      });

      expect(html).not.toContain("mascot-state-thinking");
    });

    it("handles single-variant style with repeat avoidance enabled without infinite loop or failure", () => {
      const singleVariant = [
        {
          id: "only_slot",
          slot_index: 7,
          image_url: "/assets/only.png",
          motion_preset: "pulse" as const,
        },
      ];

      const result = selectQuestionMascotVariantResult({
        videoId: "episode_single",
        questionId: "q2",
        state: "thinking",
        styleId: "single_style",
        variants: singleVariant,
        previousSlotIndex: 7,
      });

      expect(result).toBeDefined();
      expect(result?.slot_index).toBe(7);
      expect(result?.candidate_index).toBe(0);
      expect(result?.variant.image_url).toBe("/assets/only.png");
    });
  });
});
