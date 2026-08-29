import type { MascotRenderAspectRatio, QuizPreviewLayoutId } from "@studio/shared";
import { baselineLayout } from "./baseline.js";
import { mediaLeftChoicesRightLayout } from "./mediaLeftChoicesRight.js";
import type { QuizLayoutRenderDefinition, QuizLayoutSlots } from "./types.js";
import { visualChoicesThreeLayout } from "./visualChoicesThree.js";

export const QUIZ_LAYOUT_RENDERERS = {
  baseline: baselineLayout,
  media_left_choices_right: mediaLeftChoicesRightLayout,
  visual_choices_three: visualChoicesThreeLayout,
} satisfies Record<QuizPreviewLayoutId, QuizLayoutRenderDefinition>;

export const QUIZ_LAYOUT_DIMENSIONS = {
  baseline: baselineLayout.dimensions,
  media_left_choices_right: mediaLeftChoicesRightLayout.dimensions,
  visual_choices_three: visualChoicesThreeLayout.dimensions,
} as const;

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
