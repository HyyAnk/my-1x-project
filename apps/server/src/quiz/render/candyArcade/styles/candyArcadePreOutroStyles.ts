/**
 * Visual styling and CSS animation keyframes for the Pre-Outro Celebration Scene.
 * Features vibrant 3D headline ("FANTASTIC JOB!"), celebratory confetti blast,
 * floating iridescent bubbles, star sparkles, and sunburst rays.
 */

export function candyArcadePreOutroStylesCss(): string {
  return `
/* Pre-Outro Celebration Stage */
.candy-pre-outro-scene {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 45%, #4C1D95 0%, #311068 35%, #1E0847 70%, #0D0221 100%);
  color: #FFFFFF;
}

/* Background Layers */
.pre-outro-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.pre-outro-rays {
  position: absolute;
  inset: -60%;
  opacity: 0.32;
  background: repeating-conic-gradient(from 0deg, rgba(251, 191, 36, 0.45) 0 8deg, transparent 8deg 24deg);
  animation: pre-outro-ray-spin 36s linear infinite both;
  transform-origin: center center;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.7) 45%, transparent 75%);
  -webkit-mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.7) 45%, transparent 75%);
  pointer-events: none;
}

.pre-outro-halo {
  position: absolute;
  top: 48%;
  left: 50%;
  width: 900px;
  height: 520px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(236, 72, 153, 0.4) 0%, rgba(139, 92, 246, 0.25) 45%, transparent 75%);
  filter: blur(40px);
  animation: pre-outro-halo-pulse 3s ease-in-out infinite alternate;
  pointer-events: none;
}

/* Floating Bubbles Container & Bubbles */
.pre-outro-bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}

.pre-outro-bubble {
  position: absolute;
  bottom: -80px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.85) 0%, rgba(167, 139, 250, 0.35) 40%, rgba(56, 189, 248, 0.2) 70%, rgba(255, 255, 255, 0.6) 100%);
  box-shadow: 0 0 15px rgba(167, 139, 250, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(255, 255, 255, 0.65);
  animation: pre-outro-bubble-float 4.2s ease-in-out infinite;
}

.bubble-1 { left: 8%; width: 44px; height: 44px; animation-duration: 3.8s; animation-delay: 0.1s; }
.bubble-2 { left: 18%; width: 68px; height: 68px; animation-duration: 4.5s; animation-delay: 0.7s; }
.bubble-3 { left: 29%; width: 36px; height: 36px; animation-duration: 3.4s; animation-delay: 1.2s; }
.bubble-4 { left: 45%; width: 54px; height: 54px; animation-duration: 4.1s; animation-delay: 0.3s; }
.bubble-5 { left: 62%; width: 40px; height: 40px; animation-duration: 3.6s; animation-delay: 0.9s; }
.bubble-6 { left: 74%; width: 72px; height: 72px; animation-duration: 4.8s; animation-delay: 0.4s; }
.bubble-7 { left: 86%; width: 48px; height: 48px; animation-duration: 3.9s; animation-delay: 1.5s; }
.bubble-8 { left: 93%; width: 32px; height: 32px; animation-duration: 3.2s; animation-delay: 0.8s; }

/* Confetti Shower */
.pre-outro-confetti-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 3;
}

.pre-outro-confetti {
  position: absolute;
  top: -30px;
  width: 14px;
  height: 22px;
  opacity: 0.95;
  border-radius: 3px;
  animation: pre-outro-confetti-fall 3.6s ease-in-out infinite;
}

.c-gold { background: linear-gradient(135deg, #FDE047, #F59E0B); box-shadow: 0 0 8px rgba(251, 191, 36, 0.6); }
.c-cyan { background: linear-gradient(135deg, #38BDF8, #0284C7); box-shadow: 0 0 8px rgba(56, 189, 248, 0.6); }
.c-pink { background: linear-gradient(135deg, #F472B6, #DB2777); box-shadow: 0 0 8px rgba(244, 114, 182, 0.6); }
.c-lime { background: linear-gradient(135deg, #4ADE80, #16A34A); box-shadow: 0 0 8px rgba(74, 222, 128, 0.6); }
.c-purple { background: linear-gradient(135deg, #C084FC, #7C3AED); box-shadow: 0 0 8px rgba(192, 132, 252, 0.6); }
.c-white { background: #FFFFFF; box-shadow: 0 0 8px rgba(255, 255, 255, 0.8); }

.confetti-1 { left: 5%; animation-duration: 3.2s; animation-delay: 0.05s; }
.confetti-2 { left: 14%; animation-duration: 3.8s; animation-delay: 0.4s; }
.confetti-3 { left: 23%; animation-duration: 3.0s; animation-delay: 0.15s; }
.confetti-4 { left: 32%; animation-duration: 4.1s; animation-delay: 0.6s; }
.confetti-5 { left: 42%; animation-duration: 3.4s; animation-delay: 0.25s; }
.confetti-6 { left: 52%; animation-duration: 3.9s; animation-delay: 0.5s; }
.confetti-7 { left: 63%; animation-duration: 3.1s; animation-delay: 0.1s; }
.confetti-8 { left: 73%; animation-duration: 4.2s; animation-delay: 0.7s; }
.confetti-9 { left: 83%; animation-duration: 3.3s; animation-delay: 0.3s; }
.confetti-10 { left: 92%; animation-duration: 3.7s; animation-delay: 0.45s; }

/* Main Card & Typography */
.pre-outro-card {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 48px;
  max-width: 960px;
  animation: pre-outro-card-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.pre-outro-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: inherit;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #FDE047;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  margin-bottom: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  animation: pre-outro-badge-pulse 2s ease-in-out infinite alternate;
}

.pre-outro-headline {
  font-family: inherit;
  font-size: 5.2rem;
  font-weight: 950;
  line-height: 1.05;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0;
  background: linear-gradient(180deg, #FFFFFF 0%, #FEF08A 35%, #F59E0B 75%, #D97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 4px 0 #92400E) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 35px rgba(251, 191, 36, 0.7));
  animation: pre-outro-text-shimmer 3s ease-in-out infinite alternate;
}

.pre-outro-subtext {
  font-family: inherit;
  font-size: 1.65rem;
  font-weight: 700;
  color: #E2E8F0;
  margin-top: 20px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  letter-spacing: 0.02em;
}

.pre-outro-sparkles {
  margin-top: 14px;
  font-size: 2.2rem;
  color: #FDE047;
  letter-spacing: 0.4em;
  filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.8));
  animation: pre-outro-sparkle-blink 1.8s ease-in-out infinite alternate;
}

/* Keyframes */
@keyframes pre-outro-ray-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pre-outro-halo-pulse {
  0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.95; }
}

@keyframes pre-outro-card-bounce {
  0% { transform: scale(0.4) translateY(40px); opacity: 0; }
  60% { transform: scale(1.08) translateY(-8px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes pre-outro-badge-pulse {
  0% { transform: scale(0.96); box-shadow: 0 0 12px rgba(251, 191, 36, 0.3); }
  100% { transform: scale(1.04); box-shadow: 0 0 24px rgba(251, 191, 36, 0.65); }
}

@keyframes pre-outro-text-shimmer {
  0% { filter: drop-shadow(0 4px 0 #92400E) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 25px rgba(251, 191, 36, 0.5)); }
  100% { filter: drop-shadow(0 4px 0 #92400E) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 45px rgba(251, 191, 36, 0.9)); }
}

@keyframes pre-outro-sparkle-blink {
  0% { opacity: 0.6; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1.15); }
}

@keyframes pre-outro-bubble-float {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  15% { opacity: 0.85; }
  50% { transform: translateY(-45vh) translateX(18px); }
  85% { opacity: 0.85; }
  100% { transform: translateY(-95vh) translateX(-18px); opacity: 0; }
}

@keyframes pre-outro-confetti-fall {
  0% { transform: translateY(0) rotate(0deg) rotateX(0deg); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translateY(50vh) rotate(380deg) rotateX(240deg) translateX(25px); }
  90% { opacity: 0.9; }
  100% { transform: translateY(105vh) rotate(760deg) rotateX(480deg) translateX(-25px); opacity: 0; }
}

/* Portrait Reel (9:16) Adaptations */
@media (max-aspect-ratio: 1/1) {
  .pre-outro-card {
    padding: 24px 20px;
    max-width: 90vw;
  }
  .pre-outro-badge {
    font-size: 1rem;
    padding: 6px 18px;
    margin-bottom: 16px;
  }
  .pre-outro-headline {
    font-size: 3.4rem;
  }
  .pre-outro-subtext {
    font-size: 1.25rem;
    margin-top: 14px;
  }
  .pre-outro-sparkles {
    font-size: 1.75rem;
  }
}
`;
}
