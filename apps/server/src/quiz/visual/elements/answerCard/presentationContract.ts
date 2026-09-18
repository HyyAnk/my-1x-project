/**
 * Immutable layout rules for detached-badge answer cards.
 *
 * Layouts own the sizing tokens. Skins may paint the badge and surface, but
 * must not change their box geometry, overlap, stacking order, or text inset.
 */
export const DETACHED_ANSWER_CARD_PRESENTATION_CONTRACT = {
  minimumOverlapRatio: 0.27,
  minimumBadgeHeightDeltaPx: 16,
  minimumTextClearancePx: 12,
  badgeZIndex: 5,
  surfaceZIndex: 4,
} as const;

export const ANSWER_CARD_LAYOUT_TOKENS = [
  "--choice-badge-size",
  "--choice-surface-height",
  "--choice-badge-overlap",
  "--choice-surface-padding",
] as const;

export function validateAnswerCardPresentationTokens(css: string, moduleId: string): void {
  const declarationPattern = new RegExp(`(?:^|[;{])\\s*(${ANSWER_CARD_LAYOUT_TOKENS.map(escapeRegExp).join("|")})\\s*:`, "gm");
  const declaration = stripCssComments(css)
    .match(declarationPattern)?.[0]
    .match(/--[a-z0-9-]+/i)?.[0];

  if (declaration) {
    throw new Error(`Answer-card skin CSS cannot declare layout-owned token ${declaration} (${moduleId})`);
  }
}

export function answerCardPresentationContractCss(): string {
  const { badgeZIndex, surfaceZIndex } = DETACHED_ANSWER_CARD_PRESENTATION_CONTRACT;

  return `
/* === Detached Answer Card Presentation Contract === */
#stage .choice-card.choice-card-text[data-choice-variant="detached_badge"],
#stage .choice-card[data-choice-variant="detached_badge"] > .visual-answer-assembly {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  gap: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

#stage .choice-card[data-choice-variant="detached_badge"] > .choice-label,
#stage .choice-card[data-choice-variant="detached_badge"] > .visual-answer-assembly > .choice-label {
  position: relative !important;
  z-index: ${badgeZIndex} !important;
  flex: 0 0 var(--choice-badge-size, 132px) !important;
  align-self: center !important;
  width: var(--choice-badge-size, 132px) !important;
  min-width: var(--choice-badge-size, 132px) !important;
  max-width: var(--choice-badge-size, 132px) !important;
  height: var(--choice-badge-size, 132px) !important;
  min-height: var(--choice-badge-size, 132px) !important;
  max-height: var(--choice-badge-size, 132px) !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}

#stage .choice-card[data-choice-variant="detached_badge"] > .choice-card-surface,
#stage .choice-card[data-choice-variant="detached_badge"] > .visual-answer-assembly > .choice-card-surface {
  position: relative !important;
  z-index: ${surfaceZIndex} !important;
  flex: 1 1 auto !important;
  align-self: center !important;
  width: auto !important;
  min-width: 0 !important;
  height: var(--choice-surface-height, 108px) !important;
  min-height: var(--choice-surface-height, 108px) !important;
  max-height: var(--choice-surface-height, 108px) !important;
  margin-top: 0 !important;
  margin-right: 0 !important;
  margin-bottom: 0 !important;
  padding: var(--choice-surface-padding, 10px 24px) !important;
  box-sizing: border-box !important;
}

#stage .choice-card[data-choice-variant="detached_badge"] > .choice-label + .choice-card-surface,
#stage .choice-card[data-choice-variant="detached_badge"] > .visual-answer-assembly > .choice-label + .choice-card-surface {
  margin-left: calc(-1 * var(--choice-badge-overlap, 38px)) !important;
}
`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripCssComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}
