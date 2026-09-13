import { describe, expect, it } from "vitest";
import {
  ALL_THINKING_BAR_STYLES,
  computeSandboxPhaseTimeline,
  QuizV2Schema,
  SETTLED_SANDBOX_PHASE_TIMESTAMPS,
  type QuizThinkingBarStyle,
} from "@studio/shared";
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
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { styleAttributes } from "../src/quiz/render/candyArcade/candyArcadeClips.js";

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
      const questionEnter =
        timeline.events.find((event) => event.type === "question.enter" && event.question_id === "tb-q1")?.at_seconds ?? 0;
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

  it("defines urgency animations and attaches quiz-timer-danger to timer-progress", () => {
    const css = candyArcadeCss({ aspectRatio: "16:9" });
    expect(css).toContain("@keyframes quiz-timer-danger");
    expect(css).toContain("@keyframes timer-marker-danger");
    expect(css).toContain("@keyframes timer-urgency-glow");
    expect(css).toContain("@keyframes timer-exit-fade");
    expect(css).toContain("@keyframes timer-exit-fade-centered");
    expect(css).toContain("quiz-timer-danger var(--timer-duration) linear var(--timer-start) both");
  });

  it("guarantees 100% markup and CSS variable parity between sandbox rehearsal and video clips", () => {
    const timeline = computeSandboxPhaseTimeline();
    const rehearsal = buildSandboxComposition({
      mode: "rehearsal",
      aspect_ratio: "16:9",
      thinking_bar_style: "star_slider",
      question_text: "Test question?",
      choices: ["A", "B", "C"],
      correct_choice_index: 0,
      fact_card_text: "Explanation text",
    });

    const expectedTiming = calculateThinkingBarTiming({
      clipStart: 0,
      revealStart: timeline.revealStart,
      thinkingStart: timeline.thinkingStart,
    });

    // Rehearsal stage CSS vars match calculateThinkingBarTiming
    expect(rehearsal.html).toContain("--timer-start: 0s;");
    expect(rehearsal.html).toContain(`--timer-duration: ${expectedTiming.duration.toFixed(3)}s;`);
    expect(rehearsal.html).toContain(`--query-hold-duration: ${expectedTiming.queryHoldDuration.toFixed(3)}s;`);
    expect(rehearsal.html).toContain(`--cd5-at: ${expectedTiming.cd5.toFixed(3)}s;`);
    expect(rehearsal.html).toContain(`--cd1-at: ${expectedTiming.cd1.toFixed(3)}s;`);

    // In-element inline style on .thinking-bar
    const thinkingBarMatch = rehearsal.html.match(/<div class="thinking-bar [^"]*" [^>]*>/);
    expect(thinkingBarMatch).toBeTruthy();
    const thinkingBarTag = thinkingBarMatch![0];

    expect(thinkingBarTag).toContain(`--timer-start:0.000s;`);
    expect(thinkingBarTag).toContain(`--timer-duration:${expectedTiming.duration.toFixed(3)}s;`);
    expect(thinkingBarTag).toContain(`--query-hold-duration:${expectedTiming.queryHoldDuration.toFixed(3)}s;`);
    expect(thinkingBarTag).toContain(`--cd5-at:${expectedTiming.cd5.toFixed(3)}s;`);
    expect(thinkingBarTag).toContain(`--cd1-at:${expectedTiming.cd1.toFixed(3)}s;`);

    // Video clip styleAttributes outputs matching variables
    const videoSectionStyle = styleAttributes(
      {
        palette: {
          id: "sunny",
          primary: "#FF6277",
          accent: "#29B9A8",
          surface: "#FFFFFF",
          surfaceAccent: "#FFC436",
          background: "#172A59",
          text: "#172A59",
          border: "#172A59",
        },
        backgroundStyle: "candy_rays",
      } as any,
      { fontSize: 56, lineHeight: 1.1 } as any,
      0,
      timeline.choicesStart,
      timeline.thinkingStart,
      timeline.revealStart,
      timeline.revealStart + 0.8,
      timeline.totalDuration,
    );

    expect(videoSectionStyle).toContain(`--timer-start:0.000s;`);
    expect(videoSectionStyle).toContain(`--timer-duration:${expectedTiming.duration.toFixed(3)}s;`);
    expect(videoSectionStyle).toContain(`--query-hold-duration:${expectedTiming.queryHoldDuration.toFixed(3)}s;`);
  });

  it("verifies settled keyframe timing behavior: pre-countdown query hold, thinking countdown tick, and reveal/explain fade-out", () => {
    const timeline = computeSandboxPhaseTimeline();
    const timing = calculateThinkingBarTiming({
      clipStart: 0,
      revealStart: timeline.revealStart,
      thinkingStart: timeline.thinkingStart,
    });

    // 1. Question settled keyframe (0.6s):
    // queryHoldDuration is 2.47s, so at 0.6s the query mark is cleanly active
    expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBe(0.6);
    expect(0.6).toBeLessThan(timing.queryHoldDuration);
    // cd5-at is 2.47s, so no countdown number has started at 0.6s
    expect(timing.cd5).toBeGreaterThan(0.6);
    expect(timing.cd5Show).toBe(true);

    // 2. Thinking settled keyframe (3.5s):
    // cd5 is active in [2.47, 3.47), so at 3.5s cd5 has completed and cd4 is cleanly active in [3.47, 4.47)
    expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBe(3.5);
    expect(timing.cd5).toBeLessThan(3.5);
    expect(timing.cd4).toBeLessThan(3.5);
    expect(3.5).toBeLessThan(timing.cd3);

    // 3. Reveal settled keyframe (8.1s) and Explain settled keyframe (8.8s):
    // Timer duration is 7.47s, exit fade finishes at 7.47s (calc(7.47 - 0.28s) = 7.19s)
    // Both 8.1s and 8.8s are well past 7.47s, ensuring opacity 0 (cleanly hidden)
    expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBe(8.1);
    expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBe(8.8);
    expect(timing.duration).toBe(7.47);
    expect(8.1).toBeGreaterThan(timing.duration);
    expect(8.8).toBeGreaterThan(timing.duration);
  });

  it("verifies all 6 thinking bar variants render consistent countdown elements and timing attributes", () => {
    const timeline = computeSandboxPhaseTimeline();
    const expectedTiming = calculateThinkingBarTiming({
      clipStart: 0,
      revealStart: timeline.revealStart,
      thinkingStart: timeline.thinkingStart,
    });

    for (const style of ALL_THINKING_BAR_STYLES) {
      if (style === "auto") continue;
      const rehearsal = buildSandboxComposition({
        mode: "rehearsal",
        aspect_ratio: "16:9",
        thinking_bar_style: style,
        question_text: "Variant test question?",
        choices: ["Option 1", "Option 2", "Option 3"],
        correct_choice_index: 1,
        fact_card_text: "Variant explanation",
      });

      expect(rehearsal.html).toContain(`thinking-bar-${style.replace(/_/g, "-")}`);
      expect(rehearsal.html).toContain(`--timer-duration:${expectedTiming.duration.toFixed(3)}s;`);
      expect(rehearsal.html).toContain(`--query-hold-duration:${expectedTiming.queryHoldDuration.toFixed(3)}s;`);
      expect(rehearsal.html).toContain("val-query");
      expect(rehearsal.html).toContain("val-5");
      expect(rehearsal.html).toContain("val-1");
    }
  });
});

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}
