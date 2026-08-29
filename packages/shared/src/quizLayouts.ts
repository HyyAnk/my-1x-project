import { z } from "zod";
import { QuizLayoutIdSchema, type DirectorArchetype, type QuizLayoutId, type QuizQuestionFormat } from "./enums.js";

export const ResolvedQuizLayoutIdSchema = QuizLayoutIdSchema.exclude(["auto"]);
export type ResolvedQuizLayoutId = z.infer<typeof ResolvedQuizLayoutIdSchema>;

export const QuizPreviewLayoutIdSchema = z.union([ResolvedQuizLayoutIdSchema, z.literal("baseline")]);
export type QuizPreviewLayoutId = z.infer<typeof QuizPreviewLayoutIdSchema>;

export type QuizLayoutCatalogItem = {
  id: ResolvedQuizLayoutId;
  choiceMode: "text" | "visual";
  supportedChoiceCounts: readonly number[];
  recommendedFormats: readonly QuizQuestionFormat[];
};

export const QUIZ_LAYOUT_CATALOG = {
  media_left_choices_right: {
    id: "media_left_choices_right",
    choiceMode: "text",
    supportedChoiceCounts: [2, 3],
    recommendedFormats: ["multiple_choice", "image_guess", "true_false"],
  },
  visual_choices_three: {
    id: "visual_choices_three",
    choiceMode: "visual",
    supportedChoiceCounts: [3],
    recommendedFormats: ["odd_one_out"],
  },
} as const satisfies Record<ResolvedQuizLayoutId, QuizLayoutCatalogItem>;

export const QUIZ_LAYOUTS = Object.values(QUIZ_LAYOUT_CATALOG);

export function resolveQuizLayoutId(input: {
  requestedLayout: QuizLayoutId;
  archetype: DirectorArchetype;
  questionFormat: QuizQuestionFormat;
}): ResolvedQuizLayoutId {
  if (input.requestedLayout !== "auto") return input.requestedLayout;
  if (input.archetype === "visual_multiple_choice" || input.questionFormat === "odd_one_out") return "visual_choices_three";
  return "media_left_choices_right";
}

export function supportsQuizLayoutChoiceCount(layoutId: ResolvedQuizLayoutId, choiceCount: number): boolean {
  return (QUIZ_LAYOUT_CATALOG[layoutId].supportedChoiceCounts as readonly number[]).includes(choiceCount);
}
