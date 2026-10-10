import { QUIZ_PORTRAIT_LAYOUT_GEOMETRY, type MascotRenderAspectRatio, type QuizRect } from "@studio/shared";
import { portraitChoiceTypographyTokens } from "../portraitChoiceTokens.js";

const SCOPE = ".quiz-frame-portrait.layout-short_versus_two";
const GEOMETRY = QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_versus_two;

function versusBadgeRect(): QuizRect | null {
  const badge = GEOMETRY.extra?.versusBadge;
  return badge && typeof badge === "object" ? (badge as QuizRect) : null;
}

function contenderCardCss(): string {
  const variant = GEOMETRY.answerVariants[2];
  const slot = GEOMETRY.imageSlot;
  const card = GEOMETRY.cardSize;
  if (!variant || !slot || !card) return "";
  const arena = GEOMETRY.arena;
  const cardYs = (GEOMETRY.extra?.cardYs as readonly number[] | undefined) ?? [arena.y, arena.y];
  const columns = variant.outer
    .map((label, index) => {
      const top = (cardYs[index] ?? arena.y) - arena.y;
      return `${SCOPE} .choice-card:nth-child(${index + 1}) { left: ${label.x - arena.x}px; top: ${top}px; }
${SCOPE} .choice-card:nth-child(${index + 1}) .visual-answer-label { top: ${label.y - (cardYs[index] ?? arena.y)}px; }`;
    })
    .join("\n");
  const label = variant.outer[0];
  return `
${SCOPE} .choice-group, ${SCOPE} .visual-answer-grid { position: absolute; inset: 0; display: block; width: ${arena.width}px; height: ${arena.height}px; margin: 0; padding: 0; }
${SCOPE} .choice-card { position: absolute; width: ${card.width}px; height: ${label.y + label.height - arena.y}px; margin: 0; }
${SCOPE} .choice-media { width: ${card.width}px; height: ${card.height}px; border: ${slot.borderEachSide}px solid #FFFFFF; border-radius: 36px; box-sizing: border-box; }
${SCOPE} .choice-media img { width: ${slot.viewport.width}px; height: ${slot.viewport.height}px; object-fit: ${slot.viewport.fit}; }
${SCOPE} .visual-answer-label { position: absolute; left: 0; width: ${label.width}px; height: ${label.height}px; min-height: ${label.height}px; margin: 0; padding: 0 20px; box-sizing: border-box; border-radius: 999px; justify-content: center; }
${columns}
`;
}

function versusBadgeCss(): string {
  const badge = versusBadgeRect();
  if (!badge) return "";
  const arena = GEOMETRY.arena;
  return `
${SCOPE} .short-versus-badge { position: absolute; z-index: 7; left: ${badge.x - arena.x}px; top: ${badge.y - arena.y}px; width: ${badge.width}px; height: ${badge.height}px; display: grid; place-items: center; border: 7px solid #FFFFFF; border-radius: 50%; background: linear-gradient(145deg, #FF6277 0%, #C026D3 100%); color: #FFFFFF; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 52px; font-weight: 900; box-shadow: 0 10px 0 rgba(13,35,71,.24), 0 16px 32px rgba(13,35,71,.22); transform: rotate(-8deg); animation: short-pop-in .36s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start, 0s) + var(--choices-at, 0s)) both; }
`;
}

/**
 * Short Versus Two (9:16 Quiz Short, 1080x1920): two 3:4 contender cards side by side with a
 * centered label under each and a VS emblem between them.
 */
export function shortVersusTwoStyles(aspectRatio?: MascotRenderAspectRatio): string {
  if (aspectRatio !== "9:16") return "";
  return `
/* === Short Versus Two Layout: Portrait Geometry === */
.layout-short_versus_two { ${portraitChoiceTypographyTokens()}; --choice-surface-height: ${GEOMETRY.answerVariants[2]?.text[0]?.height ?? 88}px; }
${contenderCardCss()}
${versusBadgeCss()}
`;
}
