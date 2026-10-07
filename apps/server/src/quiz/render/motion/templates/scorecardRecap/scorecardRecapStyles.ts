import type { MascotRenderAspectRatio } from "@studio/shared";

export interface ScorecardRecapStyleOptions {
  accentColor?: string;
  aspectRatio?: MascotRenderAspectRatio;
}

/**
 * Returns scoped CSS rules for the Scorecard Recap motion outro.
 */
export function scorecardRecapStyles(options: ScorecardRecapStyleOptions = {}): string {
  const gold = options.accentColor || "#FFD700";
  const isVertical = options.aspectRatio === "9:16";

  return `
.motion-scorecard-recap {
  --score-gold: ${gold};
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at center, #1f1435 0%, #0c0717 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: #ffffff;
}

.scorecard-confetti-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, #ff007f 3px, transparent 4px),
    radial-gradient(circle, #00ffff 3px, transparent 4px),
    radial-gradient(circle, #ffd700 4px, transparent 5px),
    radial-gradient(circle, #00ff66 3px, transparent 4px);
  background-size: 120px 120px, 90px 90px, 150px 150px, 110px 110px;
  background-position: 10px 10px, 40px 60px, 80px 20px, 30px 90px;
  opacity: 0;
  animation: confetti-pop 0.8s ease-out 0.2s forwards;
}

.scorecard-trophy-badge {
  font-size: ${isVertical ? "56px" : "72px"};
  line-height: 1;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
  opacity: 0;
  transform: scale(0.3) rotate(-15deg);
  animation: trophy-bounce 0.6s cubic-bezier(0.18, 1.35, 0.3, 1) 0.15s forwards;
}

.scorecard-board {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${isVertical ? "28px 24px" : "36px 48px"};
  max-width: ${isVertical ? "88%" : "72%"};
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 215, 0, 0.4);
  border-radius: 28px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(255, 215, 0, 0.2);
  opacity: 0;
  transform: translateY(24px);
  animation: board-slam 0.5s ease-out 0.25s forwards;
}

.scorecard-headline {
  font-size: ${isVertical ? "32px" : "44px"};
  font-weight: 900;
  letter-spacing: -0.01em;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.scorecard-subtext {
  font-size: ${isVertical ? "18px" : "22px"};
  font-weight: 700;
  color: var(--score-gold);
  margin: 0 0 16px 0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scorecard-cta-pill {
  display: inline-block;
  font-size: ${isVertical ? "16px" : "19px"};
  font-weight: 800;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  color: #ffffff;
}

.scorecard-mascot-slot {
  position: absolute;
  bottom: ${isVertical ? "50px" : "30px"};
  right: ${isVertical ? "50%" : "60px"};
  transform: ${isVertical ? "translateX(50%) scale(0.85)" : "none"};
  z-index: 15;
  opacity: 0;
  animation: board-slam 0.6s ease-out 0.4s forwards;
}

@keyframes confetti-pop {
  0% { opacity: 0; transform: scale(0.7); }
  60% { opacity: 0.8; }
  100% { opacity: 0.45; transform: scale(1); }
}

@keyframes trophy-bounce {
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes board-slam {
  to { opacity: 1; transform: translateY(0); }
}
`.trim();
}
