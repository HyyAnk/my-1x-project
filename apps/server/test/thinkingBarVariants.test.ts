import { describe, expect, it } from "vitest";
import { ALL_THINKING_BAR_STYLES, QuizV2Schema, type QuizThinkingBarStyle } from "@studio/shared";
import {
  getThinkingBarsCss,
  getThinkingBarVariant,
  resolveThinkingBarVariant,
  THINKING_BAR_VARIANTS,
} from "../src/quiz/visual/elements/thinkingBar/registry.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
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
      const variant = getThinkingBarVariant(style as Exclude<QuizThinkingBarStyle, "auto">);
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

  it("renders valid HTML with correct countdown CSS variables for every variant", () => {
    const input = {
      clipStart: 10,
      revealStart: 18,
      thinkingStart: 12,
      duration: 8,
      questionNumber: 1,
      paletteAccent: "#FF5500",
    };

    for (const style of ALL_THINKING_BAR_STYLES) {
      if (style === "auto") continue;
      const variant = THINKING_BAR_VARIANTS[style as Exclude<QuizThinkingBarStyle, "auto">];
      const html = variant.renderHtml(input);

      expect(html).toContain("class=\"thinking-bar");
      expect(html).toContain(`thinking-bar-${style.replace(/_/g, "-")}`);
      expect(html).toContain("--timer-duration:8.000s");
      expect(html).toContain("--cd-query-dur:3.000s");
      expect(html).toContain("--cd5-at:3.000s");
      expect(html).toContain("--cd1-at:7.000s");
      expect(html).toContain("val-5");
      expect(html).toContain("val-1");
      expect(html).toContain("val-query");
    }
  });

  it("aggregates CSS for all variants containing keyframe animations", () => {
    const css = getThinkingBarsCss();
    expect(css).toContain(".thinking-bar-star-slider");
    expect(css).toContain(".thinking-bar-capsule-liquid");
    expect(css).toContain(".thinking-bar-energy-laser");
    expect(css).toContain(".thinking-bar-retro-pixel");
    expect(css).toContain(".thinking-bar-flame-fuse");
    expect(css).toContain(".thinking-bar-minimal-glow");

    expect(css).toContain("@keyframes liquidBubbleRise");
    expect(css).toContain("@keyframes laserPulseScan");
    expect(css).toContain("@keyframes pixelBounce");
    expect(css).toContain("@keyframes flameWobble");
    expect(css).toContain("@keyframes minimalBreathe");
  });

  it("renders composition bundle with specific thinking bar styles specified on director beats", () => {
    const stylesToTest: Array<Exclude<QuizThinkingBarStyle, "auto">> = [
      "capsule_liquid",
      "energy_laser",
      "retro_pixel",
      "flame_fuse",
      "minimal_glow",
    ];

    for (const style of stylesToTest) {
      const director = createDefaultDirectorPlan(sampleQuiz);
      director.beats[0]!.thinking_bar_style = style;
      const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });
      const bundle = buildCandyArcadeCompositionBundle({
        quiz: sampleQuiz,
        director,
        timeline,
        theme: "candy_arcade",
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
      });

      const fullOutput = [bundle.html, ...Object.values(bundle.files)].join("\n");
      expect(fullOutput).toContain(`thinking-bar-${style.replace(/_/g, "-")}`);
    }
  });
});
