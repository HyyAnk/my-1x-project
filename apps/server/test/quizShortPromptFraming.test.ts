import { describe, expect, it } from "vitest";
import { framingRules } from "../src/quiz/assets/promptFramingRules.js";

describe("Quiz Short prompt framing", () => {
  it("describes the portrait frame for every portrait layout", () => {
    expect(framingRules("4:3", "hero_question_image", { layoutId: "short_media_top_choices" })).toContain("vertical 9:16 quiz frame");
    expect(framingRules("4:3", "hero_question_image", { layoutId: "short_verdict_yes_no" })).toContain("YES and NO buttons below");
    expect(framingRules("3:4", "answer_option", { layoutId: "short_versus_two" })).toContain("side-by-side portrait cards");
  });

  it("never uses the landscape wording for a portrait layout", () => {
    for (const layoutId of ["short_media_top_choices", "short_verdict_yes_no", "short_versus_two", "short_stack_list"]) {
      const text = framingRules("4:3", "hero_question_image", { layoutId });
      expect(text).not.toContain("landscape hero card");
      expect(text).not.toContain("left side of the quiz frame");
    }
  });

  it("keeps the landscape wording for landscape layouts", () => {
    expect(framingRules("4:3", "hero_question_image", { layoutId: "media_left_choices_right" })).toContain("landscape hero card");
  });
});
