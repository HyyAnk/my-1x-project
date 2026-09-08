import { describe, expect, it } from "vitest";
import { QUIZ_LANDSCAPE_LAYOUT_IDS } from "@studio/shared";
import { getStageQuestionLayouts, resolveInitialStageQuestionLayout } from "./questionLayouts";

describe("Stage Studio question layouts", () => {
  it("exposes landscape layouts only", () => {
    expect(getStageQuestionLayouts().map((layout) => layout.id)).toEqual(QUIZ_LANDSCAPE_LAYOUT_IDS);
    expect(resolveInitialStageQuestionLayout(null)).toBe("media_left_choices_right");
  });
});
