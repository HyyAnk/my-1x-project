export function treasureTrailMotionCss(): string {
  return `
.thinking-bar-treasure-trail .trail-waypoint {
  animation-duration: var(--timer-duration);
  animation-timing-function: linear;
  animation-delay: var(--timer-start);
  animation-fill-mode: both;
}

.thinking-bar-treasure-trail .trail-waypoint.point-4 { animation-name: expeditionWaypointFourth; }
.thinking-bar-treasure-trail .trail-waypoint.point-3 { animation-name: expeditionWaypointThird; }
.thinking-bar-treasure-trail .trail-waypoint.point-2 { animation-name: expeditionWaypointSecond; }
.thinking-bar-treasure-trail .trail-waypoint.point-1 { animation-name: expeditionWaypointFirst; }

.thinking-bar-treasure-trail .trail-progress-fill::before {
  position: absolute;
  inset: 0;
  background:
    repeating-radial-gradient(ellipse at 30% 120%, transparent 0 18px, rgba(255, 251, 235, 0.2) 20px 21px, transparent 23px 42px),
    repeating-linear-gradient(108deg, transparent 0 42px, rgba(255, 248, 210, 0.18) 48px 54px, transparent 62px 106px);
  content: "";
  animation: expeditionContourDrift var(--timer-duration) linear var(--timer-start) both;
}

.thinking-bar-treasure-trail .trail-progress-fill::after {
  position: absolute;
  top: -5px;
  right: -8px;
  bottom: -5px;
  width: 24px;
  border-radius: 50%;
  background: radial-gradient(ellipse, #FFFDF0 0 16%, #FDE047 34%, rgba(245, 158, 11, 0.55) 58%, transparent 74%);
  filter: drop-shadow(0 0 9px #FDE047);
  content: "";
  animation: expeditionFrontPulse 0.75s ease-in-out var(--timer-start) 18 alternate both;
}

.thinking-bar-treasure-trail .trail-wake {
  position: absolute;
  top: 50%;
  left: 62%;
  width: 98px;
  height: 72px;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 2;
}

.thinking-bar-treasure-trail .trail-wake i {
  --wake-angle: 0deg;
  position: absolute;
  left: 0;
  width: 72px;
  height: 5px;
  border-radius: 9999px;
  background: linear-gradient(90deg, rgba(253, 224, 71, 0.86), transparent);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.65);
  transform-origin: left center;
  animation: expeditionWakeTrail 0.95s ease-out var(--timer-start) 15 both;
}

.thinking-bar-treasure-trail .trail-wake i:nth-child(1) { --wake-angle: -9deg; top: 17px; }
.thinking-bar-treasure-trail .trail-wake i:nth-child(2) { top: 34px; width: 90px; animation-delay: calc(var(--timer-start) + 0.2s); }
.thinking-bar-treasure-trail .trail-wake i:nth-child(3) { --wake-angle: 8deg; top: 51px; width: 62px; animation-delay: calc(var(--timer-start) + 0.42s); }

.thinking-bar-treasure-trail .helm-needle-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 88px;
  border-radius: 9999px 9999px 4px 4px;
  background: linear-gradient(180deg, #EF4444 0 47%, #FFFDF0 47% 100%);
  box-shadow: 0 0 8px rgba(253, 224, 71, 0.82), 0 2px 4px rgba(0, 0, 0, 0.8);
  transform: translate(-50%, -50%);
  transform-origin: 50% 50%;
  animation: expeditionNeedleSearch var(--timer-duration) cubic-bezier(0.45, 0, 0.25, 1) var(--timer-start) both;
  pointer-events: none;
  z-index: 4;
}

.thinking-bar-treasure-trail .helm-needle-overlay::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 17px;
  height: 17px;
  border: 3px solid #78350F;
  border-radius: 50%;
  background: #FDE047;
  box-shadow: 0 0 8px rgba(253, 224, 71, 0.9);
  content: "";
  transform: translate(-50%, -50%);
}

@keyframes expeditionDestinationSignal {
  0%, 58% { transform: translateY(-50%) scale(0.96); filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.45)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.55)); }
  76% { transform: translateY(-50%) scale(1.02); filter: drop-shadow(0 0 28px rgba(245, 158, 11, 0.75)) drop-shadow(0 10px 22px rgba(0, 0, 0, 0.5)); }
  90% { transform: translateY(-50%) scale(1.12) rotate(-2deg); filter: drop-shadow(0 0 42px rgba(253, 224, 71, 0.95)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.45)); }
  100% { transform: translateY(-50%) scale(1.06); filter: drop-shadow(0 0 32px rgba(245, 158, 11, 0.9)) drop-shadow(0 10px 22px rgba(0, 0, 0, 0.48)); }
}

@keyframes expeditionRouteMarch { from { background-position: 0 50%; } to { background-position: -620px 50%; } }
@keyframes expeditionContourDrift { from { background-position: 0 0, 0 0; } to { background-position: -380px 0, 520px 0; } }
@keyframes expeditionTrailCharge { 0%, 55% { filter: saturate(0.95) brightness(0.94); } 78% { filter: saturate(1.18) brightness(1.04); } 100% { filter: saturate(1.42) brightness(1.14); } }
@keyframes expeditionFrontPulse { from { opacity: 0.6; transform: scaleY(0.72); } to { opacity: 1; transform: scaleY(1.18); } }
@keyframes expeditionWaypointFourth { 0%, 10% { opacity: 0.58; transform: scale(0.86); } 18% { opacity: 1; transform: scale(1.5) rotate(12deg); filter: drop-shadow(0 0 9px #FDE047); } 26%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 3px rgba(253, 224, 71, 0.7)); } }
@keyframes expeditionWaypointThird { 0%, 30% { opacity: 0.58; transform: scale(0.86); } 38% { opacity: 1; transform: scale(1.5) rotate(-12deg); filter: drop-shadow(0 0 9px #FDE047); } 46%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 3px rgba(253, 224, 71, 0.7)); } }
@keyframes expeditionWaypointSecond { 0%, 50% { opacity: 0.58; transform: scale(0.86); } 58% { opacity: 1; transform: scale(1.5) rotate(12deg); filter: drop-shadow(0 0 9px #FDE047); } 66%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 3px rgba(253, 224, 71, 0.7)); } }
@keyframes expeditionWaypointFirst { 0%, 70% { opacity: 0.58; transform: scale(0.86); } 78% { opacity: 1; transform: scale(1.5) rotate(-12deg); filter: drop-shadow(0 0 9px #FDE047); } 86%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 3px rgba(253, 224, 71, 0.7)); } }
@keyframes expeditionHelmTurn { 0% { transform: rotate(0deg) scale(0.98); } 22% { transform: rotate(-150deg) scale(1.03); } 48% { transform: rotate(-330deg) scale(0.98); } 72% { transform: rotate(-520deg) scale(1.04); } 100% { transform: rotate(-720deg) scale(1); } }
@keyframes expeditionNeedleSearch { 0% { transform: translate(-50%, -50%) rotate(24deg); } 18% { transform: translate(-50%, -50%) rotate(-42deg); } 38% { transform: translate(-50%, -50%) rotate(32deg); } 61% { transform: translate(-50%, -50%) rotate(-18deg); } 82% { transform: translate(-50%, -50%) rotate(8deg); } 100% { transform: translate(-50%, -50%) rotate(0deg); } }
@keyframes expeditionWakeTrail { 0% { opacity: 0; transform: translateX(-10px) scaleX(0.18) rotate(var(--wake-angle)); } 24% { opacity: 0.86; } 100% { opacity: 0; transform: translateX(42px) scaleX(1) rotate(var(--wake-angle)); } }
@keyframes expeditionHelmSparkle { 0% { opacity: 0.35; transform: scale(0.85); } 100% { opacity: 1; transform: scale(1.2); } }

@media (prefers-reduced-motion: reduce) {
  .thinking-bar-treasure-trail { animation-duration: var(--timer-duration), .001ms !important; }
  .thinking-bar-treasure-trail .trail-progress-fill { animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both !important; }
  .thinking-bar-treasure-trail .trail-ship-marker { animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both !important; }
  .thinking-bar-treasure-trail .marker-val { animation-duration: 1s !important; }
  .thinking-bar-treasure-trail .trail-destination, .thinking-bar-treasure-trail .trail-dotted-line, .thinking-bar-treasure-trail .trail-waypoint, .thinking-bar-treasure-trail .expedition-helm-svg, .thinking-bar-treasure-trail .helm-needle-overlay, .thinking-bar-treasure-trail .helm-sparkles i { animation: none !important; }
  .thinking-bar-treasure-trail .trail-wake, .thinking-bar-treasure-trail .helm-sparkles, .thinking-bar-treasure-trail .trail-progress-fill::before, .thinking-bar-treasure-trail .trail-progress-fill::after { display: none; }
}

@media (max-width: 640px) {
  .thinking-bar-treasure-trail .trail-track { height: 58px; }
  .thinking-bar-treasure-trail .trail-channel { height: 32px; margin-left: 28px; }
  .thinking-bar-treasure-trail .trail-destination { left: -48px; width: 140px; height: 140px; }
  .thinking-bar-treasure-trail .trail-ship-marker { width: 142px; height: 142px; }
  .thinking-bar-treasure-trail .trail-waypoint-svg { width: 18px; height: 18px; }
  .thinking-bar-treasure-trail .helm-needle-overlay { height: 68px; }
  .thinking-bar-treasure-trail .trail-wake { display: none; }
  .thinking-bar-treasure-trail .marker-val { font-size: 52px; }
}
`;
}
