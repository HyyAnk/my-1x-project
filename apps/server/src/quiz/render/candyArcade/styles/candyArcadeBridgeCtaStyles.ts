/**
 * Visual styling and CSS animation keyframes for Bridge Scene 2 (Subscribe CTA).
 */

export function candyArcadeBridgeCtaStylesCss(): string {
  return `
/* Bridge Scene 2: Subscribe Call-To-Action Stage */
.bridge-cta-scene {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 50%, #7C3AED 0%, #5B21B6 40%, #312E81 75%, #0F0C29 100%);
  color: #FFFFFF;
}

/* Background Layers: Sunburst Rays, Glowing Aura, Shockwave & Bubbles */
.bridge-cta-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bridge-cta-rays {
  position: absolute;
  inset: -50%;
  opacity: 0.07;
  background: repeating-conic-gradient(from 0deg, rgba(255, 255, 255, 0.95) 0 6deg, transparent 6deg 18deg);
  animation: ray-spin 90s linear infinite both;
  transform-origin: center center;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 45%, rgba(0, 0, 0, 0.15) 75%, transparent 100%);
  -webkit-mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 45%, rgba(0, 0, 0, 0.15) 75%, transparent 100%);
  pointer-events: none;
}

.bridge-cta-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 720px;
  height: 360px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(244, 63, 94, 0.45) 0%, rgba(139, 92, 246, 0.3) 45%, transparent 70%);
  filter: blur(34px);
  animation: bridge-aura-pulse 2.8s ease-in-out infinite alternate;
  pointer-events: none;
}

.bridge-cta-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 220px;
  height: 220px;
  margin: -110px 0 0 -110px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 25px rgba(244, 63, 94, 0.6);
  opacity: 0;
  pointer-events: none;
  animation: shockwave-expand 3.5s cubic-bezier(0.1, 0.8, 0.2, 1) infinite;
}

/* Playful Continuously Rising Aquarium Water Bubbles */
.bridge-cta-bubbles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}

.bridge-cta-bubble {
  position: absolute;
  top: 100%;
  border-radius: 50%;
  pointer-events: none;
  border: 2px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    inset -3px -3px 8px rgba(0, 0, 0, 0.15),
    inset 3px 3px 10px rgba(255, 255, 255, 0.75),
    0 8px 24px rgba(99, 102, 241, 0.3);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  will-change: transform, opacity;
}

.bridge-cta-bubble::after {
  content: "";
  position: absolute;
  top: 14%;
  left: 18%;
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.4) 60%, transparent 100%);
}

.bridge-cta-bubble.bb-1 {
  left: 8%; width: 54px; height: 54px;
  background: radial-gradient(circle at 35% 35%, rgba(56, 189, 248, 0.45), rgba(99, 102, 241, 0.2));
  animation: bubble-rise-sway-left 5.2s linear infinite -1.4s;
}

.bridge-cta-bubble.bb-2 {
  left: 20%; width: 72px; height: 72px;
  background: radial-gradient(circle at 35% 35%, rgba(244, 114, 182, 0.45), rgba(217, 70, 239, 0.2));
  animation: bubble-rise-sway-right 6.0s linear infinite -3.8s;
}

.bridge-cta-bubble.bb-3 {
  left: 32%; width: 44px; height: 44px;
  background: radial-gradient(circle at 35% 35%, rgba(251, 191, 36, 0.45), rgba(249, 115, 22, 0.2));
  animation: bubble-rise-sway-left 4.6s linear infinite -0.6s;
}

.bridge-cta-bubble.bb-4 {
  left: 45%; width: 80px; height: 80px;
  background: radial-gradient(circle at 35% 35%, rgba(168, 85, 247, 0.45), rgba(124, 58, 237, 0.2));
  animation: bubble-rise-sway-right 6.4s linear infinite -4.8s;
}

.bridge-cta-bubble.bb-5 {
  left: 58%; width: 50px; height: 50px;
  background: radial-gradient(circle at 35% 35%, rgba(56, 189, 248, 0.45), rgba(99, 102, 241, 0.2));
  animation: bubble-rise-sway-left 4.9s linear infinite -2.2s;
}

.bridge-cta-bubble.bb-6 {
  left: 68%; width: 68px; height: 68px;
  background: radial-gradient(circle at 35% 35%, rgba(244, 114, 182, 0.45), rgba(217, 70, 239, 0.2));
  animation: bubble-rise-sway-right 5.8s linear infinite -1.0s;
}

.bridge-cta-bubble.bb-7 {
  left: 78%; width: 42px; height: 42px;
  background: radial-gradient(circle at 35% 35%, rgba(52, 211, 153, 0.45), rgba(16, 185, 129, 0.2));
  animation: bubble-rise-sway-left 4.4s linear infinite -3.2s;
}

.bridge-cta-bubble.bb-8 {
  left: 88%; width: 76px; height: 76px;
  background: radial-gradient(circle at 35% 35%, rgba(251, 191, 36, 0.45), rgba(249, 115, 22, 0.2));
  animation: bubble-rise-sway-right 6.2s linear infinite -5.0s;
}

.bridge-cta-bubble.bb-9 {
  left: 14%; width: 38px; height: 38px;
  background: radial-gradient(circle at 35% 35%, rgba(147, 197, 253, 0.45), rgba(99, 102, 241, 0.2));
  animation: bubble-rise-sway-right 4.8s linear infinite -2.6s;
}

.bridge-cta-bubble.bb-10 {
  left: 82%; width: 56px; height: 56px;
  background: radial-gradient(circle at 35% 35%, rgba(192, 132, 252, 0.45), rgba(147, 51, 234, 0.2));
  animation: bubble-rise-sway-left 5.4s linear infinite -4.2s;
}

/* Sparkling Ambient Elements */
.bridge-cta-ambient-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bridge-cta-sparkle {
  position: absolute;
  line-height: 1;
  pointer-events: none;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
  animation: bridge-sparkle-float 3.6s ease-in-out infinite alternate;
}

.bridge-cta-sparkle.cs-1 { top: 12%; left: 24%; color: #FBBF24; animation-delay: 0s; font-size: 38px; }
.bridge-cta-sparkle.cs-2 { top: 22%; right: 22%; color: #F472B6; animation-delay: 0.8s; font-size: 42px; }
.bridge-cta-sparkle.cs-3 { bottom: 20%; left: 22%; color: #38BDF8; animation-delay: 1.4s; font-size: 36px; }
.bridge-cta-sparkle.cs-4 { bottom: 14%; right: 26%; color: #FDE047; animation-delay: 2.1s; font-size: 40px; }
.bridge-cta-sparkle.cs-5 { top: 38%; left: 6%; color: #FB7185; animation-delay: 1.1s; font-size: 34px; }
.bridge-cta-sparkle.cs-6 { top: 40%; right: 6%; color: #FDE047; animation-delay: 1.7s; font-size: 36px; }

/* Pure Centered Hero CTA Container (Focused Mode) */
.bridge-cta-hero-container {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: bridge-hero-pop 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) var(--clip-start, 0s) both;
}

/* Floating Glass Capsule Wrapper */
.bridge-cta-widget-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 22px;
  padding: 22px 34px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 4px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 50px rgba(139, 92, 246, 0.4),
    inset 0 3px 6px rgba(255, 255, 255, 0.7);
  transform: scale(1.15);
}

/* Hero Subscribe Button */
.bridge-cta-subscribe-button {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 320px;
  height: 86px;
  padding: 0 44px;
  border-radius: 999px;
  border: 4px solid #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow: 0 12px 0 #991B1B, 0 20px 32px rgba(239, 68, 68, 0.5);
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%);
  color: #FFFFFF;
  animation: cta-button-interaction 3.0s cubic-bezier(0.4, 0, 0.2, 1) var(--clip-start, 0s) both;
}

.bridge-cta-sub-label-normal {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: cta-label-normal 3.0s ease-in-out var(--clip-start, 0s) both;
}

.bridge-cta-sub-label-active {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  color: #FFFFFF;
  animation: cta-label-active 3.0s ease-in-out var(--clip-start, 0s) both;
}

/* Hero Notification Bell Button */
.bridge-cta-bell-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%);
  border: 4px solid #FFFFFF;
  color: #4B5563;
  box-shadow: 0 10px 0 #D97706, 0 16px 26px rgba(245, 158, 11, 0.45);
  animation: cta-bell-interaction 3.0s ease-in-out var(--clip-start, 0s) both;
}

.bridge-cta-bell-icon {
  font-size: 42px;
  display: inline-block;
  transform-origin: top center;
  animation: bell-ring 1.0s ease-in-out calc(var(--clip-start, 0s) + 2.18s) infinite both;
}

.bridge-cta-bell-soundwave {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  border: 3px solid rgba(251, 191, 36, 0.7);
  opacity: 0;
  pointer-events: none;
}

.bridge-cta-bell-soundwave.bsw-1 {
  animation: bell-soundwave-pulse 1.0s ease-out calc(var(--clip-start, 0s) + 2.18s) infinite both;
}

.bridge-cta-bell-soundwave.bsw-2 {
  animation: bell-soundwave-pulse 1.0s ease-out calc(var(--clip-start, 0s) + 2.33s) infinite both;
}

/* Animated Pointer Cursor */
.bridge-cta-cursor {
  position: absolute;
  width: 52px;
  height: 52px;
  pointer-events: none;
  z-index: 10;
  top: 10px;
  left: 20px;
  animation: cursor-glide-click 3.0s ease-in-out var(--clip-start, 0s) both;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
}

.bridge-cta-cursor svg {
  width: 100%;
  height: 100%;
}

/* Radial Burst and Confetti Celebrations */
.bridge-cta-burst {
  position: absolute;
  inset: -28px;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.95) 15%, rgba(16, 185, 129, 0.55) 45%, transparent 70%);
  animation: cta-burst-pulse 3.0s ease-out var(--clip-start, 0s) both;
}

.bridge-cta-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 14px;
  border-radius: 3px;
  opacity: 0;
}

.cp-1 { background: #FBBF24; animation: confetti-burst-1 3.0s ease-out var(--clip-start, 0s) both; }
.cp-2 { background: #F43F5E; animation: confetti-burst-2 3.0s ease-out var(--clip-start, 0s) both; }
.cp-3 { background: #38BDF8; animation: confetti-burst-3 3.0s ease-out var(--clip-start, 0s) both; }
.cp-4 { background: #10B981; animation: confetti-burst-4 3.0s ease-out var(--clip-start, 0s) both; }
.cp-5 { background: #A855F7; animation: confetti-burst-5 3.0s ease-out var(--clip-start, 0s) both; }
.cp-6 { background: #FDE047; animation: confetti-burst-6 3.0s ease-out var(--clip-start, 0s) both; }

/* Screen Reader / Hidden Utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Classic Card Layout (Retained for Backward Compatibility) */
.bridge-cta-card {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 1280px;
  width: min(90vw, 1280px);
  padding: 46px 64px;
  box-sizing: border-box;
  border-radius: 54px;
  border: 8px solid #FF5E7E;
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF9 25%, #FFF5F7 100%);
  box-shadow:
    inset 0 6px 0 rgba(255, 255, 255, 0.95),
    inset 0 -8px 0 rgba(255, 94, 126, 0.25),
    0 16px 0 #BE123C,
    0 28px 0 rgba(15, 23, 42, 0.35),
    0 42px 70px rgba(0, 0, 0, 0.35);
  animation: bridge-card-pop 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) var(--clip-start, 0s) both;
}

.bridge-cta-card.bridge-cta-minimal-branding {
  padding: 44px 50px 38px 50px;
}

.bridge-cta-card.bridge-cta-minimal-branding .bridge-cta-badge {
  display: none;
}

.bridge-cta-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 24px;
  border-radius: 999px;
  border: 3px solid #FFFFFF;
  background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
  color: #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  box-shadow: 0 6px 0 #4C1D95;
  margin-bottom: 12px;
}

.bridge-cta-channel {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 6px;
}

.bridge-cta-channel-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%);
  border: 4px solid #FFFFFF;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.4);
  display: grid;
  place-items: center;
  color: #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 36px;
  font-weight: 900;
}

.bridge-cta-channel-name {
  color: #1E1B4B;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 46px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.bridge-cta-headline {
  margin: 8px 0 20px 0;
  max-width: 860px;
  color: #374151;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.5px;
  opacity: 0.92;
}

.bridge-cta-prompt {
  margin: 18px 0 0 0;
  color: #6B7280;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.2px;
  opacity: 0.88;
}

.bridge-decor-star {
  position: absolute;
  pointer-events: none;
  font-size: 48px;
  line-height: 1;
}

.bridge-star-tl {
  top: -26px;
  left: -26px;
  color: #FBBF24;
  transform: rotate(-15deg);
  filter: drop-shadow(0 6px 12px rgba(251, 191, 36, 0.5));
  animation: star-wobble 3s ease-in-out infinite alternate;
}

.bridge-star-br {
  bottom: -26px;
  right: -26px;
  color: #F43F5E;
  transform: rotate(15deg);
  filter: drop-shadow(0 6px 12px rgba(244, 63, 94, 0.5));
  animation: star-wobble 3s ease-in-out infinite alternate 0.5s;
}

.bridge-cta-scene .mascot-stage,
.bridge-cta-scene .brand-mascot {
  position: absolute;
  bottom: 40px;
  right: 60px;
  z-index: 10;
  pointer-events: none;
  animation: bridge-mascot-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + 0.25s) both;
}

.bridge-cta-scene .brand-mascot {
  font-size: 72px;
  color: #FFC938;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
}

/* Keyframe Animations */
@keyframes bridge-aura-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.92);
    opacity: 0.65;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 0.95;
  }
}

@keyframes shockwave-expand {
  0%, 36% {
    opacity: 0;
    transform: scale(0.4);
  }
  38% {
    opacity: 0.95;
    transform: scale(0.6);
  }
  48% {
    opacity: 0;
    transform: scale(2.8);
  }
  100% {
    opacity: 0;
    transform: scale(2.8);
  }
}

@keyframes ray-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bubble-rise-sway-left {
  0% {
    transform: translateY(0) translateX(0) scale(0.7);
    opacity: 0;
  }
  8% {
    opacity: 0.85;
    transform: translateY(-12vh) translateX(-14px) scale(0.8);
  }
  25% {
    transform: translateY(-32vh) translateX(16px) scale(0.9);
  }
  45% {
    transform: translateY(-56vh) translateX(-18px) scale(0.98);
  }
  65% {
    transform: translateY(-78vh) translateX(15px) scale(1.04);
  }
  85% {
    opacity: 0.85;
    transform: translateY(-98vh) translateX(-12px) scale(1.08);
  }
  100% {
    transform: translateY(-118vh) translateX(6px) scale(1.1);
    opacity: 0;
  }
}

@keyframes bubble-rise-sway-right {
  0% {
    transform: translateY(0) translateX(0) scale(0.75);
    opacity: 0;
  }
  8% {
    opacity: 0.85;
    transform: translateY(-12vh) translateX(16px) scale(0.82);
  }
  25% {
    transform: translateY(-30vh) translateX(-18px) scale(0.92);
  }
  45% {
    transform: translateY(-54vh) translateX(15px) scale(1.0);
  }
  65% {
    transform: translateY(-76vh) translateX(-16px) scale(1.05);
  }
  85% {
    opacity: 0.85;
    transform: translateY(-96vh) translateX(12px) scale(1.08);
  }
  100% {
    transform: translateY(-116vh) translateX(-8px) scale(1.1);
    opacity: 0;
  }
}

@keyframes float-bubble-1 { 0% { transform: translateY(0); } 100% { transform: translateY(-24px); } }
@keyframes float-bubble-2 { 0% { transform: translateY(0); } 100% { transform: translateY(-30px); } }
@keyframes float-bubble-3 { 0% { transform: translateY(0); } 100% { transform: translateY(-22px); } }
@keyframes float-bubble-4 { 0% { transform: translateY(0); } 100% { transform: translateY(-26px); } }

@keyframes bridge-hero-pop {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(40px);
  }
  65% {
    opacity: 1;
    transform: scale(1.05) translateY(-6px);
  }
  85% {
    transform: scale(0.98) translateY(2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes cta-button-interaction {
  0%, 42% {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%);
    color: #FFFFFF;
    transform: scale(1);
    box-shadow: 0 12px 0 #991B1B, 0 20px 32px rgba(239, 68, 68, 0.5);
  }
  45% {
    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
    color: #FFFFFF;
    transform: scale(0.92, 0.95) translateY(6px);
    box-shadow: 0 4px 0 #991B1B;
  }
  49% {
    transform: scale(1.04, 1.02) translateY(-2px);
  }
  53%, 100% {
    background: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%);
    color: #FFFFFF;
    transform: scale(1) translateY(0);
    box-shadow: 0 10px 0 #065F46, 0 18px 28px rgba(16, 185, 129, 0.45);
  }
}

@keyframes cta-label-normal {
  0%, 43% {
    opacity: 1;
    transform: scale(1);
  }
  48%, 100% {
    opacity: 0;
    transform: scale(0.8);
  }
}

@keyframes cta-label-active {
  0%, 43% {
    opacity: 0;
    transform: scale(0.8);
  }
  49%, 100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes cta-bell-interaction {
  0%, 69% {
    background: linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%);
    box-shadow: 0 10px 0 #D97706, 0 16px 26px rgba(245, 158, 11, 0.45);
    transform: scale(1);
  }
  72% {
    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
    transform: scale(0.92) translateY(4px);
    box-shadow: 0 4px 0 #B45309;
  }
  76%, 100% {
    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
    box-shadow: 0 10px 0 #B45309, 0 0 28px rgba(245, 158, 11, 0.75);
    transform: scale(1);
  }
}

@keyframes bell-ring {
  0% {
    transform: rotate(0deg) scale(1);
  }
  6% {
    transform: rotate(-26deg) scale(1.15);
  }
  12% {
    transform: rotate(24deg) scale(1.15);
  }
  18% {
    transform: rotate(-18deg) scale(1.08);
  }
  24% {
    transform: rotate(16deg) scale(1.08);
  }
  30% {
    transform: rotate(-8deg) scale(1.02);
  }
  36%, 100% {
    transform: rotate(0deg) scale(1);
  }
}

@keyframes bell-soundwave-pulse {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  6% {
    opacity: 0.9;
    transform: scale(1.0);
  }
  30% {
    opacity: 0;
    transform: scale(2.0);
  }
  100% {
    opacity: 0;
    transform: scale(2.0);
  }
}

@keyframes cursor-glide-click {
  0% {
    opacity: 0;
    transform: translate(220px, 120px) scale(1);
  }
  14% {
    opacity: 1;
    transform: translate(160px, 30px) scale(1);
  }
  40% {
    opacity: 1;
    transform: translate(160px, 30px) scale(1);
  }
  45% {
    opacity: 1;
    transform: translate(160px, 30px) scale(0.82);
  }
  50% {
    opacity: 1;
    transform: translate(160px, 30px) scale(1);
  }
  66% {
    opacity: 1;
    transform: translate(370px, 28px) scale(1);
  }
  72% {
    opacity: 1;
    transform: translate(370px, 28px) scale(0.82);
  }
  77% {
    opacity: 1;
    transform: translate(370px, 28px) scale(1);
  }
  88% {
    opacity: 1;
    transform: translate(450px, 90px) scale(1);
  }
  96%, 100% {
    opacity: 0;
    transform: translate(480px, 120px) scale(1);
  }
}

@keyframes cta-burst-pulse {
  0%, 43% {
    opacity: 0;
    transform: scale(0.6);
  }
  47% {
    opacity: 1;
    transform: scale(1.25);
  }
  55%, 100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes confetti-burst-1 {
  0%, 70% { opacity: 0; transform: translate(0, 0) scale(0); }
  73% { opacity: 1; transform: translate(0, 0) scale(1); }
  84% { opacity: 1; transform: translate(-140px, -100px) rotate(180deg) scale(1.2); }
  94%, 100% { opacity: 0; transform: translate(-180px, -130px) rotate(320deg) scale(0.5); }
}

@keyframes confetti-burst-2 {
  0%, 70% { opacity: 0; transform: translate(0, 0) scale(0); }
  73% { opacity: 1; transform: translate(0, 0) scale(1); }
  84% { opacity: 1; transform: translate(120px, -110px) rotate(-160deg) scale(1.2); }
  94%, 100% { opacity: 0; transform: translate(160px, -140px) rotate(-300deg) scale(0.5); }
}

@keyframes confetti-burst-3 {
  0%, 70% { opacity: 0; transform: translate(0, 0) scale(0); }
  73% { opacity: 1; transform: translate(0, 0) scale(1); }
  84% { opacity: 1; transform: translate(-110px, 90px) rotate(220deg) scale(1.1); }
  94%, 100% { opacity: 0; transform: translate(-140px, 120px) rotate(360deg) scale(0.5); }
}

@keyframes confetti-burst-4 {
  0%, 70% { opacity: 0; transform: translate(0, 0) scale(0); }
  73% { opacity: 1; transform: translate(0, 0) scale(1); }
  84% { opacity: 1; transform: translate(130px, 80px) rotate(-200deg) scale(1.1); }
  94%, 100% { opacity: 0; transform: translate(170px, 110px) rotate(-340deg) scale(0.5); }
}

@keyframes confetti-burst-5 {
  0%, 70% { opacity: 0; transform: translate(0, 0) scale(0); }
  73% { opacity: 1; transform: translate(0, 0) scale(1); }
  84% { opacity: 1; transform: translate(0px, -130px) rotate(90deg) scale(1.3); }
  94%, 100% { opacity: 0; transform: translate(0px, -170px) rotate(200deg) scale(0.5); }
}

@keyframes confetti-burst-6 {
  0%, 70% { opacity: 0; transform: translate(0, 0) scale(0); }
  73% { opacity: 1; transform: translate(0, 0) scale(1); }
  84% { opacity: 1; transform: translate(0px, 110px) rotate(-90deg) scale(1.2); }
  94%, 100% { opacity: 0; transform: translate(0px, 150px) rotate(-180deg) scale(0.5); }
}

@keyframes star-wobble {
  0% { transform: rotate(-15deg) scale(0.95); }
  50% { transform: rotate(0deg) scale(1.15); }
  100% { transform: rotate(15deg) scale(0.95); }
}

@keyframes bridge-card-pop {
  0% {
    opacity: 0;
    transform: scale(0.65) translateY(60px);
  }
  60% {
    opacity: 1;
    transform: scale(1.04) translateY(-8px);
  }
  80% {
    transform: scale(0.98) translateY(3px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes bridge-sparkle-float {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-16px) rotate(45deg);
    opacity: 1;
  }
  100% {
    transform: translateY(0) rotate(90deg);
    opacity: 0.6;
  }
}

@keyframes bridge-mascot-entrance {
  0% {
    opacity: 0;
    transform: scale(0.4) translateY(80px);
  }
  70% {
    opacity: 1;
    transform: scale(1.1) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (max-aspect-ratio: 1/1) {
  .bridge-cta-widget-wrapper {
    gap: 14px;
    padding: 14px 20px;
    transform: scale(1);
  }
  .bridge-cta-subscribe-button {
    min-width: 230px;
    height: 68px;
    font-size: 24px;
    padding: 0 28px;
  }
  .bridge-cta-bell-button {
    width: 68px;
    height: 68px;
  }
  .bridge-cta-bell-icon {
    font-size: 32px;
  }
  .bridge-cta-aura {
    width: 90vw;
    height: 220px;
  }
  .bridge-cta-card {
    max-width: 94vw;
    padding: 38px 20px;
    border-radius: 40px;
    border-width: 6px;
  }
  .bridge-cta-channel-name {
    font-size: 36px;
  }
  .bridge-cta-channel-avatar {
    width: 60px;
    height: 60px;
    font-size: 30px;
  }
  .bridge-cta-headline {
    font-size: 26px;
    margin-bottom: 16px;
  }
  .bridge-cta-prompt {
    font-size: 20px;
    margin-top: 14px;
  }
  .bridge-cta-scene .mascot-stage,
  .bridge-cta-scene .brand-mascot {
    bottom: 20px;
    right: 50%;
    transform: translateX(50%);
  }
}
`;
}
