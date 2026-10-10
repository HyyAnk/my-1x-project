import type { MascotRenderAspectRatio, QuizLandscapeLayoutId, QuizPreviewLayoutId } from "@studio/shared";
import { baselineLayout } from "./baseline.js";
import { fullStackListLayout } from "./fullStackList.js";
import { mediaLeftChoicesRightLayout } from "./mediaLeftChoicesRight.js";
import { splitVersusTwoLayout } from "./splitVersusTwo.js";
import type { QuizLayoutRenderDefinition, QuizLayoutSlots } from "./types.js";
import { verdictYesNoLayout } from "./verdictYesNo.js";
import { visualChoicesThreeLayout } from "./visualChoicesThree.js";
import { visualChoicesThreePureLayout } from "./visualChoicesThreePure.js";
import { mysteryRevealLayout } from "./mysteryReveal.js";
import { QUIZ_PORTRAIT_LAYOUT_RENDERERS } from "./portrait/registry.js";

/** Landscape (Episode) production renderers plus the preview-only baseline. */
export const QUIZ_LAYOUT_RENDERERS = {
  baseline: baselineLayout,
  media_left_choices_right: mediaLeftChoicesRightLayout,
  visual_choices_three: visualChoicesThreeLayout,
  visual_choices_three_pure: visualChoicesThreePureLayout,
  split_versus_two: splitVersusTwoLayout,
  verdict_yes_no: verdictYesNoLayout,
  full_stack_list: fullStackListLayout,
  mystery_reveal: mysteryRevealLayout,
} satisfies Record<QuizLandscapeLayoutId | "baseline", QuizLayoutRenderDefinition>;

/** Every renderable layout id across both canvases. */
export const QUIZ_ALL_LAYOUT_RENDERERS = {
  ...QUIZ_LAYOUT_RENDERERS,
  ...QUIZ_PORTRAIT_LAYOUT_RENDERERS,
} satisfies Record<QuizPreviewLayoutId, QuizLayoutRenderDefinition>;

export { QUIZ_PORTRAIT_LAYOUT_RENDERERS };

export function getQuizLayoutRenderer(layoutId: QuizPreviewLayoutId): QuizLayoutRenderDefinition {
  return QUIZ_ALL_LAYOUT_RENDERERS[layoutId];
}

export function renderQuizLayoutBody(layoutId: QuizPreviewLayoutId, slots: QuizLayoutSlots): string {
  return getQuizLayoutRenderer(layoutId).renderBody(slots);
}

export function quizLayoutCss(aspectRatio: MascotRenderAspectRatio): string {
  return Object.values(QUIZ_ALL_LAYOUT_RENDERERS)
    .map((layout) => layout.css(aspectRatio))
    .join("\n");
}
