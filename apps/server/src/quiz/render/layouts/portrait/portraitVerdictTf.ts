import type { QuizLayoutRenderDefinition } from "../types.js";
import { getPortraitVerdictTfCss } from "./styles/portraitVerdictTfStyles.js";

/**
 * Portrait Verdict True/False Layout (9:16 Vertical Video).
 *
 * Tailored specifically for 1080×1920 mobile portrait video (TikTok, YouTube Shorts, Instagram Reels).
 * Architectural requirements:
 * 1. Question Box: Centered statement card style, max-width ~880px, clears the top counter badge (margin-top: 176px).
 * 2. Center Visual: Large prominent visual area (860px width × 540px height), rounded-3xl borders, glowing depth shadow.
 * 3. True / False Choice Buttons:
 *    - 2 oversized high-contrast 3D arcade pill buttons (width: 720px, height: 124px).
 *    - TRUE: Emerald Green styling (#10B981 / #059669 gradient) with 14px solid base lip (0 14px 0 #047857), bold text, and checkmark (✓).
 *    - FALSE: Rose Red styling (#F43F5E / #E11D48 gradient) with 14px solid base lip (0 14px 0 #9F1239), bold text, and cross (✕).
 *    - Safe-zone clearance: >= 140px right padding (padding-right: 140px) providing >= 250px right margin protecting choices from TikTok/Reels rail.
 * 4. Synchronized Multi-Phase Timeline:
 *    - Phase 2 entrance animations coupled to var(--choices-at) with spring overshoot: calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.06s) and + 0.16s.
 *    - Phase 4 reveal animations with high-specificity victory bloom (@keyframes verdict-correct-pop) and settlement (@keyframes verdict-incorrect-settle).
 * 5. Embedded Phase Region & Co-Axial Alignment:
 *    - Placed directly below choices, sharing the exact same vertical center line (x = 470px) as the buttons with >= 250px right clearance.
 *    - Elevated Thinking Bar and Fact Card sit at or above y = 1480px, guaranteeing >= 440px clean bottom buffer.
 *    - Fact Card constrained to 720px, preventing encroachment into the 140px right action rail.
 */
export const portraitVerdictTfLayout = {
  id: "portrait_verdict_tf",
  renderBody: (slots) =>
    `${slots.questionBoxHtml}${slots.heroHtml}${slots.choicesHtml}<div class="phase-region portrait-phase-embedded">${slots.phaseHtml}</div>`,
  css: (aspectRatio) => getPortraitVerdictTfCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;

