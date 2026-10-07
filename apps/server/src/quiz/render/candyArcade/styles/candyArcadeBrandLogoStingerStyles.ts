/**
 * GPU-accelerated styling and motion keyframes for Brand Logo Stinger Transition (~1.3s / 39-40 frames).
 * Concept: Arcade Power-Up & Shockwave Iris Redesign.
 * Synchronized with:
 * - 0.0s - 0.45s: Center elastic pop-in (Coin-Flip / Power-Up) + inward kinetic power beams + sparkle orbit
 * - 0.45s - 0.75s: Radial sonic shockwaves + 100% screen occlusion at 50% midpoint cutover + golden apex flash
 * - 0.75s - 1.30s: Forward camera punch-through zoom into CTA scene with motion blur & particle dispersion
 */

function stingerStageAndBackdropStyles(): string {
  return `
/* === Brand Logo Stinger Transition: Arcade Power-Up & Shockwave === */
.transition-brand-logo-stinger {
  position: absolute;
  inset: 0;
  z-index: 900;
  pointer-events: none;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.brand-stinger-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Multi-layered Velocity Slashes & Full-Coverage Portal Curtain */
.brand-stinger-slash {
  position: absolute;
  pointer-events: none;
  will-change: transform;
}

.brand-stinger-slash.slash-primary {
  inset: -60%;
  background: linear-gradient(135deg, var(--trans-from, #4338CA) 0%, var(--trans-accent, #6366F1) 50%, var(--trans-to, #4F46E5) 100%);
  transform: skewX(-22deg) translate3d(-160%, 0, 0);
  border-right: 7px solid rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.65), inset 14px 0 28px rgba(255, 255, 255, 0.38);
  animation: stinger-slash-primary var(--trans-dur, 1.3s) linear var(--clip-start, 0s) both;
}

.brand-stinger-slash.slash-secondary {
  top: -60%;
  bottom: -60%;
  left: 50%;
  width: 440px;
  margin-left: -220px;
  background: linear-gradient(135deg, var(--trans-to, #DB2777) 0%, #EC4899 50%, #BE185D 100%);
  transform: skewX(-22deg) translate3d(-260%, 0, 0);
  border-right: 6px solid rgba(255, 255, 255, 0.92);
  border-left: 2px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.55), inset 10px 0 24px rgba(255, 255, 255, 0.32);
  animation: stinger-slash-secondary var(--trans-dur, 1.3s) linear calc(var(--clip-start, 0s) + 0.02s) both;
}

.brand-stinger-slash.slash-accent {
  top: -60%;
  bottom: -60%;
  left: 50%;
  width: 240px;
  margin-left: -120px;
  background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #D97706 100%);
  transform: skewX(-22deg) translate3d(-360%, 0, 0);
  border-right: 5px solid #FFFFFF;
  border-left: 2px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 0 45px rgba(245, 158, 11, 0.7);
  animation: stinger-slash-accent var(--trans-dur, 1.3s) linear calc(var(--clip-start, 0s) + 0.04s) both;
}

/* Concentric Arcade Shockwave Rings */
.brand-stinger-shockwave-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 320px;
  height: 320px;
  margin-top: -160px;
  margin-left: -160px;
  border-radius: 999px;
  border: 6px solid var(--trans-accent, #F59E0B);
  box-shadow: 0 0 40px var(--trans-accent, #F59E0B), inset 0 0 24px rgba(255, 255, 255, 0.6);
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity;
}

.brand-stinger-shockwave-ring.ring-1 {
  animation: stinger-shockwave-expand var(--trans-dur, 1.3s) cubic-bezier(0.18, 0.85, 0.3, 1) calc(var(--clip-start, 0s) + 0.35s) both;
}

.brand-stinger-shockwave-ring.ring-2 {
  border-color: #FFFFFF;
  box-shadow: 0 0 45px rgba(255, 255, 255, 0.9), inset 0 0 25px var(--trans-to, #EC4899);
  animation: stinger-shockwave-expand var(--trans-dur, 1.3s) cubic-bezier(0.18, 0.85, 0.3, 1) calc(var(--clip-start, 0s) + 0.44s) both;
}

/* Peak Flash Burst at Midpoint Occlusion */
.brand-stinger-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.98) 0%, rgba(254, 240, 138, 0.76) 38%, rgba(255, 255, 255, 0) 75%);
  opacity: 0;
  pointer-events: none;
  animation: stinger-flash-burst var(--trans-dur, 1.3s) linear var(--clip-start, 0s) both;
}`;
}

