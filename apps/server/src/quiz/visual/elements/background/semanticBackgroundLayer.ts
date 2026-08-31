import type { QuizBackgroundVariantId } from "./types.js";

export function renderSemanticBackgroundLayer(id: QuizBackgroundVariantId, variantClass: string, content: string): string {
  return `<div class="quiz-scene-background" data-background-style="${id}" data-layout-ignore aria-hidden="true"><div class="${variantClass}">${content}</div></div>`;
}

export function semanticBackgroundLayerCss(): string {
  return ".quiz-scene-background { position: absolute; z-index: 0; inset: 0; overflow: hidden; pointer-events: none; }";
}
