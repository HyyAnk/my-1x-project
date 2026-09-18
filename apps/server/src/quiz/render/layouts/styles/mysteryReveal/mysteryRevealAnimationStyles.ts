/**
 * Returns the @keyframes animation definitions for the Mystery Reveal layout.
 */
export function mysteryRevealAnimationStyles(): string {
  return `
/* === Keyframe Animations === */
@keyframes mystery-scanner-sweep {
  0% {
    left: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes mystery-reveal-wipe {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

@keyframes mystery-mosaic-vanish {
  0% {
    opacity: 1;
  }
  85% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
  }
}

@keyframes mystery-answer-dock {
  0% {
    opacity: 0;
    transform: translateY(32px) scale(0.9);
  }
  50% {
    transform: translateY(-8px) scale(1.045);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mystery-surface-dock-win {
  0% {
  }
  50% {
    border-color: #22C55E;
    box-shadow: 0 18px 0 #15803D, 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 44px rgba(74, 222, 128, 0.85);
  }
  100% {
    border-color: #22C55E;
    box-shadow: 0 16px 0 #15803D, 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 36px rgba(34, 197, 94, 0.75);
  }
}

@keyframes mystery-choice-stagger-in {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  70% {
    transform: translateY(-3px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mystery-hero-shimmer {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.025);
  }
}
`;
}
