import { describe, expect, it } from "vitest";
import { QUIZ_LAYOUTS } from "@studio/shared";
import { getStageQuestionLayoutDefinition, STAGE_QUESTION_LAYOUTS } from "./questionLayouts";

describe("stage question layouts", () => {
  it("P2-CAT-03 keeps exhaustive unique web metadata for each production layout", () => {
    const ids = STAGE_QUESTION_LAYOUTS.map((layout) => layout.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(QUIZ_LAYOUTS.map((layout) => layout.id).sort());
  });

  it("resolves the selected layout metadata", () => {
    expect(getStageQuestionLayoutDefinition("media_left_choices_right").preview).toBe("media-left");
    expect(getStageQuestionLayoutDefinition("visual_choices_three").preview).toBe("visual-three");
    expect(getStageQuestionLayoutDefinition("media_top_choices_bottom").preview).toBe("media-top");
    expect(getStageQuestionLayoutDefinition("full_stack_list").preview).toBe("full-stack");
  });
});
