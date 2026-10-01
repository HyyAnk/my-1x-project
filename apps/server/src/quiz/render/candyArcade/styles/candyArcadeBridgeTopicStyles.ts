/**
 * Visual styling and CSS animation keyframes for Bridge Scene 1 (Topic Teaser).
 */

export function candyArcadeBridgeTopicStylesCss(): string {
  return `
/* Bridge Scene 1: Topic Teaser Stage */
.bridge-topic-scene {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 50%, #4338CA 0%, #312E81 40%, #1E1B4B 80%, #0F172A 100%);
  background-size: 130% 130%;
  animation: bridge-bg-breathe 10s ease-in-out infinite alternate;
  color: #FFFFFF;
}

.bridge-topic-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Center Spotlight Halo behind topic card */
.bridge-spotlight-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 900px;
  height: 900px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.4) 0%, rgba(99, 102, 241, 0.22) 40%, rgba(30, 27, 75, 0) 70%);
  filter: blur(50px);
  pointer-events: none;
  animation: bridge-spotlight-breathe 4.5s ease-in-out infinite alternate;
  z-index: 1;
}

/* Dynamic Radial Shockwave pulses bursting at clip entrance */
.bridge-topic-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 440px;
  height: 440px;
  margin-top: -220px;
  margin-left: -220px;
  border-radius: 50%;
  border: 4px solid rgba(251, 191, 36, 0.85);
  box-shadow: 0 0 35px rgba(245, 158, 11, 0.6), inset 0 0 25px rgba(251, 191, 36, 0.4);
  pointer-events: none;
  opacity: 0;
  z-index: 1;
}

.bridge-topic-shockwave.sw-1 {
  animation: bridge-shockwave-burst 1.4s cubic-bezier(0.1, 0.8, 0.25, 1) var(--clip-start, 0s) both;
}

.bridge-topic-shockwave.sw-2 {
  border-color: rgba(56, 189, 248, 0.85);
  box-shadow: 0 0 40px rgba(56, 189, 248, 0.5), inset 0 0 25px rgba(56, 189, 248, 0.35);
  animation: bridge-shockwave-burst 1.6s cubic-bezier(0.1, 0.8, 0.25, 1) calc(var(--clip-start, 0s) + 0.18s) both;
}

/* Continuous Kinetic Monogram Loop (Infinite Vertical Rising Columns) */
.bridge-kinetic-monogram {
  position: absolute;
  inset: -15% -4%;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.18;
  z-index: 1;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-start;
  gap: 20px;
}

.bridge-monogram-column {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
  height: 100%;
}

.bridge-monogram-track {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: bridge-monogram-drift-up 10s linear infinite;
  will-change: transform;
}

.bridge-monogram-column.col-1 .bridge-monogram-track { animation-duration: 9.5s; animation-delay: -2s; }
.bridge-monogram-column.col-2 .bridge-monogram-track { animation-duration: 11s; animation-delay: -7s; }
.bridge-monogram-column.col-3 .bridge-monogram-track { animation-duration: 9.8s; animation-delay: -4s; }
.bridge-monogram-column.col-4 .bridge-monogram-track { animation-duration: 10.5s; animation-delay: -8.5s; }
.bridge-monogram-column.col-5 .bridge-monogram-track { animation-duration: 9.2s; animation-delay: -1.5s; }
.bridge-monogram-column.col-6 .bridge-monogram-track { animation-duration: 11.2s; animation-delay: -6s; }

.bridge-monogram-group {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.monogram-brand-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.13);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  color: #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.monogram-logo-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.monogram-initial-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 900;
}

.monogram-accent-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

.monogram-accent-icon {
  font-size: 18px;
  display: inline-block;
}

/* Cinematic edge vignette */
.bridge-vignette-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(15, 23, 42, 0.65) 100%);
  z-index: 2;
}

.bridge-ambient-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(55px);
  opacity: 0.3;
}

.bridge-ambient-orb.orb-1 {
  width: 520px;
  height: 520px;
  top: -120px;
  left: -80px;
  background: radial-gradient(circle, #EC4899 0%, rgba(236, 72, 153, 0) 70%);
  animation: bridge-orb-float-1 9s ease-in-out infinite alternate;
}

.bridge-ambient-orb.orb-2 {
  width: 560px;
  height: 560px;
  bottom: -140px;
  right: -100px;
  background: radial-gradient(circle, #38BDF8 0%, rgba(56, 189, 248, 0) 70%);
  animation: bridge-orb-float-2 11s ease-in-out infinite alternate;
}

.bridge-ambient-orb.orb-3 {
  width: 440px;
  height: 440px;
  top: 35%;
  right: 12%;
  background: radial-gradient(circle, #F59E0B 0%, rgba(245, 158, 11, 0) 70%);
  opacity: 0.25;
  animation: bridge-orb-float-3 10s ease-in-out infinite alternate;
}

.bridge-ambient-drift-icons {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}

.bridge-drift-icon {
  position: absolute;
  color: #FFFFFF;
  opacity: 0.18;
  line-height: 1;
  pointer-events: none;
  filter: drop-shadow(0 2px 8px rgba(255, 255, 255, 0.25));
  user-select: none;
}

.bridge-drift-icon.di-1 {
  top: 10%;
  left: 6%;
  font-size: 42px;
  animation: bridge-icon-drift-loop-1 8s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-2 {
  top: 14%;
  right: 8%;
  font-size: 38px;
  animation: bridge-icon-drift-loop-2 10s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-3 {
  top: 48%;
  left: 4%;
  font-size: 46px;
  opacity: 0.15;
  animation: bridge-icon-drift-loop-3 9s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-4 {
  top: 52%;
  right: 5%;
  font-size: 40px;
  animation: bridge-icon-drift-loop-4 7.5s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-5 {
  bottom: 12%;
  left: 9%;
  font-size: 44px;
  opacity: 0.16;
  animation: bridge-icon-drift-loop-5 11s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-6 {
  bottom: 14%;
  right: 12%;
  font-size: 36px;
  animation: bridge-icon-drift-loop-6 8.5s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-7 {
  top: 26%;
  left: 14%;
  font-size: 34px;
  opacity: 0.14;
  animation: bridge-icon-drift-loop-7 9.5s ease-in-out infinite alternate;
}

.bridge-drift-icon.di-8 {
  bottom: 26%;
  right: 18%;
  font-size: 32px;
  opacity: 0.15;
  animation: bridge-icon-drift-loop-8 10.5s ease-in-out infinite alternate;
}

.bridge-floating-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bridge-sparkle {
  position: absolute;
  font-size: 32px;
  line-height: 1;
  pointer-events: none;
  animation: bridge-sparkle-float 3.5s ease-in-out infinite alternate;
}

.bridge-sparkle.sp-1 { top: 12%; left: 8%; color: #FBBF24; animation-delay: 0s; font-size: 38px; }
.bridge-sparkle.sp-2 { top: 16%; right: 10%; color: #F472B6; animation-delay: 0.8s; font-size: 42px; }
.bridge-sparkle.sp-3 { bottom: 14%; left: 12%; color: #38BDF8; animation-delay: 1.4s; font-size: 36px; }
.bridge-sparkle.sp-4 { bottom: 18%; right: 14%; color: #FACC15; animation-delay: 2.1s; font-size: 40px; }

.bridge-topic-card {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 1220px;
  width: min(90vw, 1220px);
  padding: 52px 64px;
  box-sizing: border-box;
  border-radius: 54px;
  border: 8px solid #FFC938;
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFDF7 25%, #FFF8EA 100%);
  box-shadow:
    inset 0 6px 0 rgba(255, 255, 255, 0.95),
    inset 0 -8px 0 rgba(245, 166, 35, 0.25),
    0 16px 0 #D97706,
    0 28px 0 rgba(15, 23, 42, 0.35),
    0 42px 70px rgba(0, 0, 0, 0.35);
  animation: bridge-card-pop 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) var(--clip-start, 0s) both;
}

.bridge-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 38px;
  border-radius: 999px;
  border: 4.5px solid #FFFFFF;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  color: #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 1.5px;
  box-shadow:
    0 10px 0 #92400E,
    0 18px 26px rgba(217, 119, 6, 0.42);
  transform: rotate(-1.5deg);
  margin-bottom: 24px;
  animation: bridge-pill-pulse 2.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite alternate;
}

.bridge-pill-icon {
  font-size: 32px;
  display: inline-block;
  animation: bridge-icon-wiggle 2s ease-in-out infinite alternate 0.4s;
}

.bridge-topic-title {
  margin: 0;
  max-width: 1100px;
  width: 100%;
  color: #1E1B4B;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 92px;
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -1.5px;
  text-shadow:
    0 3px 0 #FFFFFF,
    0 7px 0 #E0E7FF,
    0 16px 26px rgba(30, 27, 75, 0.22);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  animation: bridge-title-pop 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + 0.12s) both;
}

.bridge-topic-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  border-radius: 999px;
  border: 3.5px solid #FFFFFF;
  background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%);
  color: #FFFFFF;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  box-shadow:
    0 8px 0 #9D174D,
    0 14px 20px rgba(219, 39, 119, 0.3);
  transform: rotate(-1.5deg);
  margin-bottom: 18px;
  animation: bridge-badge-wave 3s ease-in-out infinite alternate;
}

.bridge-badge-icon {
  font-size: 24px;
  display: inline-block;
  animation: bridge-icon-wiggle 1.8s ease-in-out infinite alternate;
}

.bridge-topic-prompt {
  margin: 18px 0 0 0;
  color: #4B5563;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.2px;
  line-height: 1.3;
  animation: bridge-prompt-bob 2.8s ease-in-out infinite alternate;
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

.bridge-star-tr {
  top: -22px;
  right: 50px;
  color: #38BDF8;
  transform: rotate(20deg);
  filter: drop-shadow(0 6px 12px rgba(56, 189, 248, 0.5));
  animation: star-wobble 2.6s ease-in-out infinite alternate 0.3s;
}

.bridge-star-bl {
  bottom: -22px;
  left: 50px;
  color: #A855F7;
  transform: rotate(-20deg);
  filter: drop-shadow(0 6px 12px rgba(168, 85, 247, 0.5));
  animation: star-wobble 2.8s ease-in-out infinite alternate 0.8s;
}

.bridge-topic-scene .mascot-stage,
.bridge-topic-scene .brand-mascot {
  position: absolute;
  bottom: 40px;
  right: 60px;
  z-index: 10;
  pointer-events: none;
  animation: bridge-mascot-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) calc(var(--clip-start, 0s) + 0.25s) both;
}

.bridge-topic-scene .brand-mascot {
  font-size: 72px;
  color: #FFC938;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
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

@keyframes bridge-title-pop {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(24px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes bridge-pill-pulse {
  0% {
    transform: rotate(-2.5deg) scale(1);
  }
  50% {
    transform: rotate(1.5deg) scale(1.08, 0.94);
  }
  100% {
    transform: rotate(-2.5deg) scale(0.98, 1.04);
  }
}

@keyframes bridge-badge-wave {
  0% {
    transform: rotate(-1.5deg) translateY(0);
  }
  100% {
    transform: rotate(1.5deg) translateY(-4px);
  }
}

@keyframes bridge-icon-wiggle {
  0%, 100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(12deg) scale(1.15);
  }
}

@keyframes bridge-prompt-bob {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-4px);
  }
}

@keyframes star-wobble {
  0% {
    transform: rotate(-15deg) scale(0.95);
  }
  50% {
    transform: rotate(0deg) scale(1.15);
  }
  100% {
    transform: rotate(15deg) scale(0.95);
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

@keyframes bridge-bg-breathe {
  0% {
    background-position: 50% 45%;
    filter: brightness(1) saturate(1);
  }
  100% {
    background-position: 52% 52%;
    filter: brightness(1.08) saturate(1.1);
  }
}

@keyframes bridge-orb-float-1 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(40px, 50px) scale(1.15);
  }
  100% {
    transform: translate(-30px, 80px) scale(0.95);
  }
}

@keyframes bridge-orb-float-2 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-50px, -40px) scale(1.12);
  }
  100% {
    transform: translate(30px, -70px) scale(0.92);
  }
}

@keyframes bridge-orb-float-3 {
  0% {
    transform: translate(0, 0) scale(0.92);
  }
  100% {
    transform: translate(-40px, 30px) scale(1.15);
  }
}

@keyframes bridge-icon-drift-loop-1 {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(0.95);
    opacity: 0.15;
  }
  50% {
    transform: translate(25px, -30px) rotate(18deg) scale(1.1);
    opacity: 0.24;
  }
  100% {
    transform: translate(-18px, -50px) rotate(-12deg) scale(1);
    opacity: 0.16;
  }
}

@keyframes bridge-icon-drift-loop-2 {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 0.18;
  }
  50% {
    transform: translate(-30px, 35px) rotate(-25deg) scale(1.15);
    opacity: 0.26;
  }
  100% {
    transform: translate(20px, 60px) rotate(15deg) scale(0.9);
    opacity: 0.14;
  }
}

@keyframes bridge-icon-drift-loop-3 {
  0% {
    transform: translate(0, 0) rotate(-10deg) scale(1);
    opacity: 0.13;
  }
  50% {
    transform: translate(35px, 20px) rotate(15deg) scale(1.12);
    opacity: 0.22;
  }
  100% {
    transform: translate(15px, -35px) rotate(-5deg) scale(0.95);
    opacity: 0.15;
  }
}

@keyframes bridge-icon-drift-loop-4 {
  0% {
    transform: translate(0, 0) rotate(5deg) scale(0.92);
    opacity: 0.16;
  }
  50% {
    transform: translate(-25px, -30px) rotate(-20deg) scale(1.1);
    opacity: 0.25;
  }
  100% {
    transform: translate(-40px, 15px) rotate(10deg) scale(1);
    opacity: 0.15;
  }
}

@keyframes bridge-icon-drift-loop-5 {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 0.14;
  }
  50% {
    transform: translate(20px, -40px) rotate(22deg) scale(1.15);
    opacity: 0.24;
  }
  100% {
    transform: translate(-25px, -20px) rotate(-15deg) scale(0.9);
    opacity: 0.13;
  }
}

@keyframes bridge-icon-drift-loop-6 {
  0% {
    transform: translate(0, 0) rotate(-8deg) scale(0.9);
    opacity: 0.17;
  }
  50% {
    transform: translate(-35px, -25px) rotate(18deg) scale(1.18);
    opacity: 0.28;
  }
  100% {
    transform: translate(15px, -45px) rotate(-12deg) scale(0.95);
    opacity: 0.16;
  }
}

@keyframes bridge-icon-drift-loop-7 {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(0.9);
    opacity: 0.12;
  }
  50% {
    transform: translate(25px, 30px) rotate(-15deg) scale(1.1);
    opacity: 0.2;
  }
  100% {
    transform: translate(-20px, 50px) rotate(12deg) scale(0.95);
    opacity: 0.12;
  }
}

@keyframes bridge-icon-drift-loop-8 {
  0% {
    transform: translate(0, 0) rotate(10deg) scale(1);
    opacity: 0.13;
  }
  50% {
    transform: translate(-20px, -35px) rotate(-18deg) scale(1.12);
    opacity: 0.22;
  }
  100% {
    transform: translate(25px, -20px) rotate(8deg) scale(0.9);
    opacity: 0.14;
  }
}

@keyframes bridge-monogram-drift-up {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(0, -50%, 0);
  }
}

@keyframes bridge-spotlight-breathe {
  0% {
    transform: translate(-50%, -50%) scale(0.92);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.08);
    opacity: 1;
  }
}

@keyframes bridge-shockwave-burst {
  0% {
    transform: scale(0.35);
    opacity: 0.85;
  }
  50% {
    opacity: 0.55;
  }
  100% {
    transform: scale(3.2);
    opacity: 0;
  }
}

@media (max-aspect-ratio: 1/1) {
  .bridge-kinetic-monogram {
    inset: -15% -6%;
    gap: 12px;
    opacity: 0.16;
  }
  .bridge-monogram-column:nth-child(n+5) {
    display: none;
  }
  .bridge-monogram-track {
    gap: 20px;
  }
  .bridge-monogram-group {
    gap: 20px;
  }
  .monogram-brand-item {
    font-size: 16px;
    padding: 6px 14px;
    gap: 8px;
  }
  .monogram-logo-img,
  .monogram-initial-badge {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
  .monogram-accent-item {
    font-size: 15px;
    padding: 5px 12px;
  }
  .monogram-accent-icon {
    font-size: 15px;
  }
  .bridge-drift-icon {
    font-size: 26px !important;
    opacity: 0.14;
  }
  .bridge-topic-card {
    max-width: 94vw;
    padding: 38px 24px;
    border-radius: 40px;
    border-width: 6px;
  }
  .bridge-topic-badge {
    font-size: 18px;
    padding: 8px 18px;
    margin-bottom: 14px;
  }
  .bridge-count-pill {
    font-size: 24px;
    padding: 10px 26px;
    margin-bottom: 16px;
  }
  .bridge-pill-icon {
    font-size: 24px;
  }
  .bridge-topic-title {
    font-size: 64px;
    letter-spacing: -1px;
    line-height: 1.15;
  }
  .bridge-topic-prompt {
    font-size: 22px;
    margin-top: 14px;
    line-height: 1.25;
  }
  .bridge-topic-scene .mascot-stage,
  .bridge-topic-scene .brand-mascot {
    bottom: 20px;
    right: 50%;
    transform: translateX(50%);
  }
}
`;
}
