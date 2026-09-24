import type { QuizQuestion } from "@studio/shared";
import { serializeQuizPaletteInlineStyle } from "@studio/shared";
import { ambientPhaseSeconds, textLayout } from "../../visual/candyArcade.js";
import type { QuizTemplateScene } from "../../visual/types.js";
import { esc, escAttr, illustrationDataUri } from "./candyArcadeSvg.js";
import { renderCandyRaysDecorations } from "../../visual/elements/background/variants/candyRays.js";
import { calculateThinkingBarTiming } from "../../visual/elements/thinkingBar/types.js";
import type { Copy } from "./quizCopy.js";

export function rewardFx(intensity: "small" | "big"): string {
  const particles = intensity === "big" ? ["★", "✦", "★", "✦", "★", "✦", "★", "✦", "★"] : ["✦", "★", "✦", "★", "✦", "★", "✦"];
  return `<div class="reward-fx reward-${intensity}" data-layout-ignore aria-hidden="true">${particles.map((particle) => `<i>${particle}</i>`).join("")}</div>`;
}

export function imageCard(asset: string | null, subject: string, className: string, seed: number): string {
  return `<figure class="image-card ${className}" data-layout-allow-overflow><img src="${escAttr(asset ?? illustrationDataUri(subject, seed))}" alt="${escAttr(subject)}"><span class="image-shine"></span></figure>`;
}

export function revealPanel(input: { question: QuizQuestion; copy: Copy; isFinal: boolean }): string {
  if (input.question.answer_mode === "single_reveal") {
    return "";
  }
  return `<div class="fact-card" data-layout-allow-occlusion><p>${esc(input.question.explanation || input.question.fun_fact)}</p></div>`;
}

export function sceneDecorations(questionIndex: number): string {
  return renderCandyRaysDecorations(questionIndex);
}

export function styleAttributes(
  visual: QuizTemplateScene,
  layout: ReturnType<typeof textLayout>,
  clipStart: number,
  choicesStart: number,
  thinkingStart: number,
  revealStart: number,
  rewardStart: number,
  clipEnd: number,
  timerHideAt?: number,
  countdownSeconds?: number,
): string {
  const paletteInline = serializeQuizPaletteInlineStyle(visual.palette);
  const thinkingTiming = calculateThinkingBarTiming({
    countdownSeconds,
    clipStart,
    revealStart,
    timerHideAt,
    thinkingStart,
  });
  return `style="${paletteInline}--question-size:${layout.fontSize}px;--question-leading:${layout.lineHeight};--clip-start:${clipStart.toFixed(3)}s;--timer-start:${thinkingTiming.timerStart.toFixed(3)}s;--scene-duration:${Math.max(0.04, clipEnd - clipStart).toFixed(3)}s;--choices-at:${Math.max(0, choicesStart - clipStart).toFixed(3)}s;--thinking-at:${Math.max(0, thinkingStart - clipStart).toFixed(3)}s;--reveal-at:${Math.max(0, revealStart - clipStart).toFixed(3)}s;--reward-at:${Math.max(0, rewardStart - clipStart).toFixed(3)}s;--choices-duration:${Math.max(0.04, revealStart - choicesStart).toFixed(3)}s;--timer-duration:${thinkingTiming.duration.toFixed(3)}s;--query-hold-duration:${thinkingTiming.queryHoldDuration.toFixed(3)}s;--reveal-duration:${Math.max(0.04, rewardStart - revealStart).toFixed(3)}s;--ambient-phase:${ambientPhaseSeconds("drift", 0, String(clipStart))}s"`;
}
