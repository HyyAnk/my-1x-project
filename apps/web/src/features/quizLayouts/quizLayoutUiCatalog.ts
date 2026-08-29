import { QUIZ_LAYOUTS, type ResolvedQuizLayoutId } from "@studio/shared";

export type QuizLayoutUiDefinition = {
  id: ResolvedQuizLayoutId;
  labelKey: "stageStudio.layoutMediaLeft" | "stageStudio.layoutVisualThree";
  descriptionKey: "stageStudio.layoutMediaLeftDesc" | "stageStudio.layoutVisualThreeDesc";
  sandboxLabelKey: "visualSandbox.layoutMediaLeftChoicesRight" | "visualSandbox.layoutVisualChoicesThree";
  sandboxDescriptionKey: "visualSandbox.layoutMediaLeftChoicesRightSub" | "visualSandbox.layoutVisualChoicesThreeSub";
  preview: "media-left" | "visual-three";
  icon: "split" | "visual";
};

const QUIZ_LAYOUT_UI_BY_ID = {
  media_left_choices_right: {
    id: "media_left_choices_right",
    labelKey: "stageStudio.layoutMediaLeft",
    descriptionKey: "stageStudio.layoutMediaLeftDesc",
    sandboxLabelKey: "visualSandbox.layoutMediaLeftChoicesRight",
    sandboxDescriptionKey: "visualSandbox.layoutMediaLeftChoicesRightSub",
    preview: "media-left",
    icon: "split",
  },
  visual_choices_three: {
    id: "visual_choices_three",
    labelKey: "stageStudio.layoutVisualThree",
    descriptionKey: "stageStudio.layoutVisualThreeDesc",
    sandboxLabelKey: "visualSandbox.layoutVisualChoicesThree",
    sandboxDescriptionKey: "visualSandbox.layoutVisualChoicesThreeSub",
    preview: "visual-three",
    icon: "visual",
  },
} as const satisfies Record<ResolvedQuizLayoutId, QuizLayoutUiDefinition>;

export const QUIZ_LAYOUT_UI_DEFINITIONS = QUIZ_LAYOUTS.map((layout) => QUIZ_LAYOUT_UI_BY_ID[layout.id]);

export function getQuizLayoutUiDefinition(layoutId: ResolvedQuizLayoutId): QuizLayoutUiDefinition {
  return QUIZ_LAYOUT_UI_BY_ID[layoutId];
}
