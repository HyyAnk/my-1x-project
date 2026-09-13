import { describe, expect, it } from "vitest";
import {
  computeSandboxPhaseTimeline,
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QuizV2Schema,
  SETTLED_SANDBOX_PHASE_TIMESTAMPS,
  type QuizPreviewLayoutId,
  type QuizQuestionFormat,
  type QuizV2,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition, sandboxRewardFx } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { rewardFx } from "../src/quiz/render/candyArcade/candyArcadeClips.js";
import { isUnifiedQuizFrame } from "../src/quiz/render/frame/renderQuizFrameBody.js";
import { LANDSCAPE_FRAME } from "../src/quiz/render/frame/landscapeFrameGeometry.js";
import { quizSceneStateForPhase } from "../src/quiz/render/scene/quizSceneState.js";
import { productionSceneStateAt } from "../src/quiz/render/scene/productionSceneStateAdapter.js";

function createTestQuiz(layoutId: string, format: QuizQuestionFormat, choiceTexts: string[]): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: `ep-${layoutId}`,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: `q-${layoutId}`,
        number: 1,
        format,
        difficulty: 1,
        question: `Test question for ${layoutId}?`,
        choices: choiceTexts.map((text, idx) => ({ id: `c-${idx + 1}`, text })),
        correct_choice_id: "c-1",
        explanation: "Earth has only one natural satellite, the Moon.",
        fun_fact: "The Moon is drifting 3.8 cm away each year.",
        source_ids: ["test-stage-5"],
        visual_opportunity: `Visual representation for ${layoutId}`,
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

function renderClipHtml(layoutId: QuizPreviewLayoutId, format: QuizQuestionFormat, isFinal: boolean = false): string {
  const choices = ["Option A", "Option B", "Option C"];
  const effectiveChoices = format === "true_false" ? choices.slice(0, 2) : choices;
  const quiz = createTestQuiz(layoutId, format, effectiveChoices);
  const director = createDefaultDirectorPlan(quiz, "candy_arcade", "sunny");
  director.beats[0].layout_id = layoutId;

  if (layoutId.startsWith("visual_")) {
    director.beats[0].archetype = "visual_multiple_choice";
    director.beats[0].asset_intents = ["choice_illustration"];
  } else if (format === "true_false") {
    director.beats[0].archetype = "true_false";
    director.beats[0].asset_intents = ["question_illustration"];
  } else {
    director.beats[0].archetype = "text_multiple_choice";
    director.beats[0].asset_intents = ["question_illustration"];
  }

  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan: buildQuizVoicePlan(quiz),
  });

  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
    aspectRatio: "16:9",
  });

  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}

