import { describe, expect, it } from "vitest";
import type { QuizBackgroundStyle } from "@studio/shared";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { resolveBackgroundVariant } from "../src/quiz/visual/elements/background/index.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { styleBoundaryQuiz } from "./quizStyleBoundaryFixtures.js";

type BackgroundId = Exclude<QuizBackgroundStyle, "auto">;

describe("Candy Arcade background parity and composition integration", () => {
  it.each<BackgroundId>(["candy_rays", "aurora_glow"])("emits canonical %s layer through both public composition entries", (background) => {
    const production = parityProductionBundle([background, background]);
    const sandbox = paritySandboxComposition(background);
    const variant = resolveBackgroundVariant(background);
    const canonicalProduction = variant.renderHtml({ surface: "production", questionIndex: 0 });
    const canonicalSandbox = variant.renderHtml({ surface: "sandbox", questionIndex: 0 });

    expect(canonicalSandbox).toBe(canonicalProduction);
    expect(canonicalProduction).toContain('class="quiz-scene-background"');
    expect(canonicalProduction).toContain(`data-background-style="${background}"`);
    expect(Object.values(production.files).join("\n")).toContain(canonicalProduction);
    expect(sandbox.html).toContain(canonicalProduction);
  });

  it("bundles each used background and scopes CSS properly without comment counting", () => {
    const candyOnly = candyArcadeCss({ backgroundStyles: ["candy_rays", "candy_rays"] });
    expect(candyOnly).toContain(".bg-rays");
    expect(candyOnly).not.toContain(".bg-aurora-glow");
    expect(candyOnly).toContain(".quiz-scene-background");

    const auroraOnly = paritySandboxComposition("aurora_glow").css;
    expect(auroraOnly).not.toContain(".bg-rays");
    expect(auroraOnly).toContain(".bg-aurora-glow");

    const mixed = parityProductionBundle(["aurora_glow", "candy_rays"]).html;
    expect(mixed).toContain(".bg-rays");
    expect(mixed).toContain(".bg-aurora-glow");
    expect(mixed).toContain(".quiz-scene-background");
  });

  it("exposes the browser font-readiness contract as executable script", () => {
    const sandbox = paritySandboxComposition("candy_rays");
    expect(sandbox.html).toContain("<script>(function(){");
    expect(sandbox.html).toContain("window.__fontReadyPromise=(async()=>");
  });

  it.each<BackgroundId>(["candy_rays", "aurora_glow"])("keeps %s deterministic with a reduced-motion fallback", (background) => {
    const firstProduction = parityProductionBundle([background, background]);
    const secondProduction = parityProductionBundle([background, background]);
    const firstSandbox = paritySandboxComposition(background);
    const secondSandbox = paritySandboxComposition(background);

    expect(secondProduction).toEqual(firstProduction);
    expect(secondSandbox).toEqual(firstSandbox);
    expect(firstProduction.html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(firstSandbox.css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(firstSandbox.css).toContain("animation-duration: var(--mascot-state-span, .04s) !important");
  });
});

function parityProductionBundle(backgrounds: [BackgroundId, BackgroundId]) {
  const boundaryQuiz = { ...styleBoundaryQuiz, episode_id: "phase-08c-parity" };
  const director = createDefaultDirectorPlan(boundaryQuiz);
  director.beats.forEach((beat, index) => {
    beat.background_style = backgrounds[index];
  });
  const voicePlan = buildQuizVoicePlan(boundaryQuiz);
  const timeline = compileQuizTimeline({ quiz: boundaryQuiz, director, voicePlan, targetDurationSeconds: 30 });
  return buildCandyArcadeCompositionBundle({
    quiz: boundaryQuiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: 30,
  });
}

function paritySandboxComposition(background: BackgroundId) {
  return buildSandboxComposition({
    background_style: background,
    theme: "candy_arcade",
    palette_id: "lime",
    question_number: 1,
    total_questions: 2,
  });
}
