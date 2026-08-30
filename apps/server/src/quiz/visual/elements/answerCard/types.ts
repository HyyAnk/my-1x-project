import type { QuizAnswerCardStyle, QuizPreviewLayoutId } from "@studio/shared";
import type { ElementRenderContext, VisualElementVariant } from "../types.js";

export type AnswerCardRenderInput = ElementRenderContext & {
  choices: string[];
  correctIndex: number;
  phase: "question" | "choices" | "thinking" | "reveal" | "explain";
  layoutId?: QuizPreviewLayoutId;
  paletteAccent?: string;
  assets?: Record<string, string>;
  hasMascot?: boolean;
};

export type AnswerCardVariant = VisualElementVariant<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardRenderInput>;
