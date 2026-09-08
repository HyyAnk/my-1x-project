/**
 * Returns the @keyframes animation definitions for the Clue Deduction layout.
 */
export function clueDeductionAnimationStyles(): string {
  return `
/* --- Keyframe Animations --- */
@keyframes clue-stage-enter {
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes clue-pip-activate {
  0% {
    color: rgba(148, 163, 184, 0.8);
    background: rgba(30, 41, 59, 0.6);
    transform: scale(0.9);
  }
  50% {
    color: #ffffff;
    background: rgba(56, 189, 248, 0.4);
    border-color: #38bdf8;
    transform: scale(1.1);
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.8);
  }
  100% {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.18);
    border-color: rgba(56, 189, 248, 0.6);
    transform: scale(1);
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
  }
}

@keyframes clue-pip-unmask-amber {
  0% {
    color: rgba(148, 163, 184, 0.8);
    background: rgba(30, 41, 59, 0.6);
  }
  50% {
    color: #ffffff;
    background: rgba(245, 158, 11, 0.45);
    border-color: #f59e0b;
    transform: scale(1.12);
    box-shadow: 0 0 18px rgba(245, 158, 11, 0.8);
  }
  100% {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.18);
    border-color: rgba(245, 158, 11, 0.6);
    transform: scale(1);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  }
}

@keyframes clue-pip-unmask-gold {
  0% {
    color: rgba(148, 163, 184, 0.8);
    background: rgba(30, 41, 59, 0.6);
  }
  50% {
    color: #ffffff;
    background: rgba(251, 191, 36, 0.5);
    border-color: #fbbf24;
    transform: scale(1.15);
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.9);
  }
  100% {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.7);
    transform: scale(1);
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
  }
}

@keyframes clue-status-fade-out {
  to {
    opacity: 0;
    pointer-events: none;
  }
}

@keyframes clue-status-solved-in {
  0% {
    opacity: 0;
    transform: scale(0.7) rotate(-4deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.1) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes clue-loupe-sweep {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85);
  }
  15% {
    opacity: 0.9;
    transform: translate(-65%, -55%) scale(1);
  }
  50% {
    opacity: 0.9;
    transform: translate(-35%, -45%) scale(1.05);
  }
  85% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.15);
  }
}

@keyframes clue-hero-gentle-float {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-6px) scale(1.018); }
}

@keyframes clue-reveal-pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 18px 32px rgba(0, 0, 0, 0.65));
  }
  45% {
    transform: scale(1.055);
    filter: drop-shadow(0 24px 44px rgba(251, 191, 36, 0.5)) brightness(1.12);
  }
  100% {
    transform: scale(1.025);
    filter: drop-shadow(0 20px 36px rgba(0, 0, 0, 0.65)) brightness(1.03);
  }
}

@keyframes clue-glow-reveal {
  0% {
    background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 70%);
    filter: blur(28px);
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    background: radial-gradient(circle, rgba(251, 191, 36, 0.38) 0%, rgba(251, 191, 36, 0) 72%);
    filter: blur(34px);
    transform: translate(-50%, -50%) scale(1.28);
  }
}

@keyframes clue-suspect-enter {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes clue-answer-dock {
  0% {
    opacity: 0;
    transform: translateY(32px) scale(0.9);
  }
  70% {
    transform: translateY(-4px) scale(1.03);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes clue-correct-dock {
  0% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.045);
  }
  100% {
    transform: translateY(-4px) scale(1.025);
  }
}
`;
}
