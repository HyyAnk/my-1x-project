import { describe, expect, it } from "vitest";
import { MASCOT_CANVAS_SIZES, type MascotRenderAspectRatio } from "@studio/shared";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { quizFrameCss } from "../src/quiz/render/frame/quizFrameStyles.js";
import { customIntroVideoClip, renderIntroTransitionOverlay } from "../src/quiz/render/candyArcade/customVideoClips.js";
import { sandboxSnapshotDocument, sandboxRehearsalDocument } from "../src/quiz/render/sandbox/sandboxDocumentTemplates.js";
import { adaptSandboxQuizScene } from "../src/quiz/render/scene/sandboxSceneAdapter.js";
import { buildQuizSceneParts } from "../src/quiz/render/scene/buildQuizSceneParts.js";
import { renderStableQuizSceneParts } from "../src/quiz/render/scene/renderQuizSceneParts.js";
import { computeSandboxPhaseTimeline } from "../src/quiz/timeline/timingPolicy.js";

describe("Stage 8: Visual Layout & Safe-Zone Viewport Parity (16:9 & 9:16)", () => {
  describe("1. Layout metrics and canvas dimension parity", () => {
    it("calibrates 16:9 canvas dimensions to 1920x1080", () => {
      const canvas16x9 = MASCOT_CANVAS_SIZES["16:9"];
      expect(canvas16x9.width).toBe(1920);
      expect(canvas16x9.height).toBe(1080);

      const css16x9 = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });
      expect(css16x9).toContain("#stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; }");
    });

    it("calibrates 9:16 portrait canvas dimensions to 1080x1920", () => {
      const canvas9x16 = MASCOT_CANVAS_SIZES["9:16"];
      expect(canvas9x16.width).toBe(1080);
      expect(canvas9x16.height).toBe(1920);

      const css9x16 = candyArcadeCss({ fontMode: "render", aspectRatio: "9:16" });
      expect(css9x16).toContain("#stage { position: relative; width: 1080px; height: 1920px; overflow: hidden; }");
    });
  });

  describe("2. Safe-zone custom properties verification", () => {
    it('defines 16:9 standard broadcast safe zones in :root and #stage[data-aspect-ratio="16:9"]', () => {
      const css16x9 = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });

      // Action Safe (54px top/bottom, 96px left/right)
      expect(css16x9).toContain("--safe-zone-top: 54px;");
      expect(css16x9).toContain("--safe-zone-bottom: 54px;");
      expect(css16x9).toContain("--safe-zone-left: 96px;");
      expect(css16x9).toContain("--safe-zone-right: 96px;");

      // Title Safe (108px top/bottom, 192px left/right)
      expect(css16x9).toContain("--safe-zone-title-top: 108px;");
      expect(css16x9).toContain("--safe-zone-title-bottom: 108px;");
      expect(css16x9).toContain("--safe-zone-title-left: 192px;");
      expect(css16x9).toContain("--safe-zone-title-right: 192px;");

      // Dedicated 16:9 stage selector
      expect(css16x9).toContain('#stage[data-aspect-ratio="16:9"]');
    });

    it("defines 9:16 platform safe zones matching mobile short-form UI boundaries", () => {
      const css9x16 = candyArcadeCss({ fontMode: "render", aspectRatio: "9:16" });

      expect(css9x16).toContain('#stage[data-aspect-ratio="9:16"]');
      expect(css9x16).toContain("--safe-zone-top: 180px;");
      expect(css9x16).toContain("--safe-zone-bottom: 440px;");
      expect(css9x16).toContain("--safe-zone-left: 36px;");
      expect(css9x16).toContain("--safe-zone-right: 140px;");

      // Phase region uses dynamic safe zone variables
      expect(css9x16).toContain("bottom: var(--safe-zone-bottom, 440px);");
      expect(css9x16).toContain("right: var(--safe-zone-right, 140px);");
    });

    it("verifies unified landscape frame declares explicit safe zones", () => {
      const frameCss = quizFrameCss();
      expect(frameCss).toContain("--safe-zone-top: 54px;");
      expect(frameCss).toContain("--safe-zone-bottom: 54px;");
      expect(frameCss).toContain("--safe-zone-left: 96px;");
      expect(frameCss).toContain("--safe-zone-right: 96px;");
    });
  });

  describe("3. Typography scaling and overflow resilience", () => {
    it("defines robust question size and leading fallbacks in :root", () => {
      const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "16:9" });
      expect(css).toContain("--question-size: 50px;");
      expect(css).toContain("--question-leading: 1.18;");
      expect(css).toContain("font-size: var(--question-size, 50px);");
      expect(css).toContain("line-height: var(--question-leading, 1.18);");
    });

    it("enforces word-break and overflow-wrap resilience on question headings", () => {
      const css16x9 = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });
      expect(css16x9).toContain("overflow-wrap: break-word;");
      expect(css16x9).toContain("word-break: break-word;");

      const css9x16 = candyArcadeCss({ fontMode: "render", aspectRatio: "9:16" });
      expect(css9x16).toContain(
        '#stage[data-aspect-ratio="9:16"] .question-title h1 { overflow-wrap: break-word; word-break: break-word; }',
      );
    });

    it("enforces multi-line choice text clamping and word-break resilience across all choice span variants", () => {
      const css = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });
      expect(css).toContain('.choice-group[data-choice-fit-lines="2"] .choice-text,');
      expect(css).toContain('.choice-group[data-choice-fit-lines="2"] .answer-card span,');
      expect(css).toContain('.choice-group[data-choice-fit-lines="2"] .visual-answer-label span');
      expect(css).toContain("-webkit-line-clamp: 2;");
      expect(css).toContain("overflow-wrap: break-word;");
    });

    it("preserves choice font sizing tokens across all capacity tiers", () => {
      const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "16:9" });
      expect(css).toContain("--choice-font-size-base: 36px;");
      expect(css).toContain("--choice-font-size-medium: 28px;");
      expect(css).toContain("--choice-font-size-long: 23px;");
      expect(css).toContain("--choice-font-size-very_long: 19px;");
      expect(css).toContain("--choice-font-size-overflow: 19px;");
    });
  });

  describe("4. Sandbox document template viewport and safe-zone synchronization", () => {
    function createMockSceneModel(aspectRatio: MascotRenderAspectRatio) {
      const input = {
        question_text: "What is the capital of France?",
        choices: ["Berlin", "Paris", "Rome"],
        correct_choice_index: 1,
        question_number: 1,
        total_questions: 5,
        fact_card_text: "Paris is widely renowned for its art, gastronomy, and cultural heritage.",
        palette_id: "lime",
        layout_id: "media_left_choices_right" as const,
        aspect_ratio: "16:9" as const,
      };
      const model = adaptSandboxQuizScene(input, false);
      // Override aspect ratio for portrait test calibration
      model.aspectRatio = aspectRatio;
      const parts = buildQuizSceneParts(model);
      const stableParts = renderStableQuizSceneParts(parts);
      return { model, parts, stableParts };
    }

    it("injects 16:9 broadcast safe zones into sandbox snapshot document", () => {
      const { model, parts, stableParts } = createMockSceneModel("16:9");
      const html = sandboxSnapshotDocument(model, parts, stableParts, "<div id='stage-content'></div>", "");

      expect(html).toContain("--safe-zone-top: 54px;");
      expect(html).toContain("--safe-zone-bottom: 54px;");
      expect(html).toContain("--safe-zone-left: 96px;");
      expect(html).toContain("--safe-zone-right: 96px;");
      expect(html).toContain('data-aspect-ratio="16:9"');
      expect(html).toContain('data-width="1920"');
      expect(html).toContain('data-height="1080"');
    });

    it("injects 9:16 platform safe zones into sandbox snapshot document", () => {
      const { model, parts, stableParts } = createMockSceneModel("9:16");
      const html = sandboxSnapshotDocument(model, parts, stableParts, "<div id='stage-content'></div>", "");

      expect(html).toContain("--safe-zone-top: 180px;");
      expect(html).toContain("--safe-zone-bottom: 440px;");
      expect(html).toContain("--safe-zone-left: 36px;");
      expect(html).toContain("--safe-zone-right: 140px;");
      expect(html).toContain('data-aspect-ratio="9:16"');
      expect(html).toContain('data-width="1080"');
      expect(html).toContain('data-height="1920"');
    });

    it("injects safe zones and timeline parameters into sandbox rehearsal document", () => {
      const { model, parts, stableParts } = createMockSceneModel("16:9");
      const timeline = computeSandboxPhaseTimeline();
      const html = sandboxRehearsalDocument(model, parts, stableParts, "<div id='stage-content'></div>", "", "", timeline);

      expect(html).toContain("--safe-zone-top: 54px;");
      expect(html).toContain("--safe-zone-bottom: 54px;");
      expect(html).toContain('data-aspect-ratio="16:9"');
      expect(html).toContain("--scene-duration:");
      expect(html).toContain("--timer-duration:");
    });
  });

  describe("5. Video transition overlay canvas calibration", () => {
    it("calibrates intro transition overlay to 1920x1080 for 16:9 landscape", () => {
      const overlay16x9 = renderIntroTransitionOverlay("swipe", 2.0, 0.8, undefined, "test-instance", "16:9");
      expect(overlay16x9).toContain("swipe-curtain");
      expect(overlay16x9).toContain("--trans-start:2.000s");
      expect(overlay16x9).toContain("--trans-dur:0.800s");

      const clip16x9 = customIntroVideoClip("/videos/intro.mp4", 3.0, "swipe", true, 0.8, "intro-1", "16:9");
      expect(clip16x9).toContain('id="custom-intro"');
      expect(clip16x9).toContain("swipe-curtain");
    });

    it("calibrates intro transition overlay for 9:16 portrait", () => {
      const overlay9x16 = renderIntroTransitionOverlay("swipe", 2.0, 0.8, undefined, "test-instance-916", "9:16");
      expect(overlay9x16).toContain("swipe-curtain");

      const clip9x16 = customIntroVideoClip("/videos/intro_portrait.mp4", 3.0, "swipe", true, 0.8, "intro-916", "9:16");
      expect(clip9x16).toContain('id="custom-intro"');
      expect(clip9x16).toContain("swipe-curtain");
    });
  });
});
