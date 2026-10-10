import { isQuizLandscapeLayoutId, isQuizPortraitLayoutId, type MascotRenderAspectRatio, type QuizPreviewLayoutId } from "@studio/shared";
import type { QuizLayoutSlots } from "../layouts/types.js";

/**
 * Determines if the given layout and aspect ratio use a unified quiz frame with fixed anchors:
 * the seven landscape layouts on 16:9 and the four portrait Quiz Short layouts on 9:16.
 * Baseline and mismatched layout/canvas pairs fall back to the legacy flowing stage.
 */
export function isUnifiedQuizFrame(layoutId: QuizPreviewLayoutId, aspectRatio: MascotRenderAspectRatio): boolean {
  if (aspectRatio === "16:9") return isQuizLandscapeLayoutId(layoutId);
  return isPortraitQuizFrame(layoutId, aspectRatio);
}

/** True only for a portrait Quiz Short layout rendered on the 9:16 canvas. */
export function isPortraitQuizFrame(layoutId: QuizPreviewLayoutId, aspectRatio: MascotRenderAspectRatio): boolean {
  return aspectRatio === "9:16" && isQuizPortraitLayoutId(layoutId);
}

/**
 * Renders the shared outer quiz frame containing:
 * - fixed question card anchor
 * - layout-owned content arena
 * - fixed phase region (thinking bar or ring timer / fact card dock)
 */
export function renderQuizFrameBody(slots: QuizLayoutSlots, contentHtml: string): string {
  return (
    `<div class="quiz-question-anchor" data-quiz-fixed="question">${slots.questionBoxHtml}</div>` +
    `<div class="quiz-content-anchor" data-quiz-content>${contentHtml}</div>` +
    `<div class="phase-region">${slots.phaseHtml}</div>`
  );
}

/**
 * Renders separate fixed anchors for the thinking bar and fact card docks.
 */
export function renderQuizPhaseSlots(thinkingHtml: string, factHtml: string): string {
  return (
    `<div class="quiz-thinking-anchor" data-quiz-fixed="thinking">${thinkingHtml}</div>` +
    `<div class="quiz-fact-anchor" data-quiz-fixed="fact">${factHtml}</div>`
  );
}
