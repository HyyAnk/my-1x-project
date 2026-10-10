import { QUIZ_PORTRAIT_LAYOUT_GEOMETRY, type MascotRenderAspectRatio } from "@studio/shared";
import { portraitChoiceTypographyTokens, portraitStackedRowsCss } from "../portraitChoiceTokens.js";

const SCOPE = ".quiz-frame-portrait.layout-short_media_top_choices";
const GEOMETRY = QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_media_top_choices;

function heroCss(): string {
  const hero = GEOMETRY.hero;
  const slot = GEOMETRY.imageSlot;
  if (!hero || !slot) return "";
  return `
${SCOPE} .hero-image { position: absolute; left: ${hero.x - GEOMETRY.arena.x}px; top: ${hero.y - GEOMETRY.arena.y}px; width: ${slot.cardBorderBox.width}px; height: ${slot.cardBorderBox.height}px; max-height: ${slot.cardBorderBox.height}px; margin: 0; border: ${slot.borderEachSide}px solid #FFFFFF; border-radius: 38px; box-sizing: border-box; overflow: hidden; box-shadow: 0 16px 0 rgba(13,35,71,.22), 0 24px 44px rgba(10,25,60,.24), inset 0 4px 8px rgba(255,255,255,.5); }
${SCOPE} .hero-image img { width: ${slot.viewport.width}px; height: ${slot.viewport.height}px; object-fit: ${slot.viewport.fit}; border-radius: 26px; }
`;
}

/**
 * Short Media Top Choices (9:16 Quiz Short, 1080x1920): one 4:3 hero image above two or
 * three stacked detached-badge rows.
 */
export function shortMediaTopChoicesStyles(aspectRatio?: MascotRenderAspectRatio): string {
  if (aspectRatio !== "9:16") return "";
  const rows = [2, 3]
    .map((count) => {
      const variant = GEOMETRY.answerVariants[count as 2 | 3];
      return variant ? portraitStackedRowsCss({ scope: SCOPE, arena: GEOMETRY.arena, variant, count }) : "";
    })
    .join("");
  return `
/* === Short Media Top Choices Layout: Portrait Geometry === */
.layout-short_media_top_choices { ${portraitChoiceTypographyTokens()}; --choice-card-margin-left: 0px; --choice-badge-margin-left: 0px; --choice-text-padding-right: 32px; }
${heroCss()}
${rows}
${SCOPE} .choice-card .choice-text { text-align: left; }
`;
}