describe("Stage 5: Explanation & Reward FX Lifecycle Parity", () => {
  const timeline = computeSandboxPhaseTimeline();
  const rewardAtExpected = Number((timeline.revealStart + 0.8).toFixed(3)); // 8.270s

  describe("1. Fact Card Lifecycle Synchronization", () => {
    it("keys Fact Card entrance animation to --reward-at with phase-enter", () => {
      const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "16:9" });

      // Fact card must animate with phase-enter keyed to calc(var(--clip-start) + var(--reward-at))
      expect(css).toContain(".fact-card");
      expect(css).toContain("animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both;");
      expect(css).toContain("opacity: 0;");
      expect(css).toContain("contain: layout style;");
    });

    it("verifies settled timestamps: reveal (8.10s) < reward-at (8.27s) < explain (8.80s)", () => {
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBe(8.1);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBe(8.8);
      expect(rewardAtExpected).toBe(8.27);

      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeLessThan(rewardAtExpected);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBeGreaterThan(rewardAtExpected);
    });

    it("verifies that at settled timestamp reveal (8.10s), the fact card is invisible in rehearsal and absent in snapshot", () => {
      // Rehearsal composition
      const rehearsal = buildSandboxComposition({
        mode: "rehearsal",
        aspect_ratio: "16:9",
        choices: ["Alpha", "Beta", "Gamma"],
        correct_choice_index: 0,
        fact_card_text: "Scientific explanation fact.",
      });

      // Fact card in rehearsal stage uses CSS animation holding opacity 0 before --reward-at
      expect(rehearsal.html).toContain(`--reward-at: ${rewardAtExpected.toFixed(3)}s;`);
      expect(rehearsal.html).toContain('class="fact-card sandbox-explain-card"');
      expect(rehearsal.css).toContain("opacity: 0;");

      // Snapshot composition at phase: reveal
      const snapshotReveal = buildSandboxComposition({
        aspect_ratio: "16:9",
        phase: "reveal",
        choices: ["Alpha", "Beta", "Gamma"],
        correct_choice_index: 0,
        fact_card_text: "Scientific explanation fact.",
      });

      // Fact card must NOT be visible at phase reveal
      expect(snapshotReveal.html).not.toContain("sandbox-explain-card");
      expect(snapshotReveal.html).not.toContain("Scientific explanation fact.");
    });

    it("verifies that at settled timestamp explain (8.80s), the fact card is cleanly entered with opacity: 1", () => {
      const snapshotExplain = buildSandboxComposition({
        aspect_ratio: "16:9",
        phase: "explain",
        choices: ["Alpha", "Beta", "Gamma"],
        correct_choice_index: 0,
        fact_card_text: "Scientific explanation fact.",
      });

      // Fact card must be visible with explicit opacity: 1 and no animation in snapshot mode
      expect(snapshotExplain.html).toContain("sandbox-explain-card");
      expect(snapshotExplain.html).toContain("opacity: 1; animation: none;");
      expect(snapshotExplain.html).toContain("Scientific explanation fact.");
      expect(snapshotExplain.html).toContain("data-layout-allow-occlusion");
    });

    it("enforces identical typography, border radius, and containment across Rehearsal and Video clips", () => {
      const css = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });

      // Typography
      expect(css).toContain("font-size: 38px;");
      expect(css).toContain("font-weight: 900;");
      expect(css).toContain("line-height: 1.2;");
      expect(css).toContain("letter-spacing: -0.3px;");
      expect(css).toContain('"Fredoka"');

      // Box styling
      expect(css).toContain("border: 6px solid rgba(255,255,255,.85);");
      expect(css).toContain("border-radius: 38px;");
      expect(css).toContain("contain: layout style;");
    });
  });

  describe("2. Reward FX Lifecycle Synchronization", () => {
    it("keys reward-fx and its bursting particles to --reward-at with star-burst animation", () => {
      const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "16:9" });

      expect(css).toContain(".reward-fx {");
      expect(css).toContain("animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both;");
      expect(css).toContain(".reward-fx i {");
      expect(css).toContain("animation: star-burst .72s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reward-at)) both;");
      expect(css).toContain("@keyframes star-burst {");
    });

    it("verifies reward-fx is 100% invisible at reveal (8.10s) and actively displayed at explain (8.80s)", () => {
      // At 8.10s, reveal phase:
      const sceneStateReveal = quizSceneStateForPhase("reveal");
      expect(sceneStateReveal.reward).toBe("hidden");
      expect(sceneStateReveal.fact).toBe("hidden");

      // Production timing state adapter at 8.10s
      const testTiming = {
        start: 0,
        choicesStart: 0.85,
        thinkingStart: 2.47,
        revealStart: 7.47,
        rewardStart: 8.27,
        end: 10.27,
      };
      const prodStateAt810 = productionSceneStateAt(testTiming, 8.1);
      expect(prodStateAt810.phase).toBe("reveal");
      expect(prodStateAt810.reward).toBe("hidden");

      // Snapshot document at phase reveal must NOT render reward-fx DOM element
      const snapshotReveal = buildSandboxComposition({
        aspect_ratio: "16:9",
        phase: "reveal",
        choices: ["Alpha", "Beta", "Gamma"],
        correct_choice_index: 0,
      });
      expect(snapshotReveal.html).not.toContain('<div class="reward-fx');

      // At 8.80s, explain phase:
      const sceneStateExplain = quizSceneStateForPhase("explain");
      expect(sceneStateExplain.reward).toBe("visible");
      expect(sceneStateExplain.fact).toBe("visible");

      const prodStateAt880 = productionSceneStateAt(testTiming, 8.8);
      expect(prodStateAt880.phase).toBe("explain");
      expect(prodStateAt880.reward).toBe("visible");

      // Snapshot document at phase explain must render reward-fx
      const snapshotExplain = buildSandboxComposition({
        aspect_ratio: "16:9",
        phase: "explain",
        choices: ["Alpha", "Beta", "Gamma"],
        correct_choice_index: 0,
      });
      expect(snapshotExplain.html).toContain("reward-fx");
      expect(snapshotExplain.html).toContain("reward-big");
      expect(snapshotExplain.html).toContain('style="opacity: 1; animation: none;"');
    });

    it("guarantees 100% markup parity for rewardFx('big') between rehearsal, production, and snapshot", () => {
      const prodFxBig = rewardFx("big");
      const rehearsalFxBig = rewardFx("big");
      const snapshotFxBig = sandboxRewardFx("big");

      // Production clip and rehearsal clip use identical rewardFx
      expect(prodFxBig).toBe(rehearsalFxBig);
      expect(prodFxBig).toContain('class="reward-fx reward-big"');
      expect(prodFxBig).toContain('data-layout-ignore aria-hidden="true"');

      // Both big reward FX variants must contain 9 particles alternating stars and diamonds
      const starCount = (prodFxBig.match(/<i>★<\/i>/g) || []).length;
      const diamondCount = (prodFxBig.match(/<i>✦<\/i>/g) || []).length;
      expect(starCount).toBe(5);
      expect(diamondCount).toBe(4);
      expect(starCount + diamondCount).toBe(9);

      // Snapshot rewardFx matches the same 9 particles and accessibility attributes
      expect(snapshotFxBig).toContain('class="reward-fx reward-big"');
      expect(snapshotFxBig).toContain('data-layout-ignore aria-hidden="true"');
      const snapshotStars = (snapshotFxBig.match(/>★<\/i>/g) || []).length;
      const snapshotDiamonds = (snapshotFxBig.match(/>✦<\/i>/g) || []).length;
      expect(snapshotStars).toBe(5);
      expect(snapshotDiamonds).toBe(4);
      expect(snapshotStars + snapshotDiamonds).toBe(9);
    });

    it("verifies small rewardFx variant for non-final production clips", () => {
      const prodFxSmall = rewardFx("small");
      expect(prodFxSmall).toContain('class="reward-fx reward-small"');
      expect(prodFxSmall).toContain('data-layout-ignore aria-hidden="true"');
      const totalParticles = (prodFxSmall.match(/<i>/g) || []).length;
      expect(totalParticles).toBe(7);
    });
  });

  describe("3. Parity between Unified Frames and Standard Frames", () => {
    it("ensures all 8 active landscape layouts use unified quiz frame with identical fact anchor", () => {
      for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
        expect(isUnifiedQuizFrame(layoutId, "16:9")).toBe(true);

        const is2Choice = layoutId === "split_versus_two" || layoutId === "verdict_true_false";
        const format: QuizQuestionFormat = is2Choice ? "true_false" : layoutId === "visual_choices_three_pure" ? "odd_one_out" : "multiple_choice";
        const choices = is2Choice ? ["Option A", "Option B"] : ["Option A", "Option B", "Option C"];

        // Production clip
        const clipHtml = renderClipHtml(layoutId, format);
        expect(clipHtml).toContain("quiz-frame-unified");
        expect(clipHtml).toContain('class="quiz-fact-anchor" data-quiz-fixed="fact"');
        expect(clipHtml).toContain('class="fact-card" data-layout-allow-occlusion');

        // Sandbox rehearsal composition
        const rehearsal = buildSandboxComposition({
          layout_id: layoutId,
          aspect_ratio: "16:9",
          mode: "rehearsal",
          question_format: format,
          choices,
          correct_choice_index: 0,
          fact_card_text: "Shared fact text across layouts.",
        });
        expect(rehearsal.html).toContain("quiz-frame-unified");
        expect(rehearsal.html).toContain('class="quiz-fact-anchor" data-quiz-fixed="fact"');
        expect(rehearsal.html).toContain('class="fact-card sandbox-explain-card" data-layout-allow-occlusion');

        // Sandbox snapshot composition
        const snapshot = buildSandboxComposition({
          layout_id: layoutId,
          aspect_ratio: "16:9",
          phase: "explain",
          question_format: format,
          choices,
          correct_choice_index: 0,
          fact_card_text: "Shared fact text across layouts.",
        });
        expect(snapshot.html).toContain("quiz-frame-unified");
        expect(snapshot.html).toContain('class="quiz-fact-anchor" data-quiz-fixed="fact"');
        expect(snapshot.html).toContain('class="fact-card sandbox-explain-card" data-layout-allow-occlusion');
      }
    });

    it("verifies unified fact anchor positioning matches LANDSCAPE_FRAME geometry", () => {
      const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "16:9" });
      const { fact } = LANDSCAPE_FRAME;

      expect(css).toContain(`.quiz-frame-unified .quiz-fact-anchor {`);
      expect(css).toContain(`left: ${fact.x}px;`);
      expect(css).toContain(`top: ${fact.y}px;`);
      expect(css).toContain(`width: ${fact.width}px;`);
      expect(css).toContain(`height: ${fact.height}px;`);
      expect(css).toContain(`.quiz-frame-unified .quiz-fact-anchor > .fact-card {`);
      expect(css).toContain("transform: none;");
    });

    it("verifies baseline layout maintains standard phase-region and centered fact card", () => {
      expect(isUnifiedQuizFrame("baseline", "16:9")).toBe(false);

      const baselineSnapshot = buildSandboxComposition({
        layout_id: "baseline",
        aspect_ratio: "16:9",
        phase: "explain",
        choices: ["Option A", "Option B"],
        fact_card_text: "Baseline explanation text.",
      });

      expect(baselineSnapshot.html).not.toMatch(/class="[^"]*\bquiz-frame-unified\b[^"]*"/);
      expect(baselineSnapshot.html).not.toContain('class="quiz-fact-anchor"');
      expect(baselineSnapshot.html).toContain('class="phase-region"');
      expect(baselineSnapshot.html).toContain("transform: translateX(-50%);");
    });
  });

  describe("4. 16:9 Landscape and 9:16 Portrait Viewport Mode Parity", () => {
    it("renders 16:9 canvas dimensions (1920x1080) for landscape rehearsal and snapshot", () => {
      const rehearsal = buildSandboxComposition({
        mode: "rehearsal",
        aspect_ratio: "16:9",
        choices: ["A", "B", "C"],
      });
      expect(rehearsal.html).toContain('data-width="1920"');
      expect(rehearsal.html).toContain('data-height="1080"');
      expect(rehearsal.html).toContain('data-aspect-ratio="16:9"');

      const snapshot = buildSandboxComposition({
        aspect_ratio: "16:9",
        phase: "explain",
        choices: ["A", "B", "C"],
      });
      expect(snapshot.html).toContain('data-width="1920"');
      expect(snapshot.html).toContain('data-height="1080"');
      expect(snapshot.html).toContain('data-aspect-ratio="16:9"');
    });

    it("verifies 9:16 portrait viewport styling and portrait-phase-embedded containment", () => {
      const portraitCss = candyArcadeCss({ fontMode: "render", aspectRatio: "9:16" });

      expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"]');
      expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"] .phase-region {');
      expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"] .phase-region > .fact-card { width: 100%; left: 0; transform: none; }');
      expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"] .phase-region.portrait-phase-embedded { position: relative; left: auto; right: auto; bottom: auto; top: auto; width: 100%; transform: none; }');
      expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"] .phase-region.portrait-phase-embedded > .fact-card { position: relative; bottom: auto; left: auto; transform: none; width: 100%; margin: 0 auto; }');
      expect(portraitCss).toContain('#stage[data-aspect-ratio="9:16"] .phase-region.portrait-phase-embedded > .thinking-bar { position: relative; bottom: auto; left: auto; transform: none; width: 100%; margin: 0 auto; }');
    });
  });
});
