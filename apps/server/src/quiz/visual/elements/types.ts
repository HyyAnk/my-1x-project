import type { QuizPalette } from "../types.js";
import type { QuizThinkingBarStyle, QuizQuestionCounterStyle, QuizQuestionBoxStyle } from "@studio/shared";

export type ElementRenderContext = {
  clipStart?: number;
  revealStart?: number;
  choicesStart?: number;
  thinkingStart?: number;
  rewardStart?: number;
  end?: number;
  duration?: number;
  questionIndex?: number;
  questionNumber?: number;
  questionCount?: number;
  palette?: QuizPalette;
};

export interface VisualElementVariant<TStyleId extends string, TContext extends ElementRenderContext = ElementRenderContext> {
  id: TStyleId;
  displayName: string;
  description: string;
  renderHtml(context: TContext): string;
  renderCss(): string;
}
