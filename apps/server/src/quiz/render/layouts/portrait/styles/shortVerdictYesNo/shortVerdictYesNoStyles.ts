import { QUIZ_PORTRAIT_LAYOUT_GEOMETRY, type MascotRenderAspectRatio } from "@studio/shared";
import { verdictBinaryButtonStyles } from "../../../styles/verdictBinary/index.js";
import { portraitChoiceTypographyTokens } from "../portraitChoiceTokens.js";

const LAYOUT_CLASS = "layout-short_verdict_yes_no";
const SCOPE = `.quiz-frame-portrait.${LAYOUT_CLASS}`;
const GEOMETRY = QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_verdict_yes_no;

function heroCss(): string {
  const hero = GEOMETRY.hero;
  const slot = GEOMETRY.imageSlot;
  if (!hero || !slot) return "";
  return `
${SCOPE} .hero-image { position: absolute; left: ${hero.x - GEOMETRY.arena.x}px; top: ${hero.y - GEOMETRY.arena.y}px; width: ${slot.cardBorderBox.width}px; height: ${slot.cardBorderBox.height}px; max-height: ${slot.cardBorderBox.height}px; margin: 0; border: ${slot.borderEachSide}px solid #FFFFFF; border-radius: 38px; box-sizing: border-box; overflow: hidden; box-shadow: 0 16px 0 rgba(13,35,71,.22), 0 24px 44px rgba(10,25,60,.24), inset 0 4px 8px rgba(255,255,255,.5); }
${SCOPE} .hero-image img { width: ${slot.viewport.width}px; height: ${slot.viewport.height}px; object-fit: ${slot.viewport.fit}; border-radius: 26px; }
`;
}

function buttonGeometryCss(): string {
  const variant = GEOMETRY.answerVariants[2];
  if (!variant) return "";
  const arena = GEOMETRY.arena;
  const buttons = variant.outer
    .map((rect, index) => `${SCOPE} .choice-card:nth-child(${index + 1}) { left: ${rect.x - arena.x}px; top: ${rect.y - arena.y}px; }`)
    .join("\n");
  const first = variant.outer[0];
  return `
${SCOPE} .choice-group, ${SCOPE} .answer-grid { position: absolute; inset: 0; display: block; width: ${arena.width}px; height: ${arena.height}px; margin: 0; padding: 0; }
${SCOPE} .choice-card { position: absolute; width: ${first.width}px; height: ${first.height}px; min-height: ${first.height}px; max-height: ${first.height}px; margin: 0; --choice-card-height: ${first.height}px; --choice-card-min-height: ${first.height}px; --choice-surface-height: ${first.height}px; }
${SCOPE} .choice-card-surface { height: ${first.height}px; min-height: ${first.height}px; max-height: ${first.height}px; }
${buttons}
`;
}

/**
 * Short Verdict Yes/No (9:16 Quiz Short, 1080x1920): one 4:3 hero image with two oversized
 * pill buttons beneath it. The button skins are shared with the landscape verdict layout.
 */
export function shortVerdictYesNoStyles(aspectRatio?: MascotRenderAspectRatio): string {
  if (aspectRatio !== "9:16") return "";
  return `
/* === Short Verdict Yes/No Layout: Portrait Geometry === */
.${LAYOUT_CLASS} { ${portraitChoiceTypographyTokens()}; }
${heroCss()}
${buttonGeometryCss()}
${verdictBinaryButtonStyles(LAYOUT_CLASS)}
`;
}
