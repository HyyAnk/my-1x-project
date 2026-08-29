import type { QuizLayoutRenderDefinition } from "./types.js";

export const baselineLayout = {
  id: "baseline",
  dimensions: { width: 800, height: 284 },
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.textChoicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: () => "",
} satisfies QuizLayoutRenderDefinition;
