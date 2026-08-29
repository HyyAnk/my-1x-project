import type { StageQuestionLayout } from "./types";

type StageQuestionLayoutDefinition = {
  id: StageQuestionLayout;
  labelKey: "stageStudio.layoutMediaLeft" | "stageStudio.layoutVisualThree";
  descriptionKey: "stageStudio.layoutMediaLeftDesc" | "stageStudio.layoutVisualThreeDesc";
  preview: "media-left" | "visual-three";
};

export const STAGE_QUESTION_LAYOUTS = [
  {
    id: "media_left_choices_right",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    preview: "media-left",
  },
  {
    id: "visual_choices_three",
    labelKey: "stageStudio.layoutVisualThree",
    descriptionKey: "stageStudio.layoutVisualThreeDesc",
    preview: "visual-three",
  },
] as const satisfies readonly StageQuestionLayoutDefinition[];

export function getStageQuestionLayoutDefinition(layoutId: StageQuestionLayout): StageQuestionLayoutDefinition {
  return STAGE_QUESTION_LAYOUTS.find((layout) => layout.id === layoutId) ?? STAGE_QUESTION_LAYOUTS[0];
}