function stingerBadgeAndPillStyles(): string {
  return `
/* Centerpiece Hero Branding (Elastic Pop-In -> Power Float -> Punch-Through Zoom) */
.brand-stinger-content {
  position: relative;
  z-index: 920;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  will-change: transform, opacity;
  animation: stinger-content-stage var(--trans-dur, 1.3s) linear var(--clip-start, 0s) both;
}

/* Hero Badge Frame (234px landscape, 204px portrait) */
.brand-stinger-hero-badge {
  position: relative;
  width: 234px;
  height: 234px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  box-sizing: border-box;
  filter: drop-shadow(0 16px 36px rgba(0, 0, 0, 0.52));
}

/* Glowing Radial Aura Ring behind Badge */
.brand-badge-ring.brand-badge-glow {
  position: absolute;
  inset: -22px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.85) 0%, rgba(245, 158, 11, 0.4) 52%, transparent 74%);
  filter: blur(12px);
  animation: stinger-glow-pulse var(--trans-dur, 1.3s) ease-in-out var(--clip-start, 0s) infinite alternate;
}

/* Custom Logo Image Container (Enlarged 216px Frame) */
.brand-stinger-logo-frame {
  position: relative;
  width: 216px;
  height: 216px;
  border-radius: 999px;
  border: 6px solid #FFFFFF;
  background: linear-gradient(145deg, #1E1B4B 0%, #2E1065 50%, #1E1B4B 100%);
  box-shadow:
    0 14px 0 rgba(0, 0, 0, 0.38),
    0 24px 45px rgba(0, 0, 0, 0.5),
    inset 0 4px 10px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  display: grid;
  place-items: center;
}

.brand-stinger-logo-img {
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
}

/* 3D Metallic Lettermark Fallback Frame */
.brand-stinger-lettermark-frame {
  position: relative;
  width: 216px;
  height: 216px;
  border-radius: 999px;
  border: 6px solid #FFFFFF;
  background: linear-gradient(145deg, #F59E0B 0%, #D97706 50%, #B45309 100%);
  box-shadow:
    inset 0 5px 0 rgba(255, 255, 255, 0.65),
    inset 0 -7px 0 rgba(146, 64, 14, 0.5),
    0 14px 0 #92400E,
    0 24px 45px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: grid;
  place-items: center;
}

.brand-lettermark-text {
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 118px;
  font-weight: 900;
  line-height: 1;
  color: #FFFFFF;
  text-shadow:
    0 4px 0 #B45309,
    0 8px 0 #78350F,
    0 14px 20px rgba(0, 0, 0, 0.45);
}

/* Glossy Shimmer Light Sweep across Badge */
.brand-stinger-shimmer {
  position: absolute;
  inset: -60%;
  background: linear-gradient(
    115deg,
    transparent 35%,
    rgba(255, 255, 255, 0.22) 44%,
    rgba(255, 255, 255, 0.9) 50%,
    rgba(255, 255, 255, 0.22) 56%,
    transparent 65%
  );
  transform: translate3d(-150%, 0, 0);
  pointer-events: none;
  animation: stinger-shimmer-sweep var(--trans-dur, 1.3s) ease-in-out var(--clip-start, 0s) both;
}

/* Enhanced Twinkling Gem Sparkles */
.brand-stinger-sparkle {
  position: absolute;
  line-height: 1;
  pointer-events: none;
  filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.4));
  animation: stinger-sparkle-spin var(--trans-dur, 1.3s) ease-out var(--clip-start, 0s) both;
}

.brand-stinger-sparkle.sp-tl { top: -10px; left: 8px; font-size: 42px; color: #FBBF24; }
.brand-stinger-sparkle.sp-br { bottom: -8px; right: 10px; font-size: 44px; color: #F472B6; }
.brand-stinger-sparkle.sp-tr { top: 10px; right: -8px; font-size: 38px; color: #38BDF8; }
.brand-stinger-sparkle.sp-bl { bottom: 12px; left: -10px; font-size: 40px; color: #FACC15; }

/* Optional Channel Name Pill */
.brand-stinger-channel-pill {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 26px;
  border-radius: 999px;
  border: 3px solid #FFFFFF;
  background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%);
  color: #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  box-shadow:
    0 8px 0 #020617,
    0 16px 24px rgba(0, 0, 0, 0.45);
}

.brand-stinger-channel-name {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  max-width: 380px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-stinger-sub {
  font-size: 14px;
  font-weight: 900;
  padding: 3px 10px;
  border-radius: 999px;
  background: #F59E0B;
  color: #1E1B4B;
  letter-spacing: 1px;
}

/* === Responsive Aspect Ratio Adjustments (9:16 Shorts / Reels) === */
.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-stinger-hero-badge {
  width: 204px;
  height: 204px;
}

.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-stinger-logo-frame,
.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-stinger-lettermark-frame {
  width: 186px;
  height: 186px;
}

.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-lettermark-text {
  font-size: 104px;
}

.transition-brand-logo-stinger[data-aspect-ratio="9:16"] .brand-stinger-channel-name {
  font-size: 18px;
  max-width: 280px;
}`;
}

