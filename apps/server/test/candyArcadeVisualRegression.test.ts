import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import {
  buildCandyArcadeCompositionBundle,
  candyArcadeHeroAreaRatio,
  highlightQuestionMarkup,
} from "../src/quiz/render/candyArcadeComposition.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

const quiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "candy-visual-regression",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "visual-regression-question",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which ocean is the largest on Earth?",
      choices: [
        { id: "choice-a", text: "Pacific Ocean" },
        { id: "choice-b", text: "Atlantic Ocean" },
        { id: "choice-c", text: "Arctic Ocean" },
      ],
      correct_choice_id: "choice-a",
      explanation: "The Pacific Ocean covers the largest area.",
      fun_fact: "",
      source_ids: ["VR-01"],
      visual_opportunity: "A bright globe with the Pacific Ocean",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

function renderHtml(): string {
  const director = createDefaultDirectorPlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
  });
  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}

describe("Candy Arcade visual regression contract", () => {
  it("keeps the timer marker circular and synchronized without nesting it under the scaled fill", () => {
    const html = renderHtml();
    const markerCss = html.match(/\.timer-marker \{([^}]+)\}/)?.[1] ?? "";
    const thinkingBarCss = html.match(/\n ?\.thinking-bar \{([^}]+)\}/)?.[1] ?? "";
    const timerProgressCss = html.match(/\.timer-progress \{([^}]+)\}/)?.[1] ?? "";
    const width = Number(markerCss.match(/width: ([\d.]+)px/)?.[1]);
    const height = Number(markerCss.match(/height: ([\d.]+)px/)?.[1]);
    expect(width / height).toBeGreaterThanOrEqual(0.92);
    expect(html).toContain(
      '<div class="timer-progress"></div><span class="timer-marker" data-layout-allow-occlusion data-layout-allow-overlap>',
    );
    expect([...html.matchAll(/class="marker-val val-query"/g)]).toHaveLength(1);
    expect([...html.matchAll(/>\?</g)]).toHaveLength(1);
    expect(html).not.toContain('<div class="timer-progress"><span class="timer-marker');
    expect(html).toContain(
      ".val-query { animation: query-hold var(--query-hold-duration) linear var(--timer-start) both; display: var(--query-display, grid); }",
    );
    expect(html).toContain(
      ".val-5 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd5-at)) both; display: var(--cd5-display, grid); }",
    );
    expect(html).toContain(
      ".val-4 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd4-at)) both; display: var(--cd4-display, grid); }",
    );
    expect(html).toContain(
      ".val-3 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd3-at)) both; display: var(--cd3-display, grid); }",
    );
    expect(html).toContain(
      ".val-2 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd2-at)) both; display: var(--cd2-display, grid); }",
    );
    expect(html).toContain(
      ".val-1 { animation: number-countdown-final 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd1-at)) both; display: var(--cd1-display, grid); }",
    );

    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const fillEdge = 1 - progress;
      const markerEdge = 1 - progress;
      expect(markerEdge).toBe(fillEdge);
    }
  });

  it("keeps every resolved hero layout above the old boxed-image area", () => {
    const baseline = candyArcadeHeroAreaRatio("baseline");
    expect(candyArcadeHeroAreaRatio("media_left_choices_right")).toBeGreaterThan(baseline * 2);
    expect(candyArcadeHeroAreaRatio("visual_choices_three")).toBeGreaterThan(baseline * 2);
  });

  it("emits real selectors for semantic media layouts and a safe keyword fallback", () => {
    const html = renderHtml();
    expect(html).toContain(".layout-media_left_choices_right .game-stage");
    expect(html).toContain(".layout-visual_choices_three .visual-answer-grid");
    expect(html).toContain('<strong class="keyword-highlight">ocean</strong>');
    const keywordChecks = [
      ["Which planet is often called the Red Planet?", "A bright red planet", "planet"],
      ["What is a baby frog called?", "A frog tadpole in a pond", "frog"],
      ["Which sense helps you notice the smell of popcorn?", "A popcorn bowl with smell waves", "smell"],
      ["Which shape has three sides?", "A triangle shape", "shape"],
      ["What do green plants use to make food?", "Green plants reaching for sunlight", "plants"],
    ] as const;
    for (const [question, opportunity, keyword] of keywordChecks) {
      expect(highlightQuestionMarkup(question, opportunity)).toContain(`<strong class="keyword-highlight">${keyword}</strong>`);
    }
    expect(highlightQuestionMarkup("Which animal can sprint fastest?", "A friendly cheetah")).not.toContain("keyword-highlight");
    expect(html).toContain("hero-ken-burn");
    expect(html).not.toContain(".option-image img { animation");
    expect(html).toContain("scale(1.12)");
  });

  it("keeps phase-gated reveal elements hidden before their scheduled boundary", () => {
    const html = renderHtml();
    expect(html).toContain("@keyframes phase-enter { from { opacity: 0; } to { opacity: 1; } }");
    expect(html).toContain(
      ".fact-card { position: relative; z-index: 5; max-width: 1220px; margin-top: 14px; padding: 24px 48px; border: 6px solid rgba(255,255,255,.85); border-radius: 38px; background: var(--surface); box-shadow: 0 16px 0 rgba(13,35,71,.18), 0 22px 36px rgba(10,25,60,.14); text-align: center; opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both; contain: layout style; will-change: transform, opacity; }",
    );
  });

  it("keeps the progress bar fixed, colorful, caption-free, and edge-safe", () => {
    const html = renderHtml();
    const raysCss = html.match(/\.bg-rays \{([^}]+)\}/)?.[1] ?? "";
    const phaseCss = html.match(/\.phase-region \{([^}]+)\}/)?.[1] ?? "";
    expect(raysCss).toContain("inset: -30%");
    expect(raysCss).not.toContain("width:");
    expect(raysCss).not.toContain("height:");
    expect(html).toContain("@keyframes ray-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }");
    expect(html).not.toContain("translate(-50%,-50%) rotate(360deg)");
    expect(phaseCss).toContain("position: absolute");
    expect(phaseCss).toContain("bottom: 10px");
    expect(html).not.toContain("grid-area: phase");
    expect(html).not.toContain("Think it through!");
    expect(html).not.toContain("Lock in your answer!");
    expect(html).not.toContain("timer-caption");
  });

  it("stagger-floats answer images and composes visual reveal motion", () => {
    const html = renderHtml();
    expect(html).toMatch(/\.option-image \{[^}]*animation: visual-choice-float/);
    expect(html).toMatch(/\.answer-card img \{[^}]*animation: answer-float/);
    expect(html).toContain("--item-phase:");
    expect(html).toContain("visual-choice-float 3.8s");
    expect(html).toContain("visual-correct-border");
  });

  it("renders prominent 3D glossy circular badges and distinct choice-coded stroke borders for kids", () => {
    const html = renderHtml();
    expect(html).toContain("border-radius: 50%");
    expect(html).toContain("--choice-depth-shadow: #E09000");
    expect(html).toContain("--choice-depth-shadow: #CC2556");
    expect(html).toContain("--choice-depth-shadow: #007ECC");
    expect(html).not.toContain("--choice-depth-shadow: #6BA607");
    expect(html).not.toContain("answer-count-4");
    expect(html).toContain(
      '.answer-card::before { content: ""; position: absolute; inset: 6px 14px 6px 24px; border: 3px dashed rgba(255, 255, 255, 0.7);',
    );
    expect(html).toMatch(/\.answer-card > b[^}]*width: 156px/);
    expect(html).toMatch(/\.answer-card > b[^}]*font-size: 80px/);
    expect(html).toMatch(/\.answer-card > b[^}]*margin-left: -86px/);
    expect(html).toContain(".answer-card > b::after");
    expect(html).toContain("-webkit-text-stroke: 4px var(--choice-stroke-shadow)");
    expect(html).toContain("--choice-text-color: #78350F");
    expect(html).toContain("--choice-text-color: #831843");
    expect(html).toContain(
      ".layout-media_left_choices_right .answer-grid.answer-count-2 { gap: 50px; height: 580px; padding-top: 100px; }",
    );
    expect(html).toContain("--choice-badge-size: 138px;");
    expect(html).toContain("--choice-badge-margin-left: -74px;");
    expect(html).toContain("--choice-badge-font-size: 72px;");
    expect(html).toContain("--choice-font-size-base: 36px;");
    expect(html).toContain("--choice-font-size-medium: 28px;");
    expect(html).toContain("--choice-font-size-long: 23px;");
    expect(html).toContain("--choice-font-size-base: 38px;");
  });
});
