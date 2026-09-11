import { QUIZ_LANDSCAPE_LAYOUT_IDS, type MascotRenderAspectRatio, type QuizPreviewLayoutId } from "@studio/shared";
import type { QuizLayoutSlots } from "../layouts/types.js";

/**
 * Determines if the given layout and aspect ratio use the unified landscape quiz frame.
 * Only the eight active landscape 16:9 layouts are unified; baseline and 9:16 portrait are not.
 */
export function isUnifiedQuizFrame(layoutId: QuizPreviewLayoutId, aspectRatio: MascotRenderAspectRatio): boolean {
  return aspectRatio === "16:9" && (QUIZ_LANDSCAPE_LAYOUT_IDS as readonly string[]).includes(layoutId);
}

/**
 * Renders the shared outer landscape quiz frame containing:
 * - fixed question card anchor
 * - layout-owned content arena
 * - fixed phase region (thinking bar / fact card dock)
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
