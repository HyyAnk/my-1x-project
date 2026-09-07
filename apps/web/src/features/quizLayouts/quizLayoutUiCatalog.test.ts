import { describe, expect, it } from "vitest";
import { QUIZ_LAYOUTS } from "@studio/shared";
import { en } from "../../i18n";
import {
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QUIZ_LAYOUT_UI_DEFINITIONS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  filterQuizLayoutsByAspectRatio,
  getCompatibleQuizLayout,
  getQuizLayoutUiDefinition,
  getQuizLayoutUiDefinitions,
} from "./quizLayoutUiCatalog";

describe("quizLayoutUiCatalog", () => {
  it("covers all 12 layout UI definitions with unique IDs and canonical key aliasing", () => {
    expect(QUIZ_LAYOUT_UI_DEFINITIONS).toHaveLength(12);

    const ids = QUIZ_LAYOUT_UI_DEFINITIONS.map((def) => def.id);
    expect(new Set(ids).size).toBe(12);
    expect(ids.sort()).toEqual(QUIZ_LAYOUTS.map((layout) => layout.id).sort());

    for (const def of QUIZ_LAYOUT_UI_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.preview).toBeTruthy();
      expect(def.icon).toBeTruthy();

      // Canonical and aliased keys
      expect(def.labelKey).toBeTruthy();
      expect(def.descriptionKey).toBeTruthy();
      expect(def.sandboxLabelKey).toBe(def.labelKey);
      expect(def.sandboxDescriptionKey).toBe(def.descriptionKey);

      // Lookup by ID
      const single = getQuizLayoutUiDefinition(def.id);
      expect(single).toEqual(def);
    }
  });

  it("filters layout UI definitions for 16:9 landscape aspect ratio (default and explicit)", () => {
    const explicit169 = getQuizLayoutUiDefinitions("16:9");
    expect(explicit169).toHaveLength(8);
    expect(explicit169.map((def) => def.id)).toEqual(QUIZ_LANDSCAPE_LAYOUT_IDS);

    const defaultLayouts = getQuizLayoutUiDefinitions();
    expect(defaultLayouts).toHaveLength(8);
    expect(defaultLayouts.map((def) => def.id)).toEqual(QUIZ_LANDSCAPE_LAYOUT_IDS);
  });

  it("filters layout UI definitions for 9:16 portrait aspect ratio", () => {
    const portraitLayouts = getQuizLayoutUiDefinitions("9:16");
    expect(portraitLayouts).toHaveLength(4);
    expect(portraitLayouts.map((def) => def.id)).toEqual(QUIZ_PORTRAIT_LAYOUT_IDS);
  });

  it("re-exports filterQuizLayoutsByAspectRatio seamlessly", () => {
    expect(filterQuizLayoutsByAspectRatio("16:9")).toEqual(QUIZ_LANDSCAPE_LAYOUT_IDS);
    expect(filterQuizLayoutsByAspectRatio()).toEqual(QUIZ_LANDSCAPE_LAYOUT_IDS);
    expect(filterQuizLayoutsByAspectRatio("9:16")).toEqual(QUIZ_PORTRAIT_LAYOUT_IDS);
  });

  it("re-exports getCompatibleQuizLayout seamlessly for bidirectional aspect ratio transitions", () => {
    // Landscape to portrait transitions
    expect(getCompatibleQuizLayout("split_versus_two", "9:16")).toBe("portrait_split_versus");
    expect(getCompatibleQuizLayout("verdict_true_false", "9:16")).toBe("portrait_verdict_tf");
    expect(getCompatibleQuizLayout("full_stack_list", "9:16")).toBe("portrait_stack_list");
    expect(getCompatibleQuizLayout("media_left_choices_right", "9:16")).toBe("portrait_hero_choices");
    expect(getCompatibleQuizLayout("visual_choices_three", "9:16")).toBe("portrait_hero_choices");
    expect(getCompatibleQuizLayout("visual_choices_three_pure", "9:16")).toBe("portrait_hero_choices");
    expect(getCompatibleQuizLayout("mystery_reveal", "9:16")).toBe("portrait_hero_choices");
    expect(getCompatibleQuizLayout("clue_deduction", "9:16")).toBe("portrait_hero_choices");

    // Portrait to landscape transitions
    expect(getCompatibleQuizLayout("portrait_split_versus", "16:9")).toBe("split_versus_two");
    expect(getCompatibleQuizLayout("portrait_verdict_tf", "16:9")).toBe("verdict_true_false");
    expect(getCompatibleQuizLayout("portrait_stack_list", "16:9")).toBe("full_stack_list");
    expect(getCompatibleQuizLayout("portrait_hero_choices", "16:9")).toBe("media_left_choices_right");

    // Idempotent calls
    expect(getCompatibleQuizLayout("portrait_hero_choices", "9:16")).toBe("portrait_hero_choices");
    expect(getCompatibleQuizLayout("media_left_choices_right", "16:9")).toBe("media_left_choices_right");
  });

  it("resolves harmonized translation keys in both stageStudio and visualSandbox namespaces", () => {
    for (const def of QUIZ_LAYOUT_UI_DEFINITIONS) {
      const [, key] = def.labelKey.split(".") as ["stageStudio", string];
      const [, descKey] = def.descriptionKey.split(".") as ["stageStudio", string];

      const stageStudioDict = en.stageStudio as unknown as Record<string, unknown>;
      expect(stageStudioDict[key]).toBeDefined();
      expect(stageStudioDict[descKey]).toBeDefined();
    }
  });
});
