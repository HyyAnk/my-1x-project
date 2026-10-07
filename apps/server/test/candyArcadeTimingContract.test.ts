import { describe, expect, it } from "vitest";
import type { QuizSceneTiming } from "../src/quiz/render/scene/quizScene.types.js";
import type { ProductionMascotTimelineEvent } from "../src/quiz/render/productionMascotRenderer.js";
import {
  assertZeroBasedTiming,
  normalizeMascotTimelineEventsToZeroBased,
  normalizeSceneTimingToZeroBased,
  roundTimingSeconds,
  toZeroBasedDuration,
  toZeroBasedOffset,
} from "../src/quiz/render/candyArcade/candyArcadeTiming.js";
import {
  outroClip,
  preOutroClip,
  questionClip,
  quizCopy,
  sanitizeSubCompositionRootStyle,
  subCompositionMount,
  toSubComposition,
} from "../src/quiz/render/candyArcade/candyArcadeClips.js";
import { resolveQuizLayout } from "@studio/shared";

describe("Candy Arcade Timing Contract & Zero-Based Normalization", () => {
  describe("roundTimingSeconds", () => {
    it("rounds numbers to 3 decimal places without IEEE-754 precision drift", () => {
      expect(roundTimingSeconds(0.1 + 0.2)).toBe(0.3);
      expect(roundTimingSeconds(14.800000000000002)).toBe(14.8);
      expect(roundTimingSeconds(23.650000000000006)).toBe(23.65);
    });
  });

  describe("toZeroBasedOffset", () => {
    it("calculates relative non-negative offset from clip start", () => {
      expect(toZeroBasedOffset(28.51, 26.01)).toBe(2.5);
      expect(toZeroBasedOffset(26.01, 26.01)).toBe(0);
      expect(toZeroBasedOffset(41.76, 26.01)).toBe(15.75);
    });

    it("clamps negative relative offsets to 0", () => {
      expect(toZeroBasedOffset(20.0, 26.01)).toBe(0);
      expect(toZeroBasedOffset(-5.0, 10.0)).toBe(0);
    });
  });

  describe("toZeroBasedDuration", () => {
    it("calculates positive duration between end and start", () => {
      expect(toZeroBasedDuration(49.66, 26.01)).toBe(23.65);
      expect(toZeroBasedDuration(16.58, 8.0)).toBe(8.58);
    });

    it("enforces default minimum duration of 0.04s for zero or negative spans", () => {
      expect(toZeroBasedDuration(10.0, 10.0)).toBe(0.04);
      expect(toZeroBasedDuration(8.0, 10.0)).toBe(0.04);
      expect(toZeroBasedDuration(10.01, 10.0)).toBe(0.04);
    });

    it("respects custom minimum duration constraint", () => {
      expect(toZeroBasedDuration(10.0, 10.0, 0.5)).toBe(0.5);
    });
  });

  describe("normalizeSceneTimingToZeroBased", () => {
    it("transforms global question timestamps into zero-anchored local timings", () => {
      const globalQuestionTiming: QuizSceneTiming = {
        countdownSeconds: 5,
        start: 26.01,
        questionNarrationStart: 26.51,
        choicesStart: 28.51,
        thinkingStart: 26.01,
        timerHideAt: 41.76,
        revealStart: 41.76,
        rewardStart: 42.56,
        end: 49.66,
      };

      const normalized = normalizeSceneTimingToZeroBased(globalQuestionTiming);

      expect(normalized.start).toBe(0);
      expect(normalized.countdownSeconds).toBe(5);
      expect(normalized.questionNarrationStart).toBe(0.5);
      expect(normalized.choicesStart).toBe(2.5);
      expect(normalized.thinkingStart).toBe(0);
      expect(normalized.timerHideAt).toBe(15.75);
      expect(normalized.revealStart).toBe(15.75);
      expect(normalized.rewardStart).toBe(16.55);
      expect(normalized.end).toBe(23.65);

      expect(() => assertZeroBasedTiming(normalized)).not.toThrow();
    });

    it("leaves optional undefined fields as undefined", () => {
      const minimalTiming: QuizSceneTiming = {
        start: 16.58,
        choicesStart: 18.0,
        thinkingStart: 16.58,
        revealStart: 24.0,
        rewardStart: 24.0,
        end: 26.01,
      };

      const normalized = normalizeSceneTimingToZeroBased(minimalTiming);

      expect(normalized.start).toBe(0);
      expect(normalized.questionNarrationStart).toBeUndefined();
      expect(normalized.timerHideAt).toBeUndefined();
      expect(normalized.countdownSeconds).toBeUndefined();
      expect(normalized.end).toBe(9.43);
    });
  });

  describe("normalizeMascotTimelineEventsToZeroBased", () => {
    it("shifts mascot event timestamps by clipStartSeconds", () => {
      const events: ProductionMascotTimelineEvent[] = [
        { type: "choices.enter", at_seconds: 28.51 },
        { type: "countdown.start", at_seconds: 26.01 },
        { type: "answer.reveal", at_seconds: 41.76, payload: { outcome: "correct" } },
        { type: "mascot.state", at_seconds: 42.0, payload: { state: "celebrate" } },
      ];

      const normalized = normalizeMascotTimelineEventsToZeroBased(events, 26.01);

      expect(normalized).toHaveLength(4);
      expect(normalized[0]).toEqual({ type: "choices.enter", at_seconds: 2.5 });
      expect(normalized[1]).toEqual({ type: "countdown.start", at_seconds: 0 });
      expect(normalized[2]).toEqual({
        type: "answer.reveal",
        at_seconds: 15.75,
        payload: { outcome: "correct" },
      });
      expect(normalized[3]).toEqual({
        type: "mascot.state",
        at_seconds: 15.99,
        payload: { state: "celebrate" },
      });
    });

    it("handles undefined or empty mascot events list gracefully", () => {
      expect(normalizeMascotTimelineEventsToZeroBased(undefined, 10.0)).toEqual([]);
      expect(normalizeMascotTimelineEventsToZeroBased([], 10.0)).toEqual([]);
    });

    it("clamps events before clip start to 0", () => {
      const earlyEvents: ProductionMascotTimelineEvent[] = [
        { type: "countdown.start", at_seconds: 20.0 },
      ];

      const normalized = normalizeMascotTimelineEventsToZeroBased(earlyEvents, 26.01);
      expect(normalized[0]?.at_seconds).toBe(0);
    });
  });

  describe("assertZeroBasedTiming", () => {
    it("passes for valid zero-anchored timing", () => {
      const valid: QuizSceneTiming = {
        start: 0,
        choicesStart: 2.5,
        thinkingStart: 0,
        revealStart: 15.75,
        rewardStart: 15.75,
        end: 23.65,
      };
      expect(() => assertZeroBasedTiming(valid)).not.toThrow();
    });

    it("throws if start is non-zero", () => {
      const invalid: QuizSceneTiming = {
        start: 26.01,
        choicesStart: 2.5,
        thinkingStart: 0,
        revealStart: 15.75,
        rewardStart: 15.75,
        end: 23.65,
      };
      expect(() => assertZeroBasedTiming(invalid)).toThrow(
        /Zero-based timing invariant violation: clip start must be 0/,
      );
    });

    it("throws if duration is non-positive", () => {
      const invalid: QuizSceneTiming = {
        start: 0,
        choicesStart: 2.5,
        thinkingStart: 0,
        revealStart: 15.75,
        rewardStart: 15.75,
        end: 0,
      };
      expect(() => assertZeroBasedTiming(invalid)).toThrow(
        /Zero-based timing invariant violation: offsets and duration must be non-negative/,
      );
    });
  });

  describe("Phase 3 Gameplay Scene Zero-Based Subcomposition Invariants", () => {
    it("renders questionClip with zero-based CSS variables while maintaining outer data-start and data-duration", () => {
      const sampleQuestion = {
        id: "q-body-sensor",
        number: 2,
        format: "multiple_choice" as const,
        difficulty: 1,
        question: "Which organ pumps blood throughout the human body?",
        choices: [
          { id: "c1", text: "Heart" },
          { id: "c2", text: "Lungs" },
          { id: "c3", text: "Brain" },
        ],
        correct_choice_id: "c1",
        explanation: "The heart pumps oxygenated blood.",
        fun_fact: "The heart beats over 100,000 times a day!",
        source_ids: ["S1"],
        visual_opportunity: "Heart illustration",
      };
      const resolution = resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "multiple_choice",
        questionFormat: "multiple_choice",
        choiceCount: 3,
        answerMode: "choice_selection",
      });
      expect(resolution.ok).toBe(true);
      if (!resolution.ok) return;

      const html = questionClip({
        start: 26.01,
        choicesStart: 28.51,
        thinkingStart: 26.01,
        timerHideAt: 41.76,
        revealStart: 41.76,
        rewardStart: 42.56,
        end: 49.66,
        question: sampleQuestion,
        archetype: "multiple_choice",
        layoutResolution: resolution,
        questionIndex: 1,
        count: 3,
        visual: {
          palette: {
            id: "lime",
            name: "Lime",
            primary: "#00ff00",
            secondary: "#ffffff",
            accent: "#ffff00",
            dark: "#003300",
            light: "#ccffcc",
            surface: "#006600",
            card: "#009900",
            ink: "#000000",
          },
          motionId: "enter.pop",
          transitionId: "bubble_splash",
        },
        copy: quizCopy("en"),
        assets: {},
        isFinal: false,
      });

      // Outer section must preserve master episode bounds for toSubComposition
      expect(html).toContain('data-start="26.010"');
      expect(html).toContain('data-duration="23.650"');

      // Inner style must be strictly zero-based for sub-composition local timeline
      expect(html).toContain("--clip-start:0s;");
      expect(html).toContain("--timer-start:0.000s;");
      expect(html).toContain("--choices-at:2.500s;");
      expect(html).toContain("--reveal-at:15.750s;");
      expect(html).toContain("--reward-at:16.550s;");
      expect(html).toContain("--scene-duration:23.650s;");

      // Strictly must NOT leak global timestamps into CSS variables
      expect(html).not.toContain("--clip-start:26.010s");
      expect(html).not.toContain("--timer-start:26.010s");
      expect(html).not.toContain("--choices-at:28.510s");
      expect(html).not.toContain("--reveal-at:41.760s");
    });

    it("renders preOutroClip with --clip-start: 0s; and valid outer timeline bounds", () => {
      const html = preOutroClip({
        start: 49.66,
        duration: 3.5,
        headline: "FANTASTIC JOB!",
      });

      expect(html).toContain('data-start="49.660"');
      expect(html).toContain('data-duration="3.500"');
      expect(html).toContain("--clip-start: 0s;");
      expect(html).not.toContain("--clip-start: 49.660s");
    });

    it("renders outroClip with --clip-start: 0s; and valid outer timeline bounds", () => {
      const html = outroClip(53.16, 60.0, 3, quizCopy("en"));

      expect(html).toContain('data-start="53.160"');
      expect(html).toContain('data-duration="6.840"');
      expect(html).toContain("--clip-start: 0s;");
      expect(html).not.toContain("--clip-start: 53.160s");
    });
  });

  describe("Phase 4 Sub-Composition Packaging Defense-in-Depth & Fail-Safe Sanitizer", () => {
    it("sanitizes leaked global --clip-start in existing style attribute to --clip-start: 0s;", () => {
      const opening = '<section id="q-leak" class="clip" style="--question-size:56px;--clip-start:26.010s;--timer-start:0s;">';
      const sanitized = sanitizeSubCompositionRootStyle(opening);
      expect(sanitized).toContain("--clip-start: 0s;");
      expect(sanitized).not.toContain("--clip-start:26.010s");
      expect(sanitized).toContain("--question-size:56px;");
      expect(sanitized).toContain("--timer-start:0s;");
    });

    it("injects --clip-start: 0s; when style attribute exists but lacks --clip-start", () => {
      const opening = '<section id="q-no-var" class="clip" style="opacity: 1; pointer-events: none;">';
      const sanitized = sanitizeSubCompositionRootStyle(opening);
      expect(sanitized).toContain("--clip-start: 0s;");
      expect(sanitized).toContain("opacity: 1;");
    });

    it("injects style=\"--clip-start: 0s;\" when section has no style attribute", () => {
      const opening = '<section id="candy-outro" class="clip candy-scene">';
      const sanitized = sanitizeSubCompositionRootStyle(opening);
      expect(sanitized).toBe('<section id="candy-outro" class="clip candy-scene" style="--clip-start: 0s;">');
    });

    it("guarantees toSubComposition strips global data-start from template while retaining it on subCompositionMount", () => {
      // Simulate an unnormalized clip with global timestamps
      const rawClip = `<section id="quiz-q3-45000" class="clip candy-scene quiz-question-clip" style="--clip-start: 45.000s; --timer-start: 0s;" data-start="45.000" data-duration="15.200" data-track-index="0"><p>Test content</p></section>`;

      const subComp = toSubComposition(rawClip, "16:9");

      // 1. Subcomposition metadata must hold master episode timeline anchors
      expect(subComp.id).toBe("quiz-q3-45000");
      expect(subComp.start).toBe("45.000");
      expect(subComp.duration).toBe("15.200");
      expect(subComp.trackIndex).toBe("0");

      // 2. Mount tag must place the subcomposition at the global master timeline anchor
      const mount = subCompositionMount(subComp);
      expect(mount).toContain('data-start="45.000"');
      expect(mount).toContain('data-duration="15.200"');
      expect(mount).toContain('data-composition-src="compositions/quiz-q3-45000.html"');

      // 3. Isolated template HTML must have stripped global timeline attributes
      expect(subComp.html).not.toContain('data-start="45.000"');
      expect(subComp.html).not.toContain('data-duration="15.200"');
      expect(subComp.html).toContain('data-no-timeline');
      expect(subComp.html).toContain('data-composition-id="quiz-q3-45000"');

      // 4. Fail-safe sanitizer MUST have forced --clip-start: 0s; in the subcomposition DOM
      expect(subComp.html).toContain("--clip-start: 0s;");
      expect(subComp.html).not.toContain("--clip-start: 45.000s");
    });
  });
});
