import { describe, expect, it } from "vitest";
import type { QuizBackgroundStyle } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { resolveBackgroundVariant } from "../src/quiz/visual/elements/background/index.js";
import { styleBoundaryQuiz } from "./quizStyleBoundaryFixtures.js";

type BackgroundId = Exclude<QuizBackgroundStyle, "auto">;

describe("Phase 8C production and Sandbox parity", () => {
  it.each<BackgroundId>(["candy_rays", "aurora_glow"])(
    "P8C-PAR-01 emits the same canonical %s layer through both public composition entries",
    (background) => {
      const production = productionBundle([background, background]);
      const sandbox = sandboxComposition(background);
      const variant = resolveBackgroundVariant(background);
      const canonicalProduction = variant.renderHtml({ surface: "production", questionIndex: 0 });
      const canonicalSandbox = variant.renderHtml({ surface: "sandbox", questionIndex: 0 });

      expect(canonicalSandbox).toBe(canonicalProduction);
      expect(canonicalProduction).toContain('class="quiz-scene-background"');
      expect(canonicalProduction).toContain(`data-background-style="${background}"`);
      expect(Object.values(production.files).join("\n")).toContain(canonicalProduction);
      expect(sandbox.html).toContain(canonicalProduction);
    },
  );

  it("P8C-PAR-02 bundles each used background exactly once and omits unused CSS", () => {
    const candyOnly = candyArcadeCss({ backgroundStyles: ["candy_rays", "candy_rays"] });
    expect(commentCount(candyOnly, "Candy Rays")).toBe(1);
    expect(commentCount(candyOnly, "Aurora Glow")).toBe(0);
    expect(selectorCount(candyOnly, ".bg-gradient")).toBe(1);
    expect(selectorCount(candyOnly, ".quiz-scene-background")).toBe(1);

    const auroraOnly = sandboxComposition("aurora_glow").css;
    expect(commentCount(auroraOnly, "Candy Rays")).toBe(0);
    expect(commentCount(auroraOnly, "Aurora Glow")).toBe(1);
    expect(selectorCount(auroraOnly, ".bg-gradient")).toBe(0);

    const mixed = productionBundle(["aurora_glow", "candy_rays"]).html;
    expect(commentCount(mixed, "Candy Rays")).toBe(1);
    expect(commentCount(mixed, "Aurora Glow")).toBe(1);
    expect(selectorCount(mixed, ".quiz-scene-background")).toBe(1);
  });

  it("P8C-PAR-03 exposes the browser font-readiness contract as executable script", () => {
    const sandbox = sandboxComposition("candy_rays");
    expect(sandbox.html).toContain("<script>(function(){");
    expect(sandbox.html).toContain("window.__fontReadyPromise=(async()=>");
  });

  it.each<BackgroundId>(["candy_rays", "aurora_glow"])("P8C-PAR-03 keeps %s deterministic with a reduced-motion fallback", (background) => {
    const firstProduction = productionBundle([background, background]);
    const secondProduction = productionBundle([background, background]);
    const firstSandbox = sandboxComposition(background);
    const secondSandbox = sandboxComposition(background);

    expect(secondProduction).toEqual(firstProduction);
    expect(secondSandbox).toEqual(firstSandbox);
    expect(firstProduction.html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(firstSandbox.css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(firstSandbox.css).toContain("animation-duration: var(--mascot-state-span, .04s) !important");
  });
});

function productionBundle(backgrounds: [BackgroundId, BackgroundId]) {
  const quiz = { ...styleBoundaryQuiz, episode_id: "phase-08c-parity" };
  const director = createDefaultDirectorPlan(quiz);
  director.beats.forEach((beat, index) => {
    beat.background_style = backgrounds[index];
  });
  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, targetDurationSeconds: 30 });
  return buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: 30,
  });
}

function sandboxComposition(background: BackgroundId) {
  return buildSandboxComposition({
    background_style: background,
    theme: "candy_arcade",
    palette_id: "lime",
    question_number: 1,
    total_questions: 2,
  });
}

function commentCount(css: string, displayName: string): number {
  return css.split(`Background Variant: ${displayName}`).length - 1;
}

function selectorCount(css: string, selector: string): number {
  return css.split(`${selector} {`).length - 1;
}