function stingerKeyframeAnimations(): string {
  return `
/* === Precision Arcade Animation Keyframes (1.3s / 39-40 frames) === */
@keyframes stinger-slash-primary {
  0% {
    transform: skewX(-22deg) translate3d(-160%, 0, 0);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  38% {
    transform: skewX(-22deg) translate3d(0, 0, 0);
    animation-timing-function: linear;
  }
  62% {
    transform: skewX(-22deg) translate3d(0, 0, 0);
    animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);
  }
  100% {
    transform: skewX(-22deg) translate3d(160%, 0, 0);
  }
}

@keyframes stinger-slash-secondary {
  0% {
    transform: skewX(-22deg) translate3d(-260%, 0, 0);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  38% {
    transform: skewX(-22deg) translate3d(-60px, 0, 0);
    animation-timing-function: linear;
  }
  62% {
    transform: skewX(-22deg) translate3d(60px, 0, 0);
    animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);
  }
  100% {
    transform: skewX(-22deg) translate3d(300%, 0, 0);
  }
}

@keyframes stinger-slash-accent {
  0% {
    transform: skewX(-22deg) translate3d(-360%, 0, 0);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  38% {
    transform: skewX(-22deg) translate3d(140px, 0, 0);
    animation-timing-function: linear;
  }
  62% {
    transform: skewX(-22deg) translate3d(240px, 0, 0);
    animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);
  }
  100% {
    transform: skewX(-22deg) translate3d(450%, 0, 0);
  }
}

/* Centerpiece Motion: Elastic Pop-In -> Float Pulse -> Punch-Through Zoom */
@keyframes stinger-content-stage {
  0% {
    opacity: 0;
    transform: scale(0.18) rotate(-14deg);
    animation-timing-function: cubic-bezier(0.18, 1.25, 0.32, 1);
  }
  24% {
    opacity: 0.98;
    transform: scale(1.15) rotate(3deg);
    animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  38% {
    opacity: 1;
    transform: scale(1.0) rotate(0deg);
    animation-timing-function: ease-in-out;
  }
  48% {
    opacity: 1;
    transform: scale(1.04) rotate(0deg);
    animation-timing-function: ease-in;
  }
  56% {
    opacity: 1;
    transform: scale(0.97) rotate(0deg);
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }
  76% {
    opacity: 0.95;
    transform: scale(1.45) rotate(2deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  92% {
    opacity: 0.3;
    transform: scale(2.4) rotate(5deg);
    filter: blur(3px);
  }
  100% {
    opacity: 0;
    transform: scale(3.2) rotate(8deg);
    filter: blur(8px);
  }
}

/* Expanding Sonic Shockwave Rings */
@keyframes stinger-shockwave-expand {
  0% {
    transform: scale(0.25);
    opacity: 0;
  }
  30% {
    transform: scale(0.35);
    opacity: 0.95;
  }
  70% {
    transform: scale(2.2);
    opacity: 0.45;
  }
  100% {
    transform: scale(3.2);
    opacity: 0;
  }
}

@keyframes stinger-flash-burst {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  40% {
    opacity: 0;
    transform: scale(0.75);
    animation-timing-function: ease-in;
  }
  49% {
    opacity: 0.95;
    transform: scale(1.08);
    animation-timing-function: ease-out;
  }
  55% {
    opacity: 0.65;
    transform: scale(1.2);
  }
  66% {
    opacity: 0;
    transform: scale(1.5);
  }
  100% {
    opacity: 0;
  }
}

@keyframes stinger-shimmer-sweep {
  0% { transform: translate3d(-150%, 0, 0); }
  32% { transform: translate3d(-150%, 0, 0); }
  58% { transform: translate3d(150%, 0, 0); }
  100% { transform: translate3d(150%, 0, 0); }
}

@keyframes stinger-sparkle-spin {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  28% { transform: scale(1.3) rotate(70deg); opacity: 1; }
  52% { transform: scale(1.0) rotate(150deg); opacity: 1; }
  82% { transform: scale(0.4) rotate(260deg); opacity: 0.3; }
  100% { transform: scale(0) rotate(320deg); opacity: 0; }
}

@keyframes stinger-glow-pulse {
  0% { opacity: 0.65; transform: scale(0.96); }
  100% { opacity: 1.0; transform: scale(1.15); }
}`;
}

export function candyArcadeBrandLogoStingerStylesCss(): string {
  return [
    stingerStageAndBackdropStyles(),
    stingerBadgeAndPillStyles(),
    stingerKeyframeAnimations(),
  ]
    .join("\n")
    .trim();
}
