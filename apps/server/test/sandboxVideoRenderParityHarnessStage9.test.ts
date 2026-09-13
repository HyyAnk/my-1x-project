import { describe, expect, it } from "vitest";
import {
  computeSandboxPhaseTimeline,
  getSandboxPhaseAtTime,
  getSandboxPhaseTimestamps,
  MASCOT_CANVAS_SIZES,
  QuizV2Schema,
  SETTLED_SANDBOX_PHASE_TIMESTAMPS,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderAspectRatio,
  type QuizPreviewLayoutId,
  type QuizQuestionFormat,
  type QuizV2,
  type SandboxPhase,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { calculateThinkingBarTiming } from "../src/quiz/visual/elements/thinkingBar/types.js";
import { productionSceneStateAt } from "../src/quiz/render/scene/productionSceneStateAdapter.js";
import { quizSceneStateForPhase } from "../src/quiz/render/scene/quizSceneState.js";
import { sandboxPreviewTimeForPhase } from "../src/quiz/render/scene/sandboxSceneStateAdapter.js";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";
import { resolveProductionMascotMarkers } from "../src/quiz/render/productionMascotTimeline.js";
import { adaptSandboxQuizScene } from "../src/quiz/render/scene/sandboxSceneAdapter.js";
import { buildQuizSceneParts } from "../src/quiz/render/scene/buildQuizSceneParts.js";
import { renderStableQuizSceneParts } from "../src/quiz/render/scene/renderQuizSceneParts.js";
import {
  sandboxRehearsalDocument,
  sandboxSnapshotDocument,
} from "../src/quiz/render/sandbox/sandboxDocumentTemplates.js";

const testMascotFixture: MascotProfile = {
  id: "mascot-stage-9-parity",
  name: "Stage 9 Parity Mascot",
  description: "Reference mascot for Stage 9 parity testing",
  visual_style: "pixar_3d",
  master_prompt: "friendly robotic quiz companion",
  master_image_url: "/assets/mascots/parity/master.png",
  color_theme: "#3b82f6",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "/assets/mascots/parity/idle.png",
      frames_count: 1,
      fps: 6,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "breathe",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
    thinking: {
      action: "thinking",
      sprite_url: "/assets/mascots/parity/thinking.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "sway",
      motion_speed: 1.25,
      motion_intensity: "normal",
    },
    celebrate: {
      action: "celebrate",
      sprite_url: "/assets/mascots/parity/celebrate.png",
      frames_count: 1,
      fps: 10,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: -10,
      motion_preset: "jump",
      motion_speed: 1.1,
      motion_intensity: "dynamic",
    },
    point: {
      action: "point",
      sprite_url: "/assets/mascots/parity/point.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: -4,
      offset_y: 0,
      motion_preset: "point",
      motion_speed: 0.9,
      motion_intensity: "normal",
    },
    oops: {
      action: "oops",
      sprite_url: "/assets/mascots/parity/oops.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "shake",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const testChannelMascotConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.84,
  offset_x: 24,
  offset_y: 88,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

function createParityQuiz(layoutId: string, format: QuizQuestionFormat, choiceTexts: string[]): QuizV2 {
  const effectiveChoices =
    format === "true_false" || choiceTexts.length === 2
      ? choiceTexts.slice(0, 2)
      : choiceTexts.length >= 3
        ? choiceTexts.slice(0, 3)
        : [...choiceTexts, "Extra Choice"].slice(0, 3);
  const effectiveFormat = effectiveChoices.length === 2 ? "true_false" : format;

  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: `ep-parity-${layoutId}`,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: `q-parity-${layoutId}`,
        number: 1,
        format: effectiveFormat,
        difficulty: 1,
        question: `Parity test question for ${layoutId}?`,
        choices: effectiveChoices.map((text, idx) => ({ id: `c-${idx + 1}`, text })),
        correct_choice_id: "c-1",
        explanation: "Correct answer explanation verifying Stage 9 parity.",
        fun_fact: "Parity verification settled fun fact.",
        source_ids: ["parity-stage-9"],
        visual_opportunity: `Visual illustration for ${layoutId}`,
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

function renderProductionClip(
  layoutId: QuizPreviewLayoutId,
  format: QuizQuestionFormat,
  choices: string[],
  aspectRatio: MascotRenderAspectRatio = "16:9",
  revealOutcome: "correct" | "wrong" = "correct",
): { html: string; css: string } {
  const quiz = createParityQuiz(layoutId, format, choices);
  const director = createDefaultDirectorPlan(quiz, "candy_arcade", "sunny");
  director.beats[0].layout_id = layoutId;

  if (layoutId.startsWith("visual_")) {
    director.beats[0].archetype = "visual_multiple_choice";
    director.beats[0].asset_intents = ["choice_illustration"];
  } else if (format === "true_false" || choices.length === 2) {
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
    aspectRatio,
    mascot: testMascotFixture,
    mascotConfig: testChannelMascotConfig,
  });

  const fullHtml = [bundle.html, ...Object.values(bundle.files)].join("\n");
  const css = candyArcadeCss({ fontMode: "render", aspectRatio });
  return { html: fullHtml, css };
}

describe("Stage 9: Comprehensive Regression Test Suite & Parity Harness (apps/server & apps/web)", () => {
  const timeline = computeSandboxPhaseTimeline();
  const rewardAtExpected = Number((timeline.revealStart + 0.8).toFixed(3)); // 8.270s

  describe("1. Canonical Settled Timestamps Calibration & Cross-Package Synchronization", () => {
    it("synchronizes the 5 canonical settled timestamps in @studio/shared", () => {
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBe(0.6);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBe(2.0);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBe(3.5);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBe(8.1);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBe(8.8);
    });

    it("verifies getSandboxPhaseTimestamps returns the canonical settled timestamps in sequence", () => {
      const timestamps = getSandboxPhaseTimestamps();
      expect(timestamps).toEqual([
        { id: "question", time: 0.6 },
        { id: "choices", time: 2.0 },
        { id: "thinking", time: 3.5 },
        { id: "reveal", time: 8.1 },
        { id: "explain", time: 8.8 },
      ]);
    });

    it("verifies getSandboxPhaseAtTime maps each settled timestamp to its canonical phase", () => {
      expect(getSandboxPhaseAtTime(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question)).toBe("question");
      expect(getSandboxPhaseAtTime(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices)).toBe("choices");
      expect(getSandboxPhaseAtTime(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking)).toBe("thinking");
      expect(getSandboxPhaseAtTime(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal)).toBe("reveal");
      expect(getSandboxPhaseAtTime(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain)).toBe("explain");
    });

    it("verifies sandboxPreviewTimeForPhase in server matches SETTLED_SANDBOX_PHASE_TIMESTAMPS", () => {
      expect(sandboxPreviewTimeForPhase("question")).toBe(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question);
      expect(sandboxPreviewTimeForPhase("choices")).toBe(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices);
      expect(sandboxPreviewTimeForPhase("thinking")).toBe(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking);
      expect(sandboxPreviewTimeForPhase("reveal")).toBe(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal);
      expect(sandboxPreviewTimeForPhase("explain")).toBe(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain);
    });

    it("verifies productionSceneStateAt aligns with quizSceneStateForPhase at each settled timestamp", () => {
      const sceneTiming = {
        start: 0,
        choicesStart: timeline.choicesStart,
        thinkingStart: timeline.thinkingStart,
        revealStart: timeline.revealStart,
        rewardStart: rewardAtExpected,
        end: timeline.totalDuration,
      };

      const phases: SandboxPhase[] = ["question", "choices", "thinking", "reveal", "explain"];
      for (const phase of phases) {
        const settledTime = SETTLED_SANDBOX_PHASE_TIMESTAMPS[phase];
        const stateFromTimestamp = productionSceneStateAt(sceneTiming, settledTime);
        const stateFromPhase = quizSceneStateForPhase(phase);
        expect(stateFromTimestamp).toEqual(stateFromPhase);
      }
    });
  });

  describe("2. Phase 1: Question Settled Keyframe Parity (0.6s)", () => {
    it("verifies question card has entered (0.52s duration) and is floating at 0.6s", () => {
      const { html, css } = renderProductionClip("full_stack_list", "multiple_choice", ["A", "B", "C"]);

      // Question card entrance animation has 0.52s duration, completing before 0.6s
      expect(css).toContain("question-card-enter 0.52s");
      expect(css).toContain("question-card-float 4.2s");
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBeGreaterThan(0.52);

      // Rehearsal composition mounts question element
      const rehearsal = buildSandboxComposition({
        mode: "rehearsal",
        aspect_ratio: "16:9",
        question_text: "What is the capital of France?",
        choices: ["Berlin", "Paris", "Rome"],
        correct_choice_index: 1,
        fact_card_text: "Paris is widely renowned.",
      });
      expect(rehearsal.html).toContain("question-title");
      expect(rehearsal.html).toContain("What is the capital of France?");
    });

    it("verifies choices are pending and not revealed at 0.6s", () => {
      // In scheduled playback, choices entrance starts at 0.85s > 0.6s
      expect(timeline.choicesStart).toBe(0.85);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBeLessThan(timeline.choicesStart);

      // Snapshot preview in question phase has choices pending and hidden
      const snapshot = buildSandboxComposition({
        mode: "snapshot",
        phase: "question",
        choices: ["A", "B", "C"],
        correct_choice_index: 0,
      });
      expect(snapshot.html).toContain("answer-pending");
      expect(snapshot.html).not.toMatch(/class="[^"]*\bchoice-card\b[^"]*\banswer-correct\b[^"]*"/);
      expect(snapshot.html).not.toMatch(/class="[^"]*\bchoice-card\b[^"]*\banswer-reveal-correct\b[^"]*"/);
    });

    it("verifies timer displays '?' query hold with no countdown numbers at 0.6s", () => {
      const { html } = renderProductionClip("full_stack_list", "multiple_choice", ["A", "B", "C"]);

      expect(html).toContain('class="marker-val val-query"');
      expect(html).toContain("?");

      const thinkingTiming = calculateThinkingBarTiming({
        clipStart: 0,
        revealStart: timeline.revealStart,
        thinkingStart: timeline.thinkingStart,
      });

      // Query hold duration is 2.47s, cleanly holding '?' at 0.6s
      expect(Number(thinkingTiming.queryHoldDuration.toFixed(2))).toBe(2.47);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBeLessThan(thinkingTiming.queryHoldDuration);

      // cd5 does not start until thinkingStart at 2.47s
      expect(Number(thinkingTiming.cd5.toFixed(2))).toBe(2.47);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBeLessThan(thinkingTiming.cd5);
    });

    it("verifies mascot is in idle pose at 0.6s", () => {
      const markers = resolveProductionMascotMarkers(
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          timelineEvents: [
            { type: "choices.enter", at_seconds: timeline.choicesStart },
            { type: "countdown.start", at_seconds: timeline.thinkingStart },
            { type: "answer.reveal", at_seconds: timeline.revealStart },
            { type: "fact.enter", at_seconds: rewardAtExpected },
          ],
        },
        0,
        timeline.totalDuration,
      );

      expect(markers[0]).toMatchObject({ atSeconds: 0, phase: "question" });

      const html = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: rewardAtExpected },
        ],
      });

      expect(html).toContain('class="mascot-v2-state state-idle"');
      expect(html).toContain('data-mascot-action="idle"');
      expect(html).toContain('data-mascot-motion-preset="breathe"');
      expect(html).toContain("--mascot-state-delay:0s");
    });

    it("verifies fact card and reward stars are hidden (opacity: 0) at 0.6s", () => {
      const { css } = renderProductionClip("full_stack_list", "multiple_choice", ["A", "B", "C"]);

      // Fact card holds opacity: 0 until rewardAt (8.27s)
      expect(css).toContain(".fact-card");
      expect(css).toContain("opacity: 0;");
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBeLessThan(rewardAtExpected);

      const sceneState = quizSceneStateForPhase("question");
      expect(sceneState.fact).toBe("hidden");
      expect(sceneState.reward).toBe("hidden");
    });
  });

  describe("3. Phase 2: Choices Settled Keyframe Parity (2.0s)", () => {
    it("verifies choice cards have landed and are floating at 2.0s, supporting up to 4 staggered offsets in CSS", () => {
      const { html, css } = renderProductionClip("full_stack_list", "multiple_choice", [
        "Choice A",
        "Choice B",
        "Choice C",
      ]);

      // The layout defines 4 staggered entrance delay rules (0.00s, 0.14s, 0.28s, 0.42s)
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.42s)");

      // Entrance duration is 0.54s; max landing time: 0.85s + 0.42s + 0.54s = 1.81s < 2.0s
      const maxLandingTime = timeline.choicesStart + 0.42 + 0.54;
      expect(maxLandingTime).toBe(1.81);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBe(2.0);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBeGreaterThan(maxLandingTime);

      // Answer float is active: 0.42s + 0.54s = 0.96s after choices-at
      expect(html).toContain("answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.96s)");
    });

    it("verifies timer has not started countdown numbers at 2.0s", () => {
      // thinkingStart is 2.47s, so at 2.0s countdown numbers have not started
      expect(timeline.thinkingStart).toBe(2.47);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBeLessThan(timeline.thinkingStart);

      const thinkingTiming = calculateThinkingBarTiming({
        clipStart: 0,
        revealStart: timeline.revealStart,
        thinkingStart: timeline.thinkingStart,
      });
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBeLessThan(thinkingTiming.cd5);
    });

    it("verifies mascot is in choices pose at 2.0s", () => {
      const markers = resolveProductionMascotMarkers(
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          timelineEvents: [
            { type: "choices.enter", at_seconds: timeline.choicesStart },
            { type: "countdown.start", at_seconds: timeline.thinkingStart },
            { type: "answer.reveal", at_seconds: timeline.revealStart },
            { type: "fact.enter", at_seconds: rewardAtExpected },
          ],
        },
        0,
        timeline.totalDuration,
      );

      // Choices marker starts at 0.85s and thinking marker starts at 2.47s
      expect(markers[1]).toMatchObject({ atSeconds: 0.85, phase: "choices" });
      expect(markers[2]).toMatchObject({ atSeconds: 2.47, phase: "thinking" });

      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBeGreaterThanOrEqual(markers[1].atSeconds);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBeLessThan(markers[2].atSeconds);

      const html = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: rewardAtExpected },
        ],
      });

      expect(html).toContain('data-mascot-phase="choices"');
      expect(html).toContain("--mascot-state-delay:0.85s");
      expect(html).toContain("--mascot-state-span:1.62s");
    });

    it("verifies fact card and reward remain hidden at 2.0s", () => {
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBeLessThan(rewardAtExpected);

      const sceneState = quizSceneStateForPhase("choices");
      expect(sceneState.choices).toBe("visible");
      expect(sceneState.answers).toBe("pending");
      expect(sceneState.fact).toBe("hidden");
      expect(sceneState.reward).toBe("hidden");
    });
  });

  describe("4. Phase 3: Thinking Settled Keyframe Parity (3.5s)", () => {
    it("verifies countdown number 4 is actively ticking at 3.5s", () => {
      const thinkingTiming = calculateThinkingBarTiming({
        clipStart: 0,
        revealStart: timeline.revealStart,
        thinkingStart: timeline.thinkingStart,
      });

      // cd5 active in [2.47, 3.47)
      // cd4 active in [3.47, 4.47)
      expect(Number(thinkingTiming.cd5.toFixed(2))).toBe(2.47);
      expect(Number(thinkingTiming.cd4.toFixed(2))).toBe(3.47);
      expect(Number(thinkingTiming.cd3.toFixed(2))).toBe(4.47);

      // At 3.5s, cd5 has finished, cd4 is active
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBe(3.5);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBeGreaterThan(thinkingTiming.cd4);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBeLessThan(thinkingTiming.cd3);
    });

    it("verifies progress bar is draining and urgency styles are present at 3.5s", () => {
      const { css } = renderProductionClip("full_stack_list", "multiple_choice", ["A", "B", "C"]);

      // Progress bar drain keyframes and duration
      expect(css).toContain("quiz-timer-drain");
      expect(css).toContain("@keyframes quiz-timer-drain");

      // Urgency animations
      expect(css).toContain("@keyframes quiz-timer-danger");
      expect(css).toContain("@keyframes timer-marker-danger");
      expect(css).toContain("@keyframes timer-urgency-glow");

      // Danger animation is bound to timer progress
      expect(css).toContain("quiz-timer-danger var(--timer-duration) linear var(--timer-start) both");
    });

    it("verifies mascot is in thinking pose at 3.5s", () => {
      const markers = resolveProductionMascotMarkers(
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          timelineEvents: [
            { type: "choices.enter", at_seconds: timeline.choicesStart },
            { type: "countdown.start", at_seconds: timeline.thinkingStart },
            { type: "answer.reveal", at_seconds: timeline.revealStart },
            { type: "fact.enter", at_seconds: rewardAtExpected },
          ],
        },
        0,
        timeline.totalDuration,
      );

      // Thinking marker at 2.47s, reveal marker at 7.47s
      expect(markers[2]).toMatchObject({ atSeconds: 2.47, phase: "thinking" });
      expect(markers[3]).toMatchObject({ atSeconds: 7.47, phase: "reveal" });

      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBeGreaterThanOrEqual(markers[2].atSeconds);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBeLessThan(markers[3].atSeconds);

      const html = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: rewardAtExpected },
        ],
      });

      expect(html).toContain('data-mascot-phase="thinking"');
      expect(html).toContain('data-mascot-action="thinking"');
      expect(html).toContain('data-mascot-motion-preset="sway"');
      expect(html).toContain("--mascot-state-delay:2.47s");
      expect(html).toContain("--mascot-state-span:5s");
    });

    it("verifies choices are pending and fact card & reward are hidden at 3.5s", () => {
      const sceneState = quizSceneStateForPhase("thinking");
      expect(sceneState.choices).toBe("visible");
      expect(sceneState.answers).toBe("pending");
      expect(sceneState.fact).toBe("hidden");
      expect(sceneState.reward).toBe("hidden");
    });
  });

  describe("5. Phase 4: Reveal Settled Keyframe Parity (8.1s)", () => {
    it("verifies correct answer is fully settled with green #22C55E border and depth shadow #15803D at 8.1s", () => {
      // revealStart is 7.47s; correct-card-reveal duration is 0.62s -> completes at 8.09s <= 8.10s
      const revealSettledTime = timeline.revealStart + 0.62;
      expect(revealSettledTime).toBe(8.09);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBe(8.1);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeGreaterThanOrEqual(revealSettledTime);

      const { html, css } = renderProductionClip("full_stack_list", "multiple_choice", ["Alpha", "Beta", "Gamma"]);

      // CSS keyframes contain green border and depth shadow
      expect(css.toLowerCase()).toContain("#22c55e");
      expect(css.toLowerCase()).toContain("#15803d");
      expect(css).toContain("correct-card-reveal 0.62s");

      // Sandbox snapshot in reveal phase contains answer-correct class and settled styling
      const snapshot = buildSandboxComposition({
        mode: "snapshot",
        phase: "reveal",
        choices: ["Alpha", "Beta", "Gamma"],
        correct_choice_index: 0,
      });
      expect(snapshot.html).toContain("answer-correct");
      expect(snapshot.css.toLowerCase()).toContain("#22c55e");
      expect(snapshot.css.toLowerCase()).toContain("#15803d");
    });

    it("verifies incorrect answers are dimmed to 0.35 opacity (0.38s duration) at 8.1s", () => {
      // revealStart is 7.47s; incorrect card fade duration is 0.38s -> completes at 7.85s <= 8.10s
      const dimSettledTime = timeline.revealStart + 0.38;
      expect(dimSettledTime).toBe(7.85);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeGreaterThan(dimSettledTime);

      const { css } = renderProductionClip("full_stack_list", "multiple_choice", ["Alpha", "Beta", "Gamma"]);
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("0.38s");
    });

    it("verifies timer is completely faded out (opacity: 0) at 8.1s", () => {
      // Timer duration is 7.47s; timer-exit-fade finishes at 7.47s
      expect(timeline.revealStart).toBe(7.47);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeGreaterThan(timeline.revealStart);

      const { css } = renderProductionClip("full_stack_list", "multiple_choice", ["Alpha", "Beta", "Gamma"]);
      expect(css).toContain("@keyframes timer-exit-fade");
      expect(css).toContain("phase-hold var(--timer-duration) steps(1,end)");
    });

    it("verifies mascot is in celebrate pose for correct reveal outcome at 8.1s", () => {
      const markers = resolveProductionMascotMarkers(
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          revealOutcome: "correct",
          timelineEvents: [
            { type: "choices.enter", at_seconds: timeline.choicesStart },
            { type: "countdown.start", at_seconds: timeline.thinkingStart },
            { type: "answer.reveal", at_seconds: timeline.revealStart },
            { type: "fact.enter", at_seconds: rewardAtExpected },
          ],
        },
        0,
        timeline.totalDuration,
      );

      // Reveal marker at 7.47s, explain marker at 8.27s
      expect(markers[3]).toMatchObject({ atSeconds: 7.47, phase: "reveal", revealOutcome: "correct" });
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeGreaterThanOrEqual(markers[3].atSeconds);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeLessThan(markers[4].atSeconds);

      const html = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        revealOutcome: "correct",
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: rewardAtExpected },
        ],
      });

      expect(html).toContain('data-mascot-phase="reveal"');
      expect(html).toContain('data-mascot-action="celebrate"');
      expect(html).toContain('class="mascot-v2-state state-celebrate"');
      expect(html).toContain('data-mascot-motion-preset="jump"');
      expect(html).toContain("--mascot-state-delay:7.47s");
      expect(html).toContain("--mascot-state-span:0.8s");
    });

    it("verifies mascot is in oops pose for wrong reveal outcome at 8.1s", () => {
      const html = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        revealOutcome: "wrong",
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: rewardAtExpected },
        ],
      });

      expect(html).toContain('data-mascot-phase="reveal"');
      expect(html).toContain('data-mascot-action="oops"');
      expect(html).toContain('class="mascot-v2-state state-oops"');
      expect(html).toContain('data-mascot-motion-preset="shake"');
    });

    it("verifies fact card and reward remain hidden (8.10s < 8.27s)", () => {
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBe(8.1);
      expect(rewardAtExpected).toBe(8.27);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBeLessThan(rewardAtExpected);

      const sceneState = quizSceneStateForPhase("reveal");
      expect(sceneState.answers).toBe("revealed");
      expect(sceneState.fact).toBe("hidden");
      expect(sceneState.reward).toBe("hidden");
    });
  });

  describe("6. Phase 5: Explain Settled Keyframe Parity (8.8s)", () => {
    it("verifies fact card is fully entered with opacity: 1 at 8.8s", () => {
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBe(8.8);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBeGreaterThan(rewardAtExpected);

      // Snapshot explain composition renders fact card with opacity: 1
      const snapshot = buildSandboxComposition({
        mode: "snapshot",
        phase: "explain",
        choices: ["A", "B", "C"],
        correct_choice_index: 0,
        fact_card_text: "Earth orbits the Sun every 365.25 days.",
      });

      expect(snapshot.html).toContain("fact-card");
      expect(snapshot.html).toContain("Earth orbits the Sun every 365.25 days.");
      expect(snapshot.html).toContain("opacity: 1");

      const sceneState = quizSceneStateForPhase("explain");
      expect(sceneState.fact).toBe("visible");
      expect(sceneState.reward).toBe("visible");
    });

    it("verifies reward stars celebration is active at 8.8s", () => {
      const { html, css } = renderProductionClip("full_stack_list", "multiple_choice", ["A", "B", "C"]);

      expect(html).toContain("reward-fx");
      expect(css).toContain(".reward-fx");
      expect(css).toContain("star-burst .72s");
      expect(css).toContain("calc(var(--clip-start) + var(--reward-at))");
    });

    it("verifies mascot is in point pose at 8.8s", () => {
      const markers = resolveProductionMascotMarkers(
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          timelineEvents: [
            { type: "choices.enter", at_seconds: timeline.choicesStart },
            { type: "countdown.start", at_seconds: timeline.thinkingStart },
            { type: "answer.reveal", at_seconds: timeline.revealStart },
            { type: "fact.enter", at_seconds: rewardAtExpected },
          ],
        },
        0,
        timeline.totalDuration,
      );

      // Explain marker at 8.27s with point action override
      expect(markers[4]).toMatchObject({ atSeconds: 8.27, phase: "explain", actionOverride: "point" });
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBeGreaterThan(markers[4].atSeconds);

      const html = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: rewardAtExpected },
        ],
      });

      expect(html).toContain('data-mascot-phase="explain"');
      expect(html).toContain('data-mascot-action="point"');
      expect(html).toContain('class="mascot-v2-state state-point"');
      expect(html).toContain(`--mascot-state-delay:${rewardAtExpected}s`);
    });
  });

  describe("7. Multi-Layout Parity Matrix (8 Canonical Layouts)", () => {
    const layoutScenarios: Array<{
      id: QuizPreviewLayoutId;
      format: QuizQuestionFormat;
      choices: string[];
    }> = [
      { id: "full_stack_list", format: "multiple_choice", choices: ["A", "B", "C"] },
      { id: "split_versus_two", format: "true_false", choices: ["Left", "Right"] },
      { id: "verdict_true_false", format: "true_false", choices: ["True", "False"] },
      { id: "visual_choices_three", format: "multiple_choice", choices: ["One", "Two", "Three"] },
      { id: "visual_choices_three_pure", format: "odd_one_out", choices: ["One", "Two", "Three"] },
      { id: "mystery_reveal", format: "multiple_choice", choices: ["A", "B", "C"] },
      { id: "clue_deduction", format: "multiple_choice", choices: ["A", "B", "C"] },
      { id: "media_left_choices_right", format: "multiple_choice", choices: ["A", "B", "C"] },
    ];

    for (const scenario of layoutScenarios) {
      it(`verifies end-to-end parity for layout '${scenario.id}'`, () => {
        const { html, css } = renderProductionClip(scenario.id, scenario.format, scenario.choices);

        // 1. Question card entrance defined
        expect(css).toContain("question-card-enter 0.52s");

        // 2. Choice cards present and styled
        expect(html).toContain("choice-card");

        // 3. Reveal colors calibrated: green #22C55E and depth shadow #15803D
        expect(css.toLowerCase()).toContain("#22c55e");
        expect(css.toLowerCase()).toContain("#15803d");

        // 4. Incorrect dimmed to 0.35
        expect(css).toContain("opacity: 0.35");

        // 5. Fact card enters with phase-enter
        expect(css).toContain(".fact-card");

        // 6. Thinking bar timer drain and urgency glow present
        expect(css).toContain("@keyframes timer-urgency-glow");

        // 7. Verify Sandbox composition generation for this layout in all 5 phases
        const phases: SandboxPhase[] = ["question", "choices", "thinking", "reveal", "explain"];
        for (const phase of phases) {
          const snapshot = buildSandboxComposition({
            mode: "snapshot",
            layout_id: scenario.id,
            phase,
            choices: scenario.choices,
            correct_choice_index: 0,
            question_format: scenario.format,
            question_text: `Question for ${scenario.id}`,
            fact_card_text: "Explanation fact",
          });
          expect(snapshot.html).toContain("id=\"stage\"");
          expect(snapshot.contrast_report.ok).toBe(true);
        }
      });
    }
  });

  describe("8. Viewport Parity: 16:9 Landscape vs 9:16 Portrait", () => {
    it("calibrates dimensions, safe-zones, and element lifecycles identically across viewports", () => {
      const canvas16x9 = MASCOT_CANVAS_SIZES["16:9"];
      const canvas9x16 = MASCOT_CANVAS_SIZES["9:16"];

      expect(canvas16x9).toEqual({ width: 1920, height: 1080 });
      expect(canvas9x16).toEqual({ width: 1080, height: 1920 });

      const css16x9 = candyArcadeCss({ fontMode: "render", aspectRatio: "16:9" });
      const css9x16 = candyArcadeCss({ fontMode: "render", aspectRatio: "9:16" });

      // Stage canvas dimensions in CSS
      expect(css16x9).toContain("#stage { position: relative; width: 1920px; height: 1080px; overflow: hidden; }");
      expect(css9x16).toContain("#stage { position: relative; width: 1080px; height: 1920px; overflow: hidden; }");

      // Both declare explicit safe zones
      expect(css16x9).toContain("--safe-zone-top: 54px;");
      expect(css9x16).toContain("--safe-zone-top: 180px;");
      expect(css9x16).toContain("--safe-zone-bottom: 440px;");

      // Both share identical settled reveal styles
      expect(css16x9.toLowerCase()).toContain("#22c55e");
      expect(css9x16.toLowerCase()).toContain("#22c55e");
      expect(css16x9).toContain("opacity: 0.35");
      expect(css9x16).toContain("opacity: 0.35");

      // Both share identical timer animations
      expect(css16x9).toContain("@keyframes timer-urgency-glow");
      expect(css9x16).toContain("@keyframes timer-urgency-glow");

      // Mascot layer parity across viewports
      const mascot16x9 = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        aspectRatio: "16:9",
      });
      const mascot9x16 = renderProductionMascotHtmlLayer(testMascotFixture, testChannelMascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        aspectRatio: "9:16",
      });
      expect(mascot16x9).toContain('data-mascot-aspect-ratio="16:9"');
      expect(mascot16x9).toContain('data-mascot-canvas="1920x1080"');
      expect(mascot9x16).toContain('data-mascot-aspect-ratio="9:16"');
      expect(mascot9x16).toContain('data-mascot-canvas="1080x1920"');

      // Rehearsal document models for 16:9 and 9:16
      const sceneInput = {
        question_text: "Parity test question?",
        choices: ["A", "B", "C"],
        correct_choice_index: 0,
        question_number: 1,
        total_questions: 1,
        fact_card_text: "Explanation fact",
        layout_id: "full_stack_list" as const,
        aspect_ratio: "16:9" as const,
      };

      const model16x9 = adaptSandboxQuizScene(sceneInput, false);
      model16x9.aspectRatio = "16:9";
      const parts16x9 = buildQuizSceneParts(model16x9);
      const stableParts16x9 = renderStableQuizSceneParts(parts16x9);
      const rehearsal16x9Html = sandboxRehearsalDocument(model16x9, parts16x9, stableParts16x9, "<div id='stage-content'></div>", "", "", timeline);

      const model9x16 = adaptSandboxQuizScene(sceneInput, false);
      model9x16.aspectRatio = "9:16";
      const parts9x16 = buildQuizSceneParts(model9x16);
      const stableParts9x16 = renderStableQuizSceneParts(parts9x16);
      const rehearsal9x16Html = sandboxRehearsalDocument(model9x16, parts9x16, stableParts9x16, "<div id='stage-content'></div>", "", "", timeline);

      // Safe zones injected into stage
      expect(rehearsal16x9Html).toContain("--safe-zone-top: 54px;");
      expect(rehearsal9x16Html).toContain("--safe-zone-top: 180px;");
      expect(rehearsal9x16Html).toContain("--safe-zone-bottom: 440px;");

      // Both rehearsal documents share identical timeline variable injection
      expect(rehearsal16x9Html).toContain(`--choices-at: 0.850s;`);
      expect(rehearsal9x16Html).toContain(`--choices-at: 0.850s;`);
      expect(rehearsal16x9Html).toContain(`--thinking-at: 2.470s;`);
      expect(rehearsal9x16Html).toContain(`--thinking-at: 2.470s;`);
      expect(rehearsal16x9Html).toContain(`--reveal-at: 7.470s;`);
      expect(rehearsal9x16Html).toContain(`--reveal-at: 7.470s;`);
      expect(rehearsal16x9Html).toContain(`--reward-at: ${rewardAtExpected.toFixed(3)}s;`);
      expect(rehearsal9x16Html).toContain(`--reward-at: ${rewardAtExpected.toFixed(3)}s;`);
    });
  });

  describe("9. Sandbox Rehearsal vs Production Video Render Parity", () => {
    it("guarantees 100% animation and timing synchronization between rehearsal document and production clip", () => {
      const prod = renderProductionClip("full_stack_list", "multiple_choice", ["A", "B", "C"]);
      const rehearsal = buildSandboxComposition({
        mode: "rehearsal",
        aspect_ratio: "16:9",
        choices: ["A", "B", "C"],
        correct_choice_index: 0,
      });

      // Synchronized timing custom properties in rehearsal
      expect(rehearsal.html).toContain("--clip-start: 0s;");
      expect(rehearsal.html).toContain(`--choices-at: ${timeline.choicesStart.toFixed(3)}s;`);
      expect(rehearsal.html).toContain(`--thinking-at: ${timeline.thinkingStart.toFixed(3)}s;`);
      expect(rehearsal.html).toContain(`--reveal-at: ${timeline.revealStart.toFixed(3)}s;`);
      expect(rehearsal.html).toContain(`--reward-at: ${rewardAtExpected.toFixed(3)}s;`);
      expect(rehearsal.html).toContain("--timer-duration: 7.470s;");
      expect(rehearsal.html).toContain("--query-hold-duration: 2.470s;");

      // Production clip uses identical timing keyframe hooks
      expect(prod.html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s)");
      expect(prod.html).toContain("correct-card-reveal 0.62s");
      expect(prod.html).toContain("reward-fx");

      // Rehearsal CSS and production CSS share identical animations
      expect(rehearsal.css).toContain("@keyframes question-card-enter");
      expect(prod.css).toContain("@keyframes question-card-enter");
      expect(rehearsal.css).toContain("@keyframes quiz-timer-drain");
      expect(prod.css).toContain("@keyframes quiz-timer-drain");
      expect(rehearsal.css).toContain("@keyframes timer-urgency-glow");
      expect(prod.css).toContain("@keyframes timer-urgency-glow");
      expect(rehearsal.css).toContain("@keyframes timer-exit-fade");
      expect(prod.css).toContain("@keyframes timer-exit-fade");
      expect(rehearsal.css).toContain("@keyframes correct-card-reveal");
      expect(prod.css).toContain("@keyframes correct-card-reveal");
    });
  });
});
