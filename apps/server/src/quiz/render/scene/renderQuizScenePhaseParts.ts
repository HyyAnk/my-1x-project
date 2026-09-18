import { isUnifiedQuizFrame, renderQuizPhaseSlots } from "../frame/renderQuizFrameBody.js";
import type { QuizPreviewLayoutId, MascotRenderAspectRatio } from "@studio/shared";

export type RenderQuizScenePhasePartsInput = {
  layoutId: QuizPreviewLayoutId;
  aspectRatio: MascotRenderAspectRatio;
  thinkingHtml: string;
  factHtml: string;
  omitMysteryFactCard?: boolean;
};

export function shouldRenderFactCard(layoutId: string): boolean {
  if (layoutId === "mystery_reveal") {
    return false;
  }
  return true;
}

export function renderQuizScenePhaseParts(input: RenderQuizScenePhasePartsInput): string {
  const isUnified = isUnifiedQuizFrame(input.layoutId, input.aspectRatio);
  const factVisible = shouldRenderFactCard(input.layoutId);
  const effectiveFactHtml = factVisible ? input.factHtml : "";

  if (!isUnified) {
    return `${input.thinkingHtml}${effectiveFactHtml}`;
  }

  if (!factVisible) {
    return `<div class="quiz-thinking-anchor" data-quiz-fixed="thinking">${input.thinkingHtml}</div>`;
  }

  return renderQuizPhaseSlots(input.thinkingHtml, effectiveFactHtml);
}
