import { QUIZ_PORTRAIT_LAYOUT_GEOMETRY, type MascotRenderAspectRatio } from "@studio/shared";
import { portraitChoiceTypographyTokens, portraitStackedRowsCss } from "../portraitChoiceTokens.js";

const SCOPE = ".quiz-frame-portrait.layout-short_stack_list";
const GEOMETRY = QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_stack_list;

/**
 * Short Stack List (9:16 Quiz Short, 1080x1920): two or three detached-badge rows stacked
 * under the question card, every box derived from the shared portrait geometry.
 */
export function shortStackListStyles(aspectRatio?: MascotRenderAspectRatio): string {
  if (aspectRatio !== "9:16") return "";
  const rows = [2, 3]
    .map((count) => {
      const variant = GEOMETRY.answerVariants[count as 2 | 3];
      return variant ? portraitStackedRowsCss({ scope: SCOPE, arena: GEOMETRY.arena, variant, count }) : "";
    })
    .join("");
  return `
/* === Short Stack List Layout: Portrait Geometry === */
.layout-short_stack_list { ${portraitChoiceTypographyTokens()}; --choice-card-margin-left: 0px; --choice-badge-margin-left: 0px; --choice-text-padding-right: 32px; }
${rows}
${SCOPE} .choice-card .choice-text { text-align: left; }
`;
}
