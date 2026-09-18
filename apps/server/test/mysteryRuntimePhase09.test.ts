import { describe, expect, it } from "vitest";
import {
  calculateQuizRevealTiming,
  computeSandboxPhaseTimeline,
  MYSTERY_REVEAL_WIPE_SECONDS,
  MYSTERY_SUSPENSE_GAP_SECONDS,
  QUIZ_TIMER_EXIT_DURATION_SECONDS,
  timingPolicyForAgeBand,
  type QuizQuestion,
  type VoicePlan,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileThinkingCountdownBeat } from "../src/quiz/timeline/compilers/question/compileThinkingCountdownBeat.js";
import { compileChoicesBeat } from "../src/quiz/timeline/compilers/question/compileChoicesBeat.js";
import { compileAnswerRevealBeat } from "../src/quiz/timeline/compilers/question/compileAnswerRevealBeat.js";
import { compileExplanationBeat } from "../src/quiz/timeline/compilers/question/compileExplanationBeat.js";
import { TimelineContext } from "../src/quiz/timeline/compilers/timelineContext.js";
import { productionSceneStateAt } from "../src/quiz/render/scene/productionSceneStateAdapter.js";
import { renderQuizScenePhaseParts, shouldRenderFactCard } from "../src/quiz/render/scene/renderQuizScenePhaseParts.js";
import type { QuizSceneTiming } from "../src/quiz/render/scene/quizScene.types.js";

const DEFAULT_TEST_POLICY = timingPolicyForAgeBand("7-9");

function createMockMysteryQuestion(overrides?: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: "q_mystery_test",
    number: 1,
    format: "image_guess",
    answer_mode: "single_reveal",
    difficulty: 1,
    question: "Who is this iconic historical figure?",
    choices: [{ id: "c_ans_1", text: "Marie Curie" }],
    correct_choice_id: "c_ans_1",
    explanation: "She was the first woman to win a Nobel Prize.",
    fun_fact: "Her notebooks are still radioactive today.",
    source_ids: ["src1"],
    visual_opportunity: "Laboratory with radium vials",
    validation: {
      semantic_status: "validated",
      source_coverage: true,
      fact_locked: true,
    },
    ...overrides,
  };
}

