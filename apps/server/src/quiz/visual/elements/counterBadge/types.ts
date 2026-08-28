import type { QuizQuestionCounterStyle } from "@studio/shared";
import type { VisualElementVariant } from "../types.js";

export type CounterBadgeRenderInput = {
  questionNumber: number;
  totalQuestions?: number;
  paletteAccent?: string;
  isFinal?: boolean;
};

export type CounterBadgeVariant = VisualElementVariant<Exclude<QuizQuestionCounterStyle, "auto">, CounterBadgeRenderInput>;
