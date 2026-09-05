import { describe, expect, it } from "vitest";
import {
  MASCOT_CANVAS_SIZES,
  QUIZ_LAYOUTS,
  SandboxPreviewInputSchema,
  getQuizPreviewLayoutCapability,
  type QuizPreviewLayoutId,
} from "@studio/shared";
import { candyArcadeCss, candyArcadeHeroAreaRatio } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { QUIZ_LAYOUT_RENDERERS, renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";

describe("quiz layout registry", () => {
  it("P2-CAT-02 has one renderer for every production layout and one preview-only baseline", () => {
    expect(Object.keys(QUIZ_LAYOUT_RENDERERS).sort()).toEqual(["baseline", ...QUIZ_LAYOUTS.map((layout) => layout.id)].sort());
    expect(
      Object.keys(QUIZ_LAYOUT_RENDERERS)
        .filter((id) => id !== "baseline")
        .sort(),
    ).toEqual(QUIZ_LAYOUTS.map((layout) => layout.id).sort());
  });

  it("renders layout-specific slots without renderer conditionals", () => {
    const slots = {
      questionBoxHtml: "<h1>Question</h1>",
      heroHtml: "<figure>Hero</figure>",
      choicesHtml: "<div>Choices</div>",
      phaseHtml: "<div>Thinking</div>",
    };

    expect(renderQuizLayoutBody("media_left_choices_right", slots)).toContain("Hero");
    expect(renderQuizLayoutBody("media_left_choices_right", slots)).toContain("Choices");
    expect(renderQuizLayoutBody("visual_choices_three", slots)).toContain("Choices");
    expect(renderQuizLayoutBody("visual_choices_three", slots)).not.toContain("Hero");
    expect(renderQuizLayoutBody("mystery_reveal", slots)).toContain("Hero");
    expect(renderQuizLayoutBody("mystery_reveal", slots)).toContain("Choices");
    expect(renderQuizLayoutBody("clue_deduction", slots)).toContain("Hero");
    expect(renderQuizLayoutBody("clue_deduction", slots)).toContain("Choices");
  });

  it("P8D-DIM-01 derives every render-dimension consumer from the capability catalog", () => {
    const canvas = MASCOT_CANVAS_SIZES["16:9"];
    const layoutIds = Object.keys(QUIZ_LAYOUT_RENDERERS) as QuizPreviewLayoutId[];

    for (const layoutId of layoutIds) {
      const metrics = getQuizPreviewLayoutCapability(layoutId).metrics.render;
      const expectedRatio = Number(((metrics.width * metrics.height * metrics.itemCount) / (canvas.width * canvas.height)).toFixed(4));
      expect(candyArcadeHeroAreaRatio(layoutId)).toBe(expectedRatio);
    }

    const baseline = getQuizPreviewLayoutCapability("baseline").metrics.render;
    expect(candyArcadeCss({ fontMode: "preview" })).toContain(
      `.game-stage > .hero-image { width: ${baseline.width}px; height: ${baseline.height}px;`,
    );
  });

  it("accepts two-choice previews for true-or-false questions", () => {
    expect(SandboxPreviewInputSchema.parse({ choices: ["True", "False"], correct_choice_index: 1 }).choices).toEqual(["True", "False"]);
  });
});
