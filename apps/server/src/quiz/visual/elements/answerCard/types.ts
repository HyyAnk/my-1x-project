import type { QuizAnswerCardStyle, QuizChoicePresentation } from "@studio/shared";

export type AnswerCardSemanticState = "pending" | "correct" | "incorrect";

export type AnswerCardSkinHookInput = {
  order: number;
  presentation: QuizChoicePresentation;
  state: AnswerCardSemanticState;
};

export type AnswerCardSkinDecorations = {
  beforeLabelHtml?: string;
  labelSuffixHtml?: string;
};

export type AnswerCardSkin = {
  id: Exclude<QuizAnswerCardStyle, "auto">;
  displayName: string;
  description: string;
  className: string;
  cardClassName?: (input: AnswerCardSkinHookInput) => string;
  renderDecorations?: (input: AnswerCardSkinHookInput) => AnswerCardSkinDecorations;
  renderCss: () => string;
};
