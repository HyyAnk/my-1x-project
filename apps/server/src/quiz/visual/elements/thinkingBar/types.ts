import type { QuizThinkingBarStyle } from "@studio/shared";
import type { ElementRenderContext, VisualElementVariant } from "../types.js";

export type ThinkingBarRenderInput = {
  clipStart: number;
  revealStart: number;
  thinkingStart?: number;
  duration?: number;
  questionNumber?: number;
  paletteAccent?: string;
};

export type ThinkingBarTiming = {
  duration: number;
  cd5: number;
  cd4: number;
  cd3: number;
  cd2: number;
  cd1: number;
  queryDuration: number;
  styleAttr: string;
};

export function calculateThinkingBarTiming(input: { clipStart: number; revealStart: number }): ThinkingBarTiming {
  const duration = Math.max(0.05, input.revealStart - input.clipStart);
  const cd5 = Math.max(0, duration - 5);
  const cd4 = Math.max(0, duration - 4);
  const cd3 = Math.max(0, duration - 3);
  const cd2 = Math.max(0, duration - 2);
  const cd1 = Math.max(0, duration - 1);
  const queryDuration = cd5;
  const styleAttr = `style="--timer-duration:${duration.toFixed(3)}s;--cd-query-dur:${queryDuration.toFixed(3)}s;--cd5-at:${cd5.toFixed(3)}s;--cd4-at:${cd4.toFixed(3)}s;--cd3-at:${cd3.toFixed(3)}s;--cd2-at:${cd2.toFixed(3)}s;--cd1-at:${cd1.toFixed(3)}s"`;
  return { duration, cd5, cd4, cd3, cd2, cd1, queryDuration, styleAttr };
}

export type ThinkingBarVariant = VisualElementVariant<Exclude<QuizThinkingBarStyle, "auto">, ThinkingBarRenderInput>;
