/**
 * Returns the evidence exhibition stage styles: hero frame, forensic corner
 * brackets, magnifying loupe reticle, clue hero image, and ambient glow ring
 * for the Clue Deduction layout.
 */
export function clueDeductionEvidenceStyles(): string {
  return `
/* --- Evidence Exhibition Stage --- */
.layout-clue_deduction .clue-card-stage {
  position: absolute;
  top: 46px;
  left: 0;
  right: 0;
  bottom: 96px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-clue_deduction .clue-hero-frame {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 90%;
  max-height: 92%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Brass Forensic Corner Brackets */
.layout-clue_deduction .evidence-bracket {
  position: absolute;
  width: 22px;
  height: 22px;
  pointer-events: none;
  z-index: 5;
  border: 3px solid rgba(251, 191, 36, 0.7);
}
.layout-clue_deduction .bracket-tl { top: 6px; left: 6px; border-right: none; border-bottom: none; }
.layout-clue_deduction .bracket-tr { top: 6px; right: 6px; border-left: none; border-bottom: none; }
.layout-clue_deduction .bracket-bl { bottom: 6px; left: 6px; border-right: none; border-top: none; }
.layout-clue_deduction .bracket-br { bottom: 6px; right: 6px; border-left: none; border-top: none; }

/* Magnifying Loupe Scanner Reticle */
.layout-clue_deduction .clue-loupe-reticle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 180px;
  height: 180px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 6;
  opacity: 0;
  animation: clue-loupe-sweep var(--timer-duration, 5s) ease-in-out calc(var(--clip-start, 0s) + var(--thinking-at, 0s)) both;
}

.layout-clue_deduction .loupe-ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px dashed rgba(56, 189, 248, 0.55);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3), inset 0 0 15px rgba(56, 189, 248, 0.15);
}

.layout-clue_deduction .loupe-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(251, 191, 36, 0.85);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.9);
}

/* Clue Image A: Sharp, Contained, and Prominent */
.layout-clue_deduction .clue-hero-frame > .hero-image {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-clue_deduction .clue-hero-frame > .hero-image img {
  width: 100%;
  height: 100%;
  max-width: 84%;
  max-height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.65));
  transition: transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1), filter 0.6s ease;
}

/* Ambient Radial Glow Ring */
.layout-clue_deduction .clue-glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%);
  filter: blur(28px);
  pointer-events: none;
  z-index: -1;
}

.quiz-question-clip.layout-clue_deduction .clue-glow-ring {
  animation: clue-glow-reveal 0.8s cubic-bezier(0.18, 1.4, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) forwards;
}

/* Clue Image Animations (Gentle Float + Reveal Pulse - BUG-CD-01 Fix) */
.quiz-question-clip.layout-clue_deduction .clue-hero-frame > .hero-image img {
  animation:
    clue-hero-gentle-float 4.8s ease-in-out calc(var(--clip-start, 0s) + 0.5s) infinite alternate,
    clue-reveal-pulse 0.75s cubic-bezier(0.22, 0.8, 0.3, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both;
}

/* Fallbacks for Interactive Sandbox Preview Scrubbers */
.layout-clue_deduction[data-choice-phase="reveal"] .clue-hero-frame > .hero-image img,
.layout-clue_deduction[data-choice-phase="explain"] .clue-hero-frame > .hero-image img,
.layout-clue_deduction.is-revealed .clue-hero-frame > .hero-image img {
  animation: clue-reveal-pulse 0.75s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}

.layout-clue_deduction[data-choice-phase="reveal"] .clue-glow-ring,
.layout-clue_deduction[data-choice-phase="explain"] .clue-glow-ring,
.layout-clue_deduction.is-revealed .clue-glow-ring {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.32) 0%, rgba(251, 191, 36, 0) 72%);
  filter: blur(32px);
  transform: translate(-50%, -50%) scale(1.25);
  transition: all 0.6s ease;
}
`;
}
