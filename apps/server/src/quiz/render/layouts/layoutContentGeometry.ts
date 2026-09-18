import type { FrameRect } from "../frame/quizFrame.types.js";
import { QUIZ_LAYOUT_GEOMETRY, type ResolvedQuizLayoutId } from "@studio/shared";

export type LayoutContentGeometry = Readonly<{
  hero: FrameRect | null;
  answers: Readonly<Partial<Record<0 | 1 | 2 | 3, readonly FrameRect[]>>>;
}>;

function mapAnswers(
  variants: (typeof QUIZ_LAYOUT_GEOMETRY)[ResolvedQuizLayoutId]["answerVariants"],
): Readonly<Partial<Record<0 | 1 | 2 | 3, readonly FrameRect[]>>> {
  const result: Partial<Record<0 | 1 | 2 | 3, readonly FrameRect[]>> = {};
  for (const [key, variant] of Object.entries(variants)) {
    const count = Number(key) as 0 | 1 | 2 | 3;
    if (variant) {
      result[count] = variant.outer;
    }
  }
  return Object.freeze(result);
}

export const LAYOUT_CONTENT_GEOMETRY: Readonly<Record<ResolvedQuizLayoutId, LayoutContentGeometry>> = Object.freeze({
  media_left_choices_right: Object.freeze({
    hero: QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.hero,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.answerVariants),
  }),

  visual_choices_three: Object.freeze({
    hero: null,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.visual_choices_three.answerVariants),
  }),

  visual_choices_three_pure: Object.freeze({
    hero: null,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure.answerVariants),
  }),

  split_versus_two: Object.freeze({
    hero: null,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.split_versus_two.answerVariants),
  }),

  verdict_true_false: Object.freeze({
    hero: QUIZ_LAYOUT_GEOMETRY.verdict_true_false.hero,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.verdict_true_false.answerVariants),
  }),

  full_stack_list: Object.freeze({
    hero: null,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.full_stack_list.answerVariants),
  }),

  mystery_reveal: Object.freeze({
    hero: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.hero,
    answers: mapAnswers(QUIZ_LAYOUT_GEOMETRY.mystery_reveal.answerVariants),
  }),
});
