import type { QuizLayoutId } from "../enums/quiz/pipelineEnums.js";

export const QUIZ_LANDSCAPE_LAYOUT_IDS = [
  "media_left_choices_right",
  "visual_choices_three",
  "visual_choices_three_pure",
  "split_versus_two",
  "verdict_true_false",
  "full_stack_list",
  "mystery_reveal",
] as const;

export type QuizLandscapeLayoutId = Exclude<QuizLayoutId, "auto">;

export type QuizRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type QuizDimensions = Readonly<{
  width: number;
  height: number;
}>;

export type QuizImageFit = "cover" | "contain";

export type QuizImageSlotSpec = Readonly<{
  cardBorderBox: QuizDimensions;
  mediaBorderBox: QuizDimensions;
  borderEachSide: number;
  viewport: QuizDimensions & { readonly fit: QuizImageFit };
  slot?: QuizDimensions;
}>;

export type QuizChoiceVariantGeometry = Readonly<{
  outer: readonly QuizRect[];
  badge: readonly QuizRect[];
  text: readonly QuizRect[];
  gap?: number;
  overlap?: number;
}>;

export type QuizLayoutGeometry = Readonly<{
  layoutId: QuizLandscapeLayoutId;
  arena: QuizRect;
  hero: QuizRect | null;
  imageSlot: QuizImageSlotSpec | null;
  cardSize?: QuizDimensions;
  answerVariants: Readonly<Partial<Record<0 | 1 | 2 | 3, QuizChoiceVariantGeometry>>>;
  extra?: Readonly<Record<string, unknown>>;
}>;

export type QuizFixedFrameGeometry = Readonly<{
  canvas: QuizDimensions;
  question: QuizRect;
  counter: Readonly<{
    x: number;
    top: number;
    width: number;
    height: number;
    centerX: number;
    bodyCenterY: number;
  }>;
  brand: Readonly<{ centerX: number; top: number; width: number }>;
  thinking: QuizRect;
  factBefore: QuizRect;
  factAfter: QuizRect;
  factBottomClearance: number;
}>;
