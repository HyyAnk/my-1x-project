import type { QuizQuestionBoxStyle } from "@studio/shared";
import type { VisualElementVariant } from "../types.js";
import type { TextTier } from "../../types.js";

export type QuestionBoxRenderInput = {
  question: string;
  visualOpportunity?: string;
  tier: TextTier;
  questionNumber?: number;
  highlightedHtml?: string;
  paletteAccent?: string;
};

export type QuestionBoxVariant = VisualElementVariant<Exclude<QuizQuestionBoxStyle, "auto">, QuestionBoxRenderInput>;
