import type { QuizThinkingBarStyle } from "@studio/shared";
import type { ElementRenderContext, VisualElementVariant } from "../types.js";

export type ThinkingBarRenderInput = {
  clipStart: number;
  questionNarrationStart?: number;
  revealStart: number;
  thinkingStart?: number;
  duration?: number;
  questionNumber?: number;
  paletteAccent?: string;
};

export type ThinkingBarTiming = {
  timerStart: number;
  duration: number;
  cd5: number;
  cd4: number;
  cd3: number;
  cd2: number;
  cd1: number;
  queryHoldDuration: number;
  cd5Show: boolean;
  cd4Show: boolean;
  cd3Show: boolean;
  cd2Show: boolean;
  cd1Show: boolean;
  styleAttr: string;
};

/**
 * STRICT TIMING RULE FOR THINKING BAR:
 * The Thinking Bar MUST always start running from the moment the question appears on screen (`clipStart`).
 * It must NEVER depend on question narration start (`questionNarrationStart`) or thinking audio start (`thinkingStart`).
 * This strict invariant guarantees that no future style, theme, or layout changes will cause the Thinking Bar
 * to desync from the question appearance.
 */
export function calculateThinkingBarTiming(input: {
  clipStart: number;
  questionNarrationStart?: number;
  revealStart: number;
  thinkingStart?: number;
}): ThinkingBarTiming {
  // STRICT INVARIANT: Always anchor timer origin to question appearance (clipStart)
  const timerStart = input.clipStart;
  const duration = Math.max(0.05, input.revealStart - timerStart);
  const cd5Raw = duration - 5;
  const cd4Raw = duration - 4;
  const cd3Raw = duration - 3;
  const cd2Raw = duration - 2;
  const cd1Raw = duration - 1;

  const cd5Show = cd5Raw >= 0;
  const cd4Show = cd4Raw >= 0;
  const cd3Show = cd3Raw >= 0;
  const cd2Show = cd2Raw >= 0;
  const cd1Show = cd1Raw >= 0;

  const cd5 = Math.max(0, cd5Raw);
  const cd4 = Math.max(0, cd4Raw);
  const cd3 = Math.max(0, cd3Raw);
  const cd2 = Math.max(0, cd2Raw);
  const cd1 = Math.max(0, cd1Raw);
  const queryHoldDuration = cd5Show ? cd5 : 0;
  const cssVars = [
    `--timer-start:${timerStart.toFixed(3)}s`,
    `--timer-duration:${duration.toFixed(3)}s`,
    `--query-hold-duration:${queryHoldDuration.toFixed(3)}s`,
    `--query-display:${queryHoldDuration > 0 ? "grid" : "none"}`,
    `--cd5-at:${cd5.toFixed(3)}s`,
    `--cd5-display:${cd5Show ? "grid" : "none"}`,
    `--cd4-at:${cd4.toFixed(3)}s`,
    `--cd4-display:${cd4Show ? "grid" : "none"}`,
    `--cd3-at:${cd3.toFixed(3)}s`,
    `--cd3-display:${cd3Show ? "grid" : "none"}`,
    `--cd2-at:${cd2.toFixed(3)}s`,
    `--cd2-display:${cd2Show ? "grid" : "none"}`,
    `--cd1-at:${cd1.toFixed(3)}s`,
    `--cd1-display:${cd1Show ? "grid" : "none"}`,
  ];

  const styleAttr = `style="${cssVars.join(";")}"`;
  return {
    timerStart,
    duration,
    cd5,
    cd4,
    cd3,
    cd2,
    cd1,
    queryHoldDuration,
    cd5Show,
    cd4Show,
    cd3Show,
    cd2Show,
    cd1Show,
    styleAttr,
  };
}

export type ThinkingBarVariant = VisualElementVariant<Exclude<QuizThinkingBarStyle, "auto">, ThinkingBarRenderInput>;
