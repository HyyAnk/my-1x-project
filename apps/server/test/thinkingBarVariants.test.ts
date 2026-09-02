import { describe, expect, it } from "vitest";
import { ALL_THINKING_BAR_STYLES, QuizV2Schema, type QuizThinkingBarStyle } from "@studio/shared";
import {
  getThinkingBarsCss,
  getThinkingBarVariant,
  resolveThinkingBarVariant,
  THINKING_BAR_VARIANTS,
} from "../src/quiz/visual/elements/thinkingBar/registry.js";
import { calculateThinkingBarTiming } from "../src/quiz/visual/elements/thinkingBar/types.js";
import { buildCandyArcadeCompositionBundle, candyArcadeCss } from "../src/quiz/render/candyArcadeComposition.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

const sampleQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "thinking-bar-test",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "tb-q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "What is the capital of France?",
      choices: [
        { id: "choice-a", text: "Paris" },
        { id: "choice-b", text: "London" },
        { id: "choice-c", text: "Rome" },
      ],
      correct_choice_id: "choice-a",
      explanation: "Paris is the capital of France.",
      fun_fact: "",
      source_ids: ["S01"],
      visual_opportunity: "Eiffel Tower in Paris",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Thinking Bar Element Suite", () => {
  it("registers all defined styles in the registry", () => {
    for (const style of ALL_THINKING_BAR_STYLES) {
      if (style === "auto") continue;
      const variant = getThinkingBarVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(variant.description).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto or unknown style to default star_slider", () => {
    const defaultVar = resolveThinkingBarVariant("auto");
    expect(defaultVar.id).toBe("star_slider");

    const nullVar = resolveThinkingBarVariant(null);
    expect(nullVar.id).toBe("star_slider");

    // @ts-expect-error testing invalid input fallback
    const unknownVar = resolveThinkingBarVariant("unknown_bar_style");
    expect(unknownVar.id).toBe("star_slider");
  });

  it("runs every timer variant from question appearance (clipStart) and keeps the pre-countdown query marker inside the moving marker", () => {
    const input = {
      clipStart: 8,
      questionNarrationStart: 10,
      revealStart: 18,
      thinkingStart: 12,
      duration: 8,
      questionNumber: 1,
      paletteAccent: "#FF5500",
    };

    for (const style of ALL_THINKING_BAR_STYLES) {
      if (style === "auto") continue;
      const variant = THINKING_BAR_VARIANTS[style];
      const html = variant.renderHtml(input);

      expect(html).toContain('class="thinking-bar');
      expect(html).toContain(`thinking-bar-${style.replace(/_/g, "-")}`);
      expect(html).toContain("--timer-start:8.000s");
      expect(html).toContain("--timer-duration:10.000s");
      expect(html).toContain("--cd5-at:5.000s");
      expect(html).toContain("--cd1-at:9.000s");
      expect(html).toContain("--query-hold-duration:5.000s");
      expect(html).toContain("val-query");
      expect(html).toContain("val-5");
      expect(html).toContain("val-1");
      expect(countMatches(html, /class="marker-val val-query"/g)).toBe(1);
      expect(countMatches(html, />\?</g)).toBe(1);
    }
  });

  it("strictly enforces that timer starts from question appearance even if narration or thinking start are delayed", () => {
    const timing = calculateThinkingBarTiming({
      clipStart: 4.5,
      questionNarrationStart: 7.0,
      thinkingStart: 12.0,
      revealStart: 15.5,
    });
    expect(timing.timerStart).toBe(4.5);
    expect(timing.duration).toBe(11.0);
    expect(timing.styleAttr).toContain("--timer-start:4.500s");
    expect(timing.styleAttr).toContain("--timer-duration:11.000s");
    // Countdown ticks must finish at revealStart:
    // tick 5 is at 4.5 + (11.0 - 5) = 10.5 (which is 15.5 - 5)
    // tick 1 is at 4.5 + (11.0 - 1) = 14.5 (which is 15.5 - 1)
    expect(timing.cd5).toBe(6.0);
    expect(timing.cd1).toBe(10.0);
  });

  it("calculates accurate countdown timing and dynamic visibility flags for short durations", () => {
    // 3 second countdown duration (should hide 5 and 4, only show 3, 2, 1)
    const shortTiming = calculateThinkingBarTiming({ clipStart: 0, revealStart: 3 });
    expect(shortTiming.duration).toBe(3);
    expect(shortTiming.cd5Show).toBe(false);
    expect(shortTiming.cd4Show).toBe(false);
    expect(shortTiming.cd3Show).toBe(true);
    expect(shortTiming.cd2Show).toBe(true);
    expect(shortTiming.cd1Show).toBe(true);
    expect(shortTiming.styleAttr).toContain("--cd5-display:none");
    expect(shortTiming.styleAttr).toContain("--cd4-display:none");
    expect(shortTiming.styleAttr).toContain("--cd3-display:grid");
    expect(shortTiming.styleAttr).toContain("--cd3-at:0.000s");
    expect(shortTiming.styleAttr).toContain("--cd2-at:1.000s");
    expect(shortTiming.styleAttr).toContain("--cd1-at:2.000s");

    // 5 second exact countdown
    const exactTiming = calculateThinkingBarTiming({ clipStart: 2, revealStart: 7 });
    expect(exactTiming.duration).toBe(5);
    expect(exactTiming.cd5Show).toBe(true);
    expect(exactTiming.cd5).toBe(0);
    expect(exactTiming.styleAttr).toContain("--cd5-display:grid");
    expect(exactTiming.styleAttr).toContain("--cd5-at:0.000s");
    expect(exactTiming.styleAttr).toContain("--cd1-at:4.000s");

    const windowedTiming = calculateThinkingBarTiming({
      clipStart: 3.26,
      questionNarrationStart: 5.26,
      thinkingStart: 10.95,
      revealStart: 18.27,
    });
    expect(windowedTiming.duration).toBeCloseTo(15.01, 5);
    expect(windowedTiming.queryHoldDuration).toBeCloseTo(10.01, 5);
    expect(windowedTiming.styleAttr).toContain("--timer-start:3.260s");
    expect(windowedTiming.styleAttr).toContain("--timer-duration:15.010s");
    expect(windowedTiming.styleAttr).toContain("--cd5-at:10.010s");
    expect(windowedTiming.styleAttr).toContain("--cd1-at:14.010s");
    expect(windowedTiming.styleAttr).toContain("--query-hold-duration:10.010s");
  });

  it("aggregates CSS for all variants containing keyframe animations", () => {
    const css = getThinkingBarsCss();
    expect(css).toContain(".thinking-bar-star-slider");
    expect(css).toContain(".thinking-bar-capsule-liquid");
    expect(css).toContain(".thinking-bar-energy-laser");
    expect(css).toContain(".thinking-bar-construction-machine");
    expect(css).toContain(".thinking-bar-flame-fuse");
    expect(css).toContain(".thinking-bar-cosmic-rocket");

    expect(css).toContain("@keyframes liquidBubbleRise");
    expect(css).toContain("@keyframes laserPulseScan");
    expect(css).toContain("@keyframes dozerBeaconBlink");
    expect(css).toContain("@keyframes emberTrailCorePulse");
    expect(css).toContain("@keyframes portalSpin");
  });

  it("renders composition bundle with specific thinking bar styles specified on director beats", () => {
    const stylesToTest: Array<Exclude<QuizThinkingBarStyle, "auto">> = [
      "capsule_liquid",
      "energy_laser",
      "construction_machine",
      "flame_fuse",
      "cosmic_rocket",
    ];

    for (const style of stylesToTest) {
      const director = createDefaultDirectorPlan(sampleQuiz);
      director.beats[0].thinking_bar_style = style;
      const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });
      const questionEnter = timeline.events.find(
        (event) => event.type === "question.enter" && event.question_id === "tb-q1",
      )?.at_seconds ?? 0;
      const bundle = buildCandyArcadeCompositionBundle({
        quiz: sampleQuiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
      });

      const fullOutput = [bundle.html, ...Object.values(bundle.files)].join("\n");
      expect(fullOutput).toContain(`thinking-bar-${style.replace(/_/g, "-")}`);
      expect(questionEnter).toBeTypeOf("number");
      expect(fullOutput).toContain(`--timer-start:${questionEnter.toFixed(3)}s`);
    }
  });

  it("shows the question mark only during the pre-countdown hold inside the shared marker", () => {
    const css = candyArcadeCss({ aspectRatio: "16:9" });
    expect(css).toContain(".val-query");
    expect(css).toContain("query-hold var(--query-hold-duration)");
    expect(css).toContain("@keyframes query-hold");
    expect(css).toContain("phase-hold var(--timer-duration) steps(1,end) var(--timer-start) both");
    expect(css).toContain("quiz-timer-drain var(--timer-duration) linear var(--timer-start) both");
  });
});

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}
