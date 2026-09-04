import { type MascotRenderAspectRatio, type QuizPreviewLayoutId } from "@studio/shared";
import { baselineLayout } from "./baseline.js";
import { fullStackListLayout } from "./fullStackList.js";
import { mediaLeftChoicesRightLayout } from "./mediaLeftChoicesRight.js";
import { splitVersusTwoLayout } from "./splitVersusTwo.js";
import type { QuizLayoutRenderDefinition, QuizLayoutSlots } from "./types.js";
import { verdictTrueFalseLayout } from "./verdictTrueFalse.js";
import { visualChoicesThreeLayout } from "./visualChoicesThree.js";
import { visualChoicesThreePureLayout } from "./visualChoicesThreePure.js";

export const QUIZ_LAYOUT_RENDERERS = {
  baseline: baselineLayout,
  media_left_choices_right: mediaLeftChoicesRightLayout,
  visual_choices_three: visualChoicesThreeLayout,
  visual_choices_three_pure: visualChoicesThreePureLayout,
  split_versus_two: splitVersusTwoLayout,
  verdict_true_false: verdictTrueFalseLayout,
  full_stack_list: fullStackListLayout,
} satisfies Record<QuizPreviewLayoutId, QuizLayoutRenderDefinition>;

export function getQuizLayoutRenderer(layoutId: QuizPreviewLayoutId): QuizLayoutRenderDefinition {
  return QUIZ_LAYOUT_RENDERERS[layoutId];
}

export function renderQuizLayoutBody(layoutId: QuizPreviewLayoutId, slots: QuizLayoutSlots): string {
  return getQuizLayoutRenderer(layoutId).renderBody(slots);
}

export function quizLayoutCss(aspectRatio: MascotRenderAspectRatio): string {
  return Object.values(QUIZ_LAYOUT_RENDERERS)
    .map((layout) => layout.css(aspectRatio))
    .join("\n");
}
