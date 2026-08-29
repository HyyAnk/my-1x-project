import { describe, expect, it } from "vitest";
import { QUIZ_LAYOUTS, SandboxPreviewInputSchema } from "@studio/shared";
import { QUIZ_LAYOUT_RENDERERS, renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";

describe("quiz layout registry", () => {
  it("has one renderer for every production layout", () => {
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
      textChoicesHtml: "<div>Text choices</div>",
      visualChoicesHtml: "<div>Visual choices</div>",
      phaseHtml: "<div>Thinking</div>",
    };

    expect(renderQuizLayoutBody("media_left_choices_right", slots)).toContain("Hero");
    expect(renderQuizLayoutBody("media_left_choices_right", slots)).not.toContain("Visual choices");
    expect(renderQuizLayoutBody("visual_choices_three", slots)).toContain("Visual choices");
    expect(renderQuizLayoutBody("visual_choices_three", slots)).not.toContain("Hero");
  });

  it("accepts two-choice previews for true-or-false questions", () => {
    expect(SandboxPreviewInputSchema.parse({ choices: ["True", "False"], correct_choice_index: 1 }).choices).toEqual(["True", "False"]);
  });
});
