import type { QuizLayoutRenderDefinition } from "./types.js";

export const baselineLayout = {
  id: "baseline",
  renderBody: (slots) => `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region">${slots.phaseHtml}</div>`,
  css: () => `
.layout-baseline {
  --choice-card-min-height: 122px;
  --choice-card-height: auto;
  --choice-card-margin-left: 76px;
  --choice-card-padding: 14px 36px 14px 40px;
  --choice-badge-size: 156px;
  --choice-badge-margin-left: -86px;
  --choice-badge-font-size: 80px;
  --choice-font-size-base: 44px;
  --choice-font-size-medium: 38px;
  --choice-font-size-long: 32px;
  --choice-font-size-very_long: 26px;
  --choice-font-size-overflow: 26px;
}
`,
} satisfies QuizLayoutRenderDefinition;
