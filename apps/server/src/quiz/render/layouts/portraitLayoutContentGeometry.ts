import { QUIZ_PORTRAIT_LAYOUT_GEOMETRY, type QuizPortraitLayoutId } from "@studio/shared";
import { mapAnswerVariants, type LayoutContentGeometry } from "./layoutContentGeometry.js";

/** Portrait counterpart of LAYOUT_CONTENT_GEOMETRY, derived from the shared Quiz Short layout catalog. */
export const PORTRAIT_LAYOUT_CONTENT_GEOMETRY: Readonly<Record<QuizPortraitLayoutId, LayoutContentGeometry>> = Object.freeze({
  short_stack_list: Object.freeze({
    hero: null,
    answers: mapAnswerVariants(QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_stack_list.answerVariants),
  }),
  short_media_top_choices: Object.freeze({
    hero: QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_media_top_choices.hero,
    answers: mapAnswerVariants(QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_media_top_choices.answerVariants),
  }),
  short_versus_two: Object.freeze({
    hero: null,
    answers: mapAnswerVariants(QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_versus_two.answerVariants),
  }),
  short_verdict_yes_no: Object.freeze({
    hero: QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_verdict_yes_no.hero,
    answers: mapAnswerVariants(QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_verdict_yes_no.answerVariants),
  }),
});
