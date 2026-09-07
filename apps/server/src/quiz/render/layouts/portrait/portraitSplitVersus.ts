import type { QuizLayoutRenderDefinition } from "../types.js";
import { getPortraitSplitVersusCss } from "./styles/portraitSplitVersusStyles.js";

/**
 * Portrait Split Versus Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural highlights:
 * 1. Safe-Zone Guarantee: Content column width 860px (x: 56px -> 916px) guaranteeing >= 164px
 *    clearance from the right canvas edge (protecting from TikTok Like/Comment/Share action rail).
 * 2. Inviolable Anchor Clearance: Stage margin-top: 184px strictly clears the top counter badge.
 * 3. Elevated Stage Floor: Stage ends at y <= 1260px, guaranteeing > 220px clean buffer above
 *    the mandatory 440px bottom overlay zone (total clean bottom margin > 660px).
 * 4. Harmonized Center Axis: Question card, Card A, VS Badge, Card B, and Phase Region all share
 *    the identical horizontal center axis (x = 486px).
 * 5. Multi-Phase Stagger Fix: Choice entrance animations properly incorporate var(--choices-at).
 * 6. Dual-Rival Candy Styling: Card A (Strawberry Coral) vs Card B (Electric Azure) with glowing VS badge.
 */
export const portraitSplitVersusLayout = {
  id: "portrait_split_versus",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => getPortraitSplitVersusCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;

