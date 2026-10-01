/**
 * GPU-accelerated styling and motion keyframes for Arcade Energy Whip Transition (1.2s / 36 frames).
 * Synchronized with:
 * - 0.0s - 0.5s: Dynamic triple slashes whip in from left + speed lines flash
 * - 0.5s - 0.7s: Full screen occlusion + center flash burst & sparkle impact
 * - 0.7s - 1.2s: Slashes whip out to right + smooth reveal of Question 1 stage
 */
export function candyArcadeEnergyWhipStylesCss(): string {
  return `
/* === Arcade Energy Whip Transition (1.2s) === */
.transition-energy-whip {
  position: absolute;
  inset: 0;
  z-index: 950;
  pointer-events: none;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.energy-whip-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Triple-ribbon Slanted Energy Slashes with Dis-occluded Geometry */
.energy-whip-slash {
  position: absolute;
  pointer-events: none;
  will-change: transform;
}

/* Primary Curtain Slash: Full screen backplate wipe */
.energy-whip-slash.slash-primary {
  inset: -60%;
  background: linear-gradient(135deg, var(--whip-from, #7C3AED) 0%, #9333EA 45%, var(--whip-to, #EC4899) 100%);
  transform: skewX(-24deg) translate3d(-170%, 0, 0);
  border-right: 7px solid #FFFFFF;
  box-shadow: 0 0 60px rgba(124, 58, 237, 0.7), inset 12px 0 24px rgba(255, 255, 255, 0.4);
  animation: whip-slash-primary var(--whip-dur, 1.2s) linear var(--clip-start, 0s) both;
}

/* Secondary Ribbon: Cyan/Blue electric neon ribbon */
.energy-whip-slash.slash-secondary {
  top: -60%;
  bottom: -60%;
  left: 50%;
  width: 380px;
  margin-left: -190px;
  background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #6366F1 100%);
  transform: skewX(-24deg) translate3d(-320%, 0, 0);
  border-right: 6px solid #FFFFFF;
  border-left: 2px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 0 50px rgba(6, 182, 212, 0.7), inset 8px 0 20px rgba(255, 255, 255, 0.4);
  animation: whip-slash-secondary var(--whip-dur, 1.2s) linear var(--clip-start, 0s) both;
}

/* Accent Ribbon: Gold/Amber leading laser streak */
.energy-whip-slash.slash-accent {
  top: -60%;
  bottom: -60%;
  left: 50%;
  width: 220px;
  margin-left: -110px;
  background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, var(--whip-accent, #FDE047) 100%);
  transform: skewX(-24deg) translate3d(-500%, 0, 0);
  border-right: 5px solid #FFFFFF;
  border-left: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 45px rgba(245, 158, 11, 0.85);
  animation: whip-slash-accent var(--whip-dur, 1.2s) linear var(--clip-start, 0s) both;
}

/* Horizontal Speed Lines */
.energy-whip-speed-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.whip-line {
  position: absolute;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 50%, transparent 100%);
  opacity: 0;
  will-change: transform, opacity;
}

.whip-line.wl-1 { top: 25%; left: 0; right: 0; animation: whip-speed-line var(--whip-dur, 1.2s) ease-in-out calc(var(--clip-start, 0s) + 0.05s) both; }
.whip-line.wl-2 { top: 45%; left: 0; right: 0; height: 6px; animation: whip-speed-line var(--whip-dur, 1.2s) ease-in-out calc(var(--clip-start, 0s) + 0.12s) both; }
.whip-line.wl-3 { top: 65%; left: 0; right: 0; animation: whip-speed-line var(--whip-dur, 1.2s) ease-in-out calc(var(--clip-start, 0s) + 0.08s) both; }
.whip-line.wl-4 { top: 80%; left: 0; right: 0; height: 5px; animation: whip-speed-line var(--whip-dur, 1.2s) ease-in-out calc(var(--clip-start, 0s) + 0.15s) both; }

/* Apex Occlusion Flash Burst (Balanced Opacity & Scale) */
.energy-whip-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.85) 15%, rgba(254, 240, 138, 0.65) 45%, rgba(236, 72, 153, 0.3) 75%, transparent 100%);
  opacity: 0;
  pointer-events: none;
  will-change: opacity;
  animation: whip-flash-burst var(--whip-dur, 1.2s) linear var(--clip-start, 0s) both;
}

/* Twinkling Star Sparks at Apex */
.energy-whip-spark-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.whip-spark {
  position: absolute;
  font-size: 40px;
  line-height: 1;
  color: #FEF08A;
  filter: drop-shadow(0 0 16px rgba(254, 240, 138, 0.9));
  opacity: 0;
}

.whip-spark.ws-1 { top: -60px; left: -80px; animation: whip-spark-pop var(--whip-dur, 1.2s) ease-out calc(var(--clip-start, 0s) + 0.35s) both; }
.whip-spark.ws-2 { top: -70px; right: -90px; color: #F472B6; animation: whip-spark-pop var(--whip-dur, 1.2s) ease-out calc(var(--clip-start, 0s) + 0.38s) both; }
.whip-spark.ws-3 { bottom: -60px; left: -70px; color: #38BDF8; animation: whip-spark-pop var(--whip-dur, 1.2s) ease-out calc(var(--clip-start, 0s) + 0.40s) both; }
.whip-spark.ws-4 { bottom: -80px; right: -80px; animation: whip-spark-pop var(--whip-dur, 1.2s) ease-out calc(var(--clip-start, 0s) + 0.42s) both; }

/* === Responsive Aspect Ratio Adjustments (9:16 Shorts / Reels) === */
.transition-energy-whip[data-aspect-ratio="9:16"] .energy-whip-slash.slash-secondary {
  width: 260px;
  margin-left: -130px;
}

.transition-energy-whip[data-aspect-ratio="9:16"] .energy-whip-slash.slash-accent {
  width: 150px;
  margin-left: -75px;
}

.transition-energy-whip[data-aspect-ratio="9:16"] .whip-spark {
  font-size: 32px;
}

/* === Keyframe Animations with Deterministic Per-Keyframe Timing Functions === */
@keyframes whip-slash-primary {
  0% {
    transform: skewX(-24deg) translate3d(-170%, 0, 0);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  42% {
    transform: skewX(-24deg) translate3d(-8%, 0, 0);
    animation-timing-function: linear;
  }
  56% {
    transform: skewX(-24deg) translate3d(8%, 0, 0);
    animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);
  }
  100% {
    transform: skewX(-24deg) translate3d(180%, 0, 0);
  }
}

@keyframes whip-slash-secondary {
  0% {
    transform: skewX(-24deg) translate3d(-320%, 0, 0);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  42% {
    transform: skewX(-24deg) translate3d(-40px, 0, 0);
    animation-timing-function: linear;
  }
  56% {
    transform: skewX(-24deg) translate3d(140px, 0, 0);
    animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);
  }
  100% {
    transform: skewX(-24deg) translate3d(360%, 0, 0);
  }
}

@keyframes whip-slash-accent {
  0% {
    transform: skewX(-24deg) translate3d(-500%, 0, 0);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  42% {
    transform: skewX(-24deg) translate3d(200px, 0, 0);
    animation-timing-function: linear;
  }
  56% {
    transform: skewX(-24deg) translate3d(380px, 0, 0);
    animation-timing-function: cubic-bezier(0.35, 0, 0.15, 1);
  }
  100% {
    transform: skewX(-24deg) translate3d(550%, 0, 0);
  }
}

@keyframes whip-flash-burst {
  0%, 38% {
    opacity: 0;
    transform: scale(0.6);
    animation-timing-function: ease-out;
  }
  47% {
    opacity: 0.72;
    transform: scale(1.0);
    animation-timing-function: ease-in;
  }
  55% {
    opacity: 0.72;
    transform: scale(1.06);
    animation-timing-function: ease-out;
  }
  68% {
    opacity: 0;
    transform: scale(1.25);
  }
  100% {
    opacity: 0;
  }
}

@keyframes whip-speed-line {
  0%, 25% { opacity: 0; transform: scaleX(0.2) translate3d(-80px, 0, 0); }
  40%, 55% { opacity: 0.85; transform: scaleX(1.4) translate3d(20px, 0, 0); }
  70%, 100% { opacity: 0; transform: scaleX(0.5) translate3d(120px, 0, 0); }
}

@keyframes whip-spark-pop {
  0%, 35% { opacity: 0; transform: scale(0.2) rotate(0deg); }
  48% { opacity: 1; transform: scale(1.3) rotate(35deg); }
  62% { opacity: 0.9; transform: scale(1.0) rotate(70deg); }
  76%, 100% { opacity: 0; transform: scale(0.4) rotate(110deg); }
}
`;
}