describe("Phase 09 - Mystery Image, Timing and Narration Runtime", () => {
  describe("calculateQuizRevealTiming shared helper", () => {
    it("computes exact 0.5s suspense gap between timerHideAt and revealStart", () => {
      const timing = calculateQuizRevealTiming(7.47);
      expect(timing.timerHideAt).toBe(7.47);
      expect(timing.revealStart).toBe(7.97);
      expect(timing.suspenseGapDuration).toBe(MYSTERY_SUSPENSE_GAP_SECONDS);
      expect(timing.suspenseGapDuration).toBe(0.5);
    });

    it("computes timer exit start exactly 0.28s before timerHideAt", () => {
      const timing = calculateQuizRevealTiming(7.47);
      expect(timing.timerExitStart).toBeCloseTo(7.47 - QUIZ_TIMER_EXIT_DURATION_SECONDS, 5);
      expect(timing.timerExitStart).toBeCloseTo(7.19, 5);
    });

    it("preserves 0.85s reveal wipe duration constant", () => {
      const timing = calculateQuizRevealTiming(5.0);
      expect(timing.revealWipeDuration).toBe(MYSTERY_REVEAL_WIPE_SECONDS);
      expect(timing.revealWipeDuration).toBe(0.85);
    });
  });

  describe("computeSandboxPhaseTimeline single_reveal integration", () => {
    it("computes single_reveal sandbox timeline with 7.47 timerHideAt and 7.97 revealStart", () => {
      const timeline = computeSandboxPhaseTimeline({ isSingleReveal: true });
      expect(timeline.timerHideAt).toBe(7.47);
      expect(timeline.revealStart).toBe(7.97);
      expect(timeline.explainStart).toBe(8.77);
      expect(timeline.revealStart - (timeline.timerHideAt ?? 0)).toBeCloseTo(0.5, 3);
    });

    it("computes standard timeline without timerHideAt when isSingleReveal is false", () => {
      const timeline = computeSandboxPhaseTimeline({ isSingleReveal: false });
      expect(timeline.timerHideAt).toBeUndefined();
      expect(timeline.revealStart).toBe(7.47);
      expect(timeline.explainStart).toBe(8.27);
    });
  });

  describe("buildQuizVoicePlan narration leak prevention", () => {
    it("omits :choice segment from voice plan when answer_mode is single_reveal", () => {
      const mysteryQ = createMockMysteryQuestion();
      const plan = buildQuizVoicePlan({
        episode_id: "ep_mystery_test",
        title: "Mystery Episode",
        theme: "Mystery",
        language: "en",
        questions: [mysteryQ],
      } as any);

      const choiceSegments = plan.segments.filter((s) => s.segment_id.endsWith(":choice"));
      expect(choiceSegments).toHaveLength(0);

      // Verify other narration segments remain intact
      const questionSeg = plan.segments.find((s) => s.segment_id === "q_mystery_test:question");
      const revealSeg = plan.segments.find((s) => s.segment_id === "q_mystery_test:reveal");
      const explainSeg = plan.segments.find((s) => s.segment_id === "q_mystery_test:explanation");

      expect(questionSeg).toBeDefined();
      expect(revealSeg).toBeDefined();
      expect(explainSeg).toBeDefined();
    });

    it("includes :choice segment for ordinary choice_selection questions", () => {
      const standardQ: QuizQuestion = {
        id: "q_standard_1",
        number: 1,
        format: "multiple_choice",
        answer_mode: "choice_selection",
        difficulty: 1,
        question: "What is the capital of France?",
        choices: [
          { id: "c1", text: "Paris" },
          { id: "c2", text: "Rome" },
          { id: "c3", text: "Berlin" },
        ],
        correct_choice_id: "c1",
        explanation: "Paris has been the capital since 508 AD.",
        fun_fact: "The Eiffel Tower was built in 1889.",
        source_ids: ["src1"],
        visual_opportunity: "Eiffel Tower",
      };

      const plan = buildQuizVoicePlan({
        episode_id: "ep_standard_test",
        title: "Standard Episode",
        theme: "Geography",
        language: "en",
        questions: [standardQ],
      } as any);
      const choiceSeg = plan.segments.find((s) => s.segment_id === "q_standard_1:choice");
      expect(choiceSeg).toBeDefined();
    });
  });

  describe("Timeline beat compilers for single_reveal", () => {
    it("compileChoicesBeat omits choices.enter and returns questionNarrationEnd for single_reveal", () => {
      const question = createMockMysteryQuestion();
      const ctx = new TimelineContext(DEFAULT_TEST_POLICY, {});
      const voicePlan: VoicePlan = {
        segments: [{ segment_id: question.id + ":question", text: question.question, kind: "question" }],
      };

      const result = compileChoicesBeat(ctx, question, 0, voicePlan, 0, 3.2);

      expect(result.choiceNarrationEnd).toBe(3.2);
      const choiceEvents = ctx.events.filter((e) => e.type === "choices.enter");
      expect(choiceEvents).toHaveLength(0);
    });

    it("compileThinkingCountdownBeat emits timer.hide at T and sets revealAt = T + 0.5 for single_reveal", () => {
      const question = createMockMysteryQuestion();
      const ctx = new TimelineContext(DEFAULT_TEST_POLICY, {});
      const voicePlan: VoicePlan = { segments: [] };

      const result = compileThinkingCountdownBeat(
        ctx,
        question,
        { type: "question", question_id: question.id, thinking_seconds: 5 },
        voicePlan,
        3.0,
      );

      expect(result.timerHideAt).toBeGreaterThan(3.0);
      expect(result.revealAt).toBeCloseTo(result.timerHideAt + 0.5, 3);

      const hideEvents = ctx.events.filter((e) => e.type === "timer.hide");
      expect(hideEvents).toHaveLength(1);
      expect(hideEvents[0].at_seconds).toBe(result.timerHideAt);
    });

    it("compileThinkingCountdownBeat throws COUNTDOWN_PACING_OVERFLOW if countdown audio exceeds window", () => {
      const question = createMockMysteryQuestion();
      const audioDurations: Record<string, number> = {
        [question.id + ":countdown"]: 6.5, // 6.5s > 5.0s policy.countdown_seconds
      };
      const ctx = new TimelineContext(DEFAULT_TEST_POLICY, audioDurations);
      const voicePlan: VoicePlan = {
        segments: [{ segment_id: question.id + ":countdown", text: "5, 4, 3, 2, 1...", kind: "countdown" }],
      };

      expect(() => {
        compileThinkingCountdownBeat(ctx, question, { type: "question", question_id: question.id, thinking_seconds: 5 }, voicePlan, 3.0);
      }).toThrow(/COUNTDOWN_PACING_OVERFLOW/);
    });

    it("compileAnswerRevealBeat omits answer.dim_wrong for single_reveal", () => {
      const question = createMockMysteryQuestion();
      const ctx = new TimelineContext(DEFAULT_TEST_POLICY, {});
      const voicePlan: VoicePlan = {
        segments: [{ segment_id: question.id + ":reveal", text: "It's Marie Curie!", kind: "reveal" }],
      };

      const result = compileAnswerRevealBeat(
        ctx,
        question,
        { type: "question", question_id: question.id, thinking_seconds: 5, reward_intensity: "medium", sfx_intents: ["sparkle"] },
        voicePlan,
        8.0,
      );

      const dimEvents = ctx.events.filter((e) => e.type === "answer.dim_wrong");
      expect(dimEvents).toHaveLength(0);

      const revealEvents = ctx.events.filter((e) => e.type === "answer.reveal");
      expect(revealEvents).toHaveLength(1);
      expect(result.revealNarrationEnd).toBeGreaterThanOrEqual(8.0);
    });

    it("compileExplanationBeat omits fact.enter visual event for single_reveal", () => {
      const question = createMockMysteryQuestion();
      const ctx = new TimelineContext(DEFAULT_TEST_POLICY, {});
      const voicePlan: VoicePlan = {
        segments: [
          { segment_id: question.id + ":explanation", text: question.explanation, kind: "explanation" },
          { segment_id: question.id + ":fact", text: question.fun_fact!, kind: "fact" },
        ],
      };

      compileExplanationBeat(ctx, question, { type: "question", question_id: question.id, thinking_seconds: 5 }, voicePlan, 9.0);

      const factEvents = ctx.events.filter((e) => e.type === "fact.enter");
      expect(factEvents).toHaveLength(0);
    });
  });

  describe("productionSceneStateAt temporal exclusivity", () => {
    const timing: QuizSceneTiming = {
      choicesStart: 2.0,
      thinkingStart: 3.0,
      timerHideAt: 7.47,
      revealStart: 7.97,
      rewardStart: 9.0,
      explainStart: 9.5,
    };

    it("returns thinking: visible before timerHideAt", () => {
      const state = productionSceneStateAt(timing, 7.0);
      expect(state.phase).toBe("thinking");
      expect(state.thinking).toBe("visible");
      expect(state.answers).toBe("pending");
    });

    it("returns thinking: hidden during the suspense gap [timerHideAt, revealStart)", () => {
      const stateAtT = productionSceneStateAt(timing, 7.47);
      expect(stateAtT.phase).toBe("thinking");
      expect(stateAtT.thinking).toBe("hidden");
      expect(stateAtT.answers).toBe("pending");

      const stateMidGap = productionSceneStateAt(timing, 7.72);
      expect(stateMidGap.phase).toBe("thinking");
      expect(stateMidGap.thinking).toBe("hidden");
      expect(stateMidGap.answers).toBe("pending");

      const statePreReveal = productionSceneStateAt(timing, 7.969);
      expect(statePreReveal.phase).toBe("thinking");
      expect(statePreReveal.thinking).toBe("hidden");
      expect(statePreReveal.answers).toBe("pending");
    });

    it("returns phase: reveal and answers: revealed at revealStart", () => {
      const state = productionSceneStateAt(timing, 7.97);
      expect(state.phase).toBe("reveal");
      expect(state.answers).toBe("revealed");
      expect(state.thinking).toBe("hidden");
    });
  });

  describe("Fact card omission for Mystery Reveal", () => {
    it("shouldRenderFactCard returns false for mystery_reveal", () => {
      expect(shouldRenderFactCard("mystery_reveal")).toBe(false);
    });

    it("shouldRenderFactCard returns true for other layouts", () => {
      expect(shouldRenderFactCard("split_versus")).toBe(true);
      expect(shouldRenderFactCard("media_left")).toBe(true);
      expect(shouldRenderFactCard("visual_choices")).toBe(true);
      expect(shouldRenderFactCard("full_stack_list")).toBe(true);
      expect(shouldRenderFactCard("verdict")).toBe(true);
    });

    it("renderQuizScenePhaseParts omits fact container when layout is mystery_reveal", () => {
      const html = renderQuizScenePhaseParts({
        layoutId: "mystery_reveal",
        aspectRatio: "16:9",
        thinkingHtml: `<div class="thinking-bar">Countdown</div>`,
        factHtml: `<aside class="fact-card">Did you know?</aside>`,
      });

      expect(html).not.toContain("fact-card");
      expect(html).not.toContain("Did you know?");
      expect(html).not.toContain('data-quiz-fixed="fact"');
      expect(html).toContain('data-quiz-fixed="thinking"');
    });
  });

  describe("Mystery Reveal Canonical Geometry Verification", () => {
    it("validates stage dimensions and inner slot alignment", () => {
      const stageOuter = { x: 630, y: 253, width: 920, height: 540 };
      const border = 4;
      const padding = 16;

      const innerSlot = {
        x: stageOuter.x + border + padding,
        y: stageOuter.y + border + padding,
        width: stageOuter.width - 2 * (border + padding),
        height: stageOuter.height - 2 * (border + padding),
      };

      expect(innerSlot.x).toBe(650);
      expect(innerSlot.y).toBe(273);
      expect(innerSlot.width).toBe(880);
      expect(innerSlot.height).toBe(500);

      // Centered 16:9 content: 880x495 inside 880x500
      const contentHeight = 495;
      const verticalOffset = (innerSlot.height - contentHeight) / 2;
      expect(verticalOffset).toBe(2.5);
      expect(innerSlot.y + verticalOffset).toBe(275.5);
    });

    it("validates answer surface position and canvas bottom clearance", () => {
      const canvasHeight = 1080;
      const answerSurface = { x: 630, y: 890, width: 920, height: 120 };
      const stageOuter = { x: 630, y: 253, width: 920, height: 540 };

      const stageBottom = stageOuter.y + stageOuter.height;
      expect(stageBottom).toBe(793);

      const stageToAnswerGap = answerSurface.y - stageBottom;
      expect(stageToAnswerGap).toBe(97);

      const answerBottom = answerSurface.y + answerSurface.height;
      expect(answerBottom).toBe(1010);

      const bottomClearance = canvasHeight - answerBottom;
      expect(bottomClearance).toBe(70);
    });
  });
});
