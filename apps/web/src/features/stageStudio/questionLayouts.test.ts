import { describe, expect, it } from "vitest";
import { QUIZ_LAYOUTS } from "@studio/shared";
import {
  getCompatibleStageQuestionLayout,
  getStageQuestionLayoutDefinition,
  getStageQuestionLayouts,
  resolveInitialStageQuestionLayout,
  STAGE_QUESTION_LAYOUTS,
} from "./questionLayouts";

describe("stage question layouts", () => {
  it("P2-CAT-03 keeps exhaustive unique web metadata for each production layout", () => {
    const ids = STAGE_QUESTION_LAYOUTS.map((layout) => layout.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "media_left_choices_right",
      "visual_choices_three",
      "visual_choices_three_pure",
      "split_versus_two",
      "verdict_true_false",
      "full_stack_list",
      "mystery_reveal",
      "clue_deduction",
      "portrait_hero_choices",
      "portrait_split_versus",
      "portrait_verdict_tf",
      "portrait_stack_list",
    ]);
    expect(ids.sort()).toEqual(QUIZ_LAYOUTS.map((layout) => layout.id).sort());
  });

  it("resolves the selected layout metadata with dedicated portrait previews", () => {
    expect(getStageQuestionLayoutDefinition("media_left_choices_right").preview).toBe("media-left");
    expect(getStageQuestionLayoutDefinition("visual_choices_three").preview).toBe("visual-three");
    expect(getStageQuestionLayoutDefinition("visual_choices_three_pure").preview).toBe("visual-three");
    expect(getStageQuestionLayoutDefinition("split_versus_two").preview).toBe("media-left");
    expect(getStageQuestionLayoutDefinition("verdict_true_false").preview).toBe("media-left");
    expect(getStageQuestionLayoutDefinition("full_stack_list").preview).toBe("full-stack");
    expect(getStageQuestionLayoutDefinition("mystery_reveal").preview).toBe("media-left");
    expect(getStageQuestionLayoutDefinition("clue_deduction").preview).toBe("media-left");

    // Dedicated portrait wireframe previews
    expect(getStageQuestionLayoutDefinition("portrait_hero_choices").preview).toBe("portrait-hero");
    expect(getStageQuestionLayoutDefinition("portrait_split_versus").preview).toBe("portrait-versus");
    expect(getStageQuestionLayoutDefinition("portrait_verdict_tf").preview).toBe("portrait-verdict");
    expect(getStageQuestionLayoutDefinition("portrait_stack_list").preview).toBe("portrait-stack");
  });

  it("filters stage question layouts by aspect ratio", () => {
    const landscapeLayouts = getStageQuestionLayouts("16:9");
    expect(landscapeLayouts.map((l) => l.id)).toEqual([
      "media_left_choices_right",
      "visual_choices_three",
      "visual_choices_three_pure",
      "split_versus_two",
      "verdict_true_false",
      "full_stack_list",
      "mystery_reveal",
      "clue_deduction",
    ]);

    const defaultLayouts = getStageQuestionLayouts();
    expect(defaultLayouts.map((l) => l.id)).toEqual(landscapeLayouts.map((l) => l.id));

    const portraitLayouts = getStageQuestionLayouts("9:16");
    expect(portraitLayouts.map((l) => l.id)).toEqual([
      "portrait_hero_choices",
      "portrait_split_versus",
      "portrait_verdict_tf",
      "portrait_stack_list",
    ]);
  });

  it("resolves initial stage question layout with aspect ratio fallback", () => {
    // 9:16 aspect ratio resolution
    expect(resolveInitialStageQuestionLayout("portrait_split_versus", "9:16")).toBe("portrait_split_versus");
    expect(resolveInitialStageQuestionLayout("split_versus_two", "9:16")).toBe("portrait_split_versus");
    expect(resolveInitialStageQuestionLayout("verdict_true_false", "9:16")).toBe("portrait_verdict_tf");
    expect(resolveInitialStageQuestionLayout("full_stack_list", "9:16")).toBe("portrait_stack_list");
    expect(resolveInitialStageQuestionLayout("media_left_choices_right", "9:16")).toBe("portrait_hero_choices");
    expect(resolveInitialStageQuestionLayout(undefined, "9:16")).toBe("portrait_hero_choices");

    // 16:9 aspect ratio resolution
    expect(resolveInitialStageQuestionLayout("visual_choices_three", "16:9")).toBe("visual_choices_three");
    expect(resolveInitialStageQuestionLayout("portrait_split_versus", "16:9")).toBe("split_versus_two");
    expect(resolveInitialStageQuestionLayout("portrait_verdict_tf", "16:9")).toBe("verdict_true_false");
    expect(resolveInitialStageQuestionLayout("portrait_stack_list", "16:9")).toBe("full_stack_list");
    expect(resolveInitialStageQuestionLayout("portrait_hero_choices", "16:9")).toBe("media_left_choices_right");
    expect(resolveInitialStageQuestionLayout(undefined, "16:9")).toBe("media_left_choices_right");
  });

  it("migrates incompatible layout when aspect ratio changes", () => {
    expect(getCompatibleStageQuestionLayout("media_left_choices_right", "9:16")).toBe("portrait_hero_choices");
    expect(getCompatibleStageQuestionLayout("portrait_hero_choices", "16:9")).toBe("media_left_choices_right");
    expect(getCompatibleStageQuestionLayout("portrait_verdict_tf", "9:16")).toBe("portrait_verdict_tf");
    expect(getCompatibleStageQuestionLayout("verdict_true_false", "16:9")).toBe("verdict_true_false");
  });

  it("resolves clean fallback layout when active layout is absent from filtered list", () => {
    const portraitLayouts = getStageQuestionLayouts("9:16");
    const currentLandscapeLayout = "media_left_choices_right";
    const isAvailable = portraitLayouts.some((layout) => layout.id === currentLandscapeLayout);
    expect(isAvailable).toBe(false);

    const fallbackId = isAvailable ? currentLandscapeLayout : portraitLayouts[0]?.id;
    expect(fallbackId).toBe("portrait_hero_choices");
    expect(getStageQuestionLayoutDefinition(fallbackId!).preview).toBe("portrait-hero");
  });

  it("ensures each layout definition has unique labelKey and descriptionKey", () => {
    const labelKeys = STAGE_QUESTION_LAYOUTS.map((layout) => layout.labelKey);
    const descriptionKeys = STAGE_QUESTION_LAYOUTS.map((layout) => layout.descriptionKey);

    expect(new Set(labelKeys).size).toBe(labelKeys.length);
    expect(new Set(descriptionKeys).size).toBe(descriptionKeys.length);
  });
});
