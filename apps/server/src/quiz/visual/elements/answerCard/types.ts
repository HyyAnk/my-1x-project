import type { QuizAnswerCardStyle } from "@studio/shared";
import type { ElementRenderContext, VisualElementVariant } from "../types.js";

export type AnswerCardRenderInput = ElementRenderContext & {
  choices: string[];
  correctIndex: number;
  phase: "question" | "choices" | "thinking" | "reveal" | "explain";
  layoutId?: "media_left_choices_right" | "visual_choices_three" | "baseline";
  paletteAccent?: string;
  assets?: Record<string, string>;
};

export type AnswerCardVariant = VisualElementVariant<Exclude<QuizAnswerCardStyle, "auto">, AnswerCardRenderInput>;
