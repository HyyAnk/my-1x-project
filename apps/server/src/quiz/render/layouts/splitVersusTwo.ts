import type { QuizLayoutRenderDefinition } from "./types.js";
import { renderQuizFrameBody } from "../frame/renderQuizFrameBody.js";
import { getSplitVersusTwoCss } from "./styles/splitVersusTwoStyles.js";

/**
 * Split Versus Two Layout (16:9 Landscape Video, 1920×1080).
 *
 * Tailored specifically for head-to-head 1v1 faceoffs, rivalry comparisons, and versus battles.
 * Standardized directly to the canonical 1420px Mascot-Ready grid.
 * Architectural highlights:
 * 1. 2-Column Grid Arena: 1360px width with calibrated 56px central collision gap on 1420px Mascot-Ready stage.
 * 2. High-Impact Central "VS" Emblem: 112px 3D candy medallion with comic typography, neon glow,
 *    and dynamic entrance slamming down from above.
 * 3. Multi-Phase Stagger Protection: Card 1 (Challenger) charges from left, Card 2 (Defender) charges from right,
 *    strictly keyed to calc(var(--clip-start, 0s) + var(--choices-at, 0s)).
 * 4. Dual Mode Support:
 *    - Visual Mode: 410px media container with calibrated 116px badge and zero overlap clash.
 *    - Text Mode: Heroic Challenger Cards with vertical flex orientation, centered crest badge,
 *      and calibrated typography.
 * 5. Player 1 (Crimson) vs Player 2 (Azure) combat rivalry depth shadows and badge gradients.
 * 6. Phase 4 Battle Climax: Winner receives golden neon coronation aura; loser dims and sinks;
 *    VS badge bursts toward champion.
 * 7. Thinking Bar Containment: Width constrained to min(82vw, 1280px), guaranteeing the 192px star marker
 *    stops safely. Fact card width min(1280px, 100%).
 * 8. Mascot Coexistence: Unified 1420px grid natively accommodating mascot coexistence without override bloat.
 */
export const splitVersusTwoLayout = {
  id: "split_versus_two",
  renderBody: (slots) => renderQuizFrameBody(slots, slots.choicesHtml),
  css: (aspectRatio) => getSplitVersusTwoCss(aspectRatio),
} satisfies QuizLayoutRenderDefinition;
