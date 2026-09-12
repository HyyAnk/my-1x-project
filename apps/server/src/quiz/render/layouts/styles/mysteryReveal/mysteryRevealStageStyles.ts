/**
 * Returns the dual-state hero stage styles: mosaic / silhouette mask layer,
 * pristine revealed layer, and neon laser scanner bar for the Mystery Reveal
 * layout.
 */
export function mysteryRevealStageStyles(): string {
  return `
/* Dual-State Hero Stage */
.layout-mystery_reveal .mystery-hero-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-layer .hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-mystery_reveal .mystery-layer .hero-image img {
  width: 100%;
  height: 100%;
  max-width: 85%;
  max-height: 76%;
  object-fit: contain;
}

/* State A: Mosaic / Silhouette Mask Layer (BUG-MR-06 Bulletproof Fallback) */
.layout-mystery_reveal .mystery-mosaic-layer {
  z-index: 2;
  opacity: 1;
  transition: opacity 0.4s ease;
}

.layout-mystery_reveal .mystery-mosaic-layer img {
  filter: blur(20px) contrast(180%) brightness(0.82) drop-shadow(0 20px 32px rgba(0, 0, 0, 0.6));
  animation: mystery-hero-shimmer 3.2s ease-in-out infinite alternate;
  will-change: filter, transform;
}

@supports (filter: url('#mystery-mosaic-filter')) {
  .layout-mystery_reveal .mystery-mosaic-layer img {
    filter: url(#mystery-mosaic-filter) blur(4px) contrast(140%) brightness(0.85) drop-shadow(0 20px 32px rgba(0, 0, 0, 0.6));
  }
}

.layout-mystery_reveal.is-silhouette .mystery-mosaic-layer img {
  filter: brightness(0) drop-shadow(0 16px 36px rgba(0, 0, 0, 0.75));
}

/* State B: Pristine Revealed Layer (Curtain Stencil Wiped from Left to Right - BUG-MR-04 Alignment Fix) */
.layout-mystery_reveal .mystery-revealed-layer {
  z-index: 3;
  width: 0%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.layout-mystery_reveal .mystery-revealed-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--mystery-stage-width, 1100px);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quiz-frame-unified.layout-mystery_reveal .mystery-revealed-inner {
  width: var(--slot-hero-width, 920px);
  height: var(--slot-hero-height, 360px);
}

.layout-mystery_reveal .mystery-revealed-layer img {
  filter: drop-shadow(0 24px 44px rgba(0, 0, 0, 0.55));
}

/* Scanner Bar: High-Voltage Neon Laser Line */
.layout-mystery_reveal .mystery-scanner-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  z-index: 6;
  opacity: 0;
  pointer-events: none;
}

.layout-mystery_reveal .scanner-beam {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0) 0%, #38bdf8 20%, #ffffff 50%, #38bdf8 80%, rgba(56, 189, 248, 0) 100%);
  box-shadow: 0 0 16px #38bdf8, 0 0 36px #0284c7, 0 0 60px rgba(56, 189, 248, 0.7);
}

.layout-mystery_reveal .scanner-flare {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 240px;
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(56, 189, 248, 0.7) 45%, transparent 75%);
  filter: blur(4px);
}
`;
}
