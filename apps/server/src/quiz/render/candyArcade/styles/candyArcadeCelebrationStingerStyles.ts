/**
 * GPU-accelerated styling and motion keyframes for Celebration Stinger Transition (~2.0s).
 * Synchronized across a 3-phase arc:
 * - 0.0s - 0.8s (0% - 40%): Golden celebratory ribbons & stars sweep in from bottom-left
 * - 0.8s - 1.2s (40% - 60%): Full screen golden flash & starburst occlusion (apex at 1.0s / 50%)
 * - 1.2s - 2.0s (60% - 100%): Ribbons sweep out to top-right + star sparkles drift & reveal outro
 */
export function candyArcadeCelebrationStingerStylesCss(): string {
  return `
/* === Celebration Stinger Transition (2.0s) === */
.transition-celebration-stinger {
  position: absolute;
  inset: 0;
  z-index: 960;
  pointer-events: none;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.celebration-stinger-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Multi-ribbon Slanted Energy Slashes with Dis-occluded Geometry */
.celebration-ribbon {
  position: absolute;
  pointer-events: none;
  will-change: transform, opacity;
}

/* Primary Curtain Slash: Full screen golden backplate wipe */
.celebration-ribbon.ribbon-gold-primary {
  inset: -60%;
  background: linear-gradient(135deg, var(--celebration-gold, #F59E0B) 0%, #FBBF24 32%, #FEF08A 50%, var(--celebration-gold, #F59E0B) 85%, #D97706 100%);
  transform: skewX(-24deg) translate3d(-175%, 0, 0);
  border-right: 8px solid #FFFFFF;
  box-shadow: 0 0 70px rgba(245, 158, 11, 0.8), inset 14px 0 28px rgba(255, 255, 255, 0.6);
  animation: celebration-ribbon-primary var(--celebration-dur, 2s) cubic-bezier(0.25, 1, 0.35, 1) var(--clip-start, 0s) both;
}

/* Secondary Ribbon: Deep Violet / Magenta regal celebratory ribbon */
.celebration-ribbon.ribbon-violet-secondary {
  top: -60%;
  bottom: -60%;
  left: 50%;
  width: 440px;
  margin-left: -220px;
  background: linear-gradient(135deg, var(--celebration-violet, #7C3AED) 0%, #9333EA 50%, #EC4899 100%);
  transform: skewX(-24deg) translate3d(-340%, 0, 0);
  border-right: 6px solid #FFFFFF;
  border-left: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 55px rgba(124, 58, 237, 0.75), inset 8px 0 20px rgba(255, 255, 255, 0.4);
  animation: celebration-ribbon-secondary var(--celebration-dur, 2s) cubic-bezier(0.25, 1, 0.35, 1) calc(var(--clip-start, 0s) + 0.06s) both;
}

/* Accent Ribbon: Brilliant White-Gold laser streak */
.celebration-ribbon.ribbon-gold-accent {
  top: -60%;
  bottom: -60%;
  left: 50%;
  width: 190px;
  margin-left: -95px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FEF08A 45%, #F59E0B 100%);
  transform: skewX(-24deg) translate3d(-460%, 0, 0);
  border-right: 4px solid #FFFFFF;
  box-shadow: 0 0 45px rgba(254, 240, 138, 0.9), inset 4px 0 14px #FFFFFF;
  animation: celebration-ribbon-accent var(--celebration-dur, 2s) cubic-bezier(0.22, 1, 0.36, 1) calc(var(--clip-start, 0s) + 0.12s) both;
}

/* Apex Flash Burst: 100% screen occlusion at midpoint (progress 0.5) */
.celebration-flash-burst {
  position: absolute;
  inset: -15%;
  background: radial-gradient(circle at center, #FFFFFF 0%, rgba(254, 240, 138, 0.98) 28%, rgba(245, 158, 11, 0.85) 60%, rgba(124, 58, 237, 0.4) 85%, transparent 100%);
  opacity: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  animation: celebration-flash-burst var(--celebration-dur, 2s) ease-out var(--clip-start, 0s) both;
}

/* Center Star Badge Pulse */
.celebration-star-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  font-size: 110px;
  line-height: 1;
  color: #FFFFFF;
  text-shadow: 0 0 35px #FBBF24, 0 0 70px #F59E0B, 0 4px 12px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 10;
  animation: celebration-star-badge var(--celebration-dur, 2s) cubic-bezier(0.2, 0.8, 0.2, 1) var(--clip-start, 0s) both;
}

/* Sparkle Cluster & Flying Stars */
.celebration-sparkle-cluster {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 8;
}

.celebration-sparkle {
  position: absolute;
  display: block;
  opacity: 0;
  transform: scale(0.2);
  line-height: 1;
  pointer-events: none;
  will-change: transform, opacity;
}

.csp-1 { top: 22%; left: 24%; font-size: 42px; color: #FEF08A; text-shadow: 0 0 18px #F59E0B; animation: celebration-sparkle-a var(--celebration-dur, 2s) ease-out calc(var(--clip-start, 0s) + 0.15s) both; }
.csp-2 { top: 28%; right: 26%; font-size: 50px; color: #FFFFFF; text-shadow: 0 0 22px #FEF08A; animation: celebration-sparkle-b var(--celebration-dur, 2s) ease-out calc(var(--clip-start, 0s) + 0.20s) both; }
.csp-3 { bottom: 25%; left: 32%; font-size: 38px; color: #FBBF24; text-shadow: 0 0 16px #D97706; animation: celebration-sparkle-a var(--celebration-dur, 2s) ease-out calc(var(--clip-start, 0s) + 0.25s) both; }
.csp-4 { bottom: 22%; right: 28%; font-size: 46px; color: #FEF08A; text-shadow: 0 0 20px #F59E0B; animation: celebration-sparkle-b var(--celebration-dur, 2s) ease-out calc(var(--clip-start, 0s) + 0.18s) both; }
.csp-5 { top: 48%; left: 16%; font-size: 34px; color: #F472B6; text-shadow: 0 0 15px #EC4899; animation: celebration-sparkle-a var(--celebration-dur, 2s) ease-out calc(var(--clip-start, 0s) + 0.22s) both; }
.csp-6 { top: 46%; right: 18%; font-size: 36px; color: #60A5FA; text-shadow: 0 0 16px #3B82F6; animation: celebration-sparkle-b var(--celebration-dur, 2s) ease-out calc(var(--clip-start, 0s) + 0.28s) both; }

/* === Keyframe Animations (Synchronized to 2.0s timeline) === */

/* Primary Ribbon Animation:
   - 0% - 38%: Sweep in from left
   - 42% - 58%: Full screen occlusion covering the entire viewport
   - 62% - 100%: Accelerate out to the right
*/
@keyframes celebration-ribbon-primary {
  0% {
    transform: skewX(-24deg) translate3d(-175%, 0, 0);
  }
  38% {
    transform: skewX(-24deg) translate3d(-18%, 0, 0);
  }
  50% {
    transform: skewX(-24deg) translate3d(0%, 0, 0);
  }
  62% {
    transform: skewX(-24deg) translate3d(18%, 0, 0);
  }
  100% {
    transform: skewX(-24deg) translate3d(185%, 0, 0);
  }
}

@keyframes celebration-ribbon-secondary {
  0% {
    transform: skewX(-24deg) translate3d(-340%, 0, 0);
  }
  42% {
    transform: skewX(-24deg) translate3d(-25%, 0, 0);
  }
  52% {
    transform: skewX(-24deg) translate3d(5%, 0, 0);
  }
  100% {
    transform: skewX(-24deg) translate3d(320%, 0, 0);
  }
}

@keyframes celebration-ribbon-accent {
  0% {
    transform: skewX(-24deg) translate3d(-460%, 0, 0);
  }
  45% {
    transform: skewX(-24deg) translate3d(-20%, 0, 0);
  }
  54% {
    transform: skewX(-24deg) translate3d(15%, 0, 0);
  }
  100% {
    transform: skewX(-24deg) translate3d(440%, 0, 0);
  }
}

/* Apex Flash Burst:
   Peaks at 48% - 54% (100% occlusion), then dissipates smoothly
*/
@keyframes celebration-flash-burst {
  0%, 32% {
    opacity: 0;
    transform: scale(0.65);
  }
  46% {
    opacity: 0.95;
    transform: scale(1.02);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
  55% {
    opacity: 0.85;
    transform: scale(1.12);
  }
  75% {
    opacity: 0.25;
    transform: scale(1.22);
  }
  92%, 100% {
    opacity: 0;
    transform: scale(1.30);
  }
}

/* Center Star Badge Animation */
@keyframes celebration-star-badge {
  0%, 35% {
    transform: translate(-50%, -50%) scale(0) rotate(-45deg);
    opacity: 0;
  }
  48% {
    transform: translate(-50%, -50%) scale(1.15) rotate(0deg);
    opacity: 1;
  }
  52% {
    transform: translate(-50%, -50%) scale(1.25) rotate(6deg);
    opacity: 1;
  }
  68% {
    transform: translate(-50%, -50%) scale(0.9) rotate(18deg);
    opacity: 0.8;
  }
  88%, 100% {
    transform: translate(-50%, -50%) scale(0.3) rotate(35deg);
    opacity: 0;
  }
}

/* Sparkle Floating Animations */
@keyframes celebration-sparkle-a {
  0%, 30% {
    opacity: 0;
    transform: scale(0.2) rotate(0deg);
  }
  48% {
    opacity: 1;
    transform: scale(1.2) rotate(45deg);
  }
  60% {
    opacity: 0.9;
    transform: scale(1.0) translateY(-20px) rotate(90deg);
  }
  85%, 100% {
    opacity: 0;
    transform: scale(0.4) translateY(-50px) rotate(140deg);
  }
}

@keyframes celebration-sparkle-b {
  0%, 32% {
    opacity: 0;
    transform: scale(0.2) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.25) rotate(-35deg);
  }
  64% {
    opacity: 0.85;
    transform: scale(0.95) translateY(25px) rotate(-75deg);
  }
  88%, 100% {
    opacity: 0;
    transform: scale(0.35) translateY(60px) rotate(-120deg);
  }
}
`.trim();
}
