import { describe, expect, it } from "vitest";
import { getStageQuestionLayoutDefinition, STAGE_QUESTION_LAYOUTS } from "./questionLayouts";

describe("stage question layouts", () => {
  it("keeps a unique data-driven definition for each supported layout", () => {
    const ids = STAGE_QUESTION_LAYOUTS.map((layout) => layout.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["media_left_choices_right", "visual_choices_three"]);
  });

  it("resolves the selected layout metadata", () => {
    expect(getStageQuestionLayoutDefinition("visual_choices_three").preview).toBe("visual-three");
  });
});
