import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES, QuizQuestionSchema, resolveQuizLayoutId } from "@studio/shared";
import { answerCards, visualAnswerCards } from "../src/quiz/render/candyArcade/candyArcadeClips.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { QUIZ_LAYOUT_DIMENSIONS, renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";
import { textLayout } from "../src/quiz/visual/candyArcade.js";
import { answerCardRegistry, resolveAnswerCardVariant } from "../src/quiz/visual/elements/answerCard/registry.js";

const question = QuizQuestionSchema.parse({
  id: "characterization-question",
  number: 1,
  format: "multiple_choice",
  difficulty: 1,
  question: "Which planet has rings?",
  choices: [
    { id: "choice-a", text: "Earth" },
    { id: "choice-b", text: "Saturn" },
    { id: "choice-c", text: "Mars" },
  ],
  correct_choice_id: "choice-b",
  explanation: "Saturn has the most visible ring system.",
  fun_fact: "Saturn's rings contain ice and rock.",
  source_ids: ["phase-01"],
  visual_opportunity: "Three illustrated planets",
  validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
});

const slots = {
  questionBoxHtml: "<question-box />",
  heroHtml: "<hero />",
  textChoicesHtml: "<text-choices />",
  visualChoicesHtml: "<visual-choices />",
  phaseHtml: "<phase />",
};

describe("Phase 1 layout and resolver characterization", () => {
  it("R-01 through R-04 preserve current auto and explicit layout resolution", () => {
    for (const archetype of ["text_multiple_choice", "illustrated_multiple_choice"] as const) {
      expect(resolveQuizLayoutId({ requestedLayout: "auto", archetype, questionFormat: "multiple_choice" })).toBe(
        "media_left_choices_right",
      );
    }
    expect(
      resolveQuizLayoutId({
        requestedLayout: "auto",
        archetype: "visual_multiple_choice",
        questionFormat: "multiple_choice",
      }),
    ).toBe("visual_choices_three");
    expect(resolveQuizLayoutId({ requestedLayout: "auto", archetype: "text_multiple_choice", questionFormat: "odd_one_out" })).toBe(
      "visual_choices_three",
    );
    expect(
      resolveQuizLayoutId({
        requestedLayout: "visual_choices_three",
        archetype: "true_false",
        questionFormat: "true_false",
      }),
    ).toBe("visual_choices_three");
  });

  it("L-02 through L-05 preserve registered slots and dimensions", () => {
    expect(renderQuizLayoutBody("baseline", slots)).toBe(
      '<question-box /><hero /><text-choices /><div class="phase-region"><phase /></div>',
    );
    expect(renderQuizLayoutBody("media_left_choices_right", slots)).toBe(
      '<question-box /><hero /><text-choices /><div class="phase-region"><phase /></div>',
    );
    expect(renderQuizLayoutBody("visual_choices_three", slots)).toBe(
      '<question-box /><visual-choices /><div class="phase-region"><phase /></div>',
    );
    expect(QUIZ_LAYOUT_DIMENSIONS).toEqual({
      baseline: { width: 800, height: 284 },
      media_left_choices_right: { width: 840, height: 580 },
      visual_choices_three: { width: 501, height: 500, count: 3 },
    });
  });
});

describe("Phase 1 choice skin characterization", () => {
  it("C-01 through C-03 preserve production text paths and skin-independent visual markup", () => {
    for (const style of [undefined, "auto", "glossy_arcade"] as const) {
      const html = answerCards(question, {}, style);
      expect(html).toContain("answer-card answer-incorrect");
      expect(html).not.toContain("ac-glossy-arcade");
    }

    const comicHtml = answerCards(question, {}, "comic_chunky");
    expect(comicHtml).toContain("ac-comic-chunky comic-card-1 answer-correct");
    expect(comicHtml).toContain("ac-comic-chunky comic-card-0 answer-incorrect");

    const visualHtml = visualAnswerCards(question, {});
    expect(visualHtml).toContain("visual-answer-card answer-correct");
    expect(visualHtml).not.toMatch(/\bac-(glossy-arcade|comic-chunky|glass-neon|minimal-soft)\b/);
  });

  it("C-06 and C-07 preserve Answer Card registry parity and glossy defaults", () => {
    expect([...answerCardRegistry.keys()].sort()).toEqual(ALL_ANSWER_CARD_STYLES.filter((style) => style !== "auto").sort());
    expect(resolveAnswerCardVariant("auto").id).toBe("glossy_arcade");
    expect(resolveAnswerCardVariant(null).id).toBe("glossy_arcade");
    expect(resolveAnswerCardVariant(undefined).id).toBe("glossy_arcade");
  });
});

describe("Phase 1 typography and aspect-ratio characterization", () => {
  it("T-01 and T-02 preserve every current choice-tier boundary", () => {
    const tiersAt = (lengths: number[], hasMascot: boolean) =>
      lengths.map((length) => textLayout("x".repeat(length), "choice", { hasMascot }).tier);

    expect(tiersAt([18, 19, 34, 35, 58, 59, 82, 83], false)).toEqual([
      "short",
      "medium",
      "medium",
      "long",
      "long",
      "very_long",
      "very_long",
      "overflow",
    ]);
    expect(tiersAt([10, 11, 22, 23, 40, 41, 60, 61], true)).toEqual([
      "short",
      "medium",
      "medium",
      "long",
      "long",
      "very_long",
      "very_long",
      "overflow",
    ]);
  });

  it("A-02 and B-03 preserve portrait selectors and reduced-motion CSS", () => {
    const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "9:16" });
    expect(css).toContain('#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage');
    expect(css).toContain('#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .visual-answer-grid');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: .001ms !important");
  });
});
