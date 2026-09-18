/**
 * Candy Arcade animation keyframe definitions.
 */

export function candyArcadeKeyframesCss(): string {
  return `
@keyframes hero-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes answer-float { 50% { transform: translateY(-4px) rotate(.25deg); } }
@keyframes visual-choice-float { 0% { transform: translateY(0px) rotate(-0.8deg) scale(1); } 50% { transform: translateY(-7px) rotate(1deg) scale(1.012); } 100% { transform: translateY(-2px) rotate(-0.5deg) scale(1.004); } }
@keyframes question-card-enter { from { opacity: 0; transform: translateY(24px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes question-card-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes hanging-sign-enter { 0% { transform: translateY(-70px) rotate(5deg); opacity: 0; } 70% { transform: translateY(5px) rotate(-2deg); } 100% { transform: translateY(0) rotate(0deg); opacity: 1; } }
@keyframes hanging-sign-sway { 0% { transform: rotate(-1.8deg) translateY(0); } 50% { transform: rotate(0.3deg) translateY(-1px); } 100% { transform: rotate(1.8deg) translateY(0); } }
@keyframes star-wobble { 0% { transform: rotate(-10deg) scale(1); } 100% { transform: rotate(2deg) scale(1.05); } }
@keyframes sparkle-blink { 0%, 100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
@keyframes title-enter { from { opacity: 0; transform: translateY(28px) scale(.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes hero-enter { from { opacity: 0; transform: translateY(42px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes answer-enter { from { opacity: 0; transform: translateY(32px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes enter-from-left { from { opacity: 0; transform: translateX(-60px) scale(.94); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes enter-from-right { from { opacity: 0; transform: translateX(60px) scale(.94); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes phase-enter { from { opacity: 0; } to { opacity: 1; } }
@keyframes phase-hold { 0%,100% { opacity: 0; } 1%,99% { opacity: 1; } }
@keyframes quiz-timer-drain { from { width: 100%; } to { width: 0%; } }
@keyframes quiz-timer-marker-slide { from { left: 100%; } to { left: 0%; } }
@keyframes query-hold { 0%, 92% { opacity: 1; transform: translateY(-2px) scale(1); } 100% { opacity: 0; transform: translateY(-2px) scale(.85); } }
@keyframes number-countdown-tick { 0% { opacity: 0; transform: translateY(-2px) scale(1.4) rotate(-6deg); text-shadow: 0 0 16px rgba(255,255,255,1), 0 4px 0 rgba(13,35,71,.3); } 3% { opacity: 1; transform: translateY(-2px) scale(1.3) rotate(-4deg); } 14% { opacity: 1; transform: translateY(-2px) scale(1.05) rotate(0deg); text-shadow: 0 0 10px rgba(255,230,120,.9), 0 3px 0 rgba(13,35,71,.25); } 82% { opacity: 1; transform: translateY(-2px) scale(1); } 100% { opacity: 0; transform: translateY(-2px) scale(0.75); } }
@keyframes number-countdown-final { 0% { opacity: 0; transform: translateY(-2px) scale(1.6) rotate(-8deg); text-shadow: 0 0 24px rgba(255,50,50,1), 0 4px 0 rgba(13,35,71,.35); } 3% { opacity: 1; transform: translateY(-2px) scale(1.4) rotate(-5deg); } 16% { opacity: 1; transform: translateY(-2px) scale(1.2) rotate(0deg); text-shadow: 0 0 16px rgba(255,40,40,1), 0 3px 0 rgba(13,35,71,.3); } 45% { transform: translateY(-2px) scale(0.96); } 70% { transform: translateY(-2px) scale(1.15); } 92% { opacity: 1; transform: translateY(-2px) scale(1); } 100% { opacity: 0; transform: translateY(-2px) scale(0.85); } }
@keyframes quiz-timer-danger { 0%, 55% { box-shadow: inset 0 3px 0 rgba(255,255,255,.3); } 70% { box-shadow: inset 0 3px 0 rgba(255,255,255,.6), 0 0 16px rgba(255,167,38,.6); } 85% { box-shadow: inset 0 3px 0 rgba(255,255,255,.8), 0 0 24px rgba(255,87,34,.8); } 100% { box-shadow: inset 0 3px 0 rgba(255,255,255,.9), 0 0 32px rgba(244,67,54,.9); } }
@keyframes timer-marker-danger { 0%, 55% { transform: translate(-50%,-50%) scale(1); background: var(--accent); } 65% { transform: translate(-50%,-50%) scale(1.08); background: #FFA726; box-shadow: 0 8px 0 rgba(13,35,71,.24), 0 0 16px rgba(255,167,38,.7); } 78% { transform: translate(-50%,-50%) scale(1.14); background: #FF5722; box-shadow: 0 8px 0 rgba(13,35,71,.24), 0 0 24px rgba(255,87,34,.85); } 88% { transform: translate(-50%,-50%) scale(1.05); background: #F44336; } 94% { transform: translate(-50%,-50%) scale(1.22); background: #E53935; box-shadow: 0 8px 0 rgba(13,35,71,.24), 0 0 32px rgba(229,57,53,1); } 100% { transform: translate(-50%,-50%) scale(1.1); background: #D32F2F; } }
@keyframes timer-urgency-glow { 0%, 55% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 24px rgba(255,255,255,.22); } 70% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 32px rgba(255,167,38,.55); } 85% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 44px rgba(255,87,34,.78); } 100% { box-shadow: inset 0 4px 0 rgba(13,35,71,.12), 0 7px 0 var(--depth-edge), 0 0 56px rgba(244,67,54,.95); } }
@keyframes timer-exit-fade { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.96); } }
@keyframes timer-exit-fade-centered { from { opacity: 1; transform: translateX(-50%) scale(1); } to { opacity: 0; transform: translateX(-50%) scale(.96); } }
@keyframes reveal-enter-smooth { from { opacity: 0; transform: translateY(16px) scale(.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes timer-sparkle { 50% { transform: translateY(-4px) scale(1.16) rotate(12deg); opacity: .7; } }
@keyframes correct-card-reveal { 0% { transform: translateY(0) scale(1); } 55% { transform: translateY(-12px) scale(1.06); } 76% { transform: translateY(-2px) scale(1.015); } 100% { transform: translateY(-6px) scale(1.04); } }
@keyframes correct-surface-reveal { 0% { } 55% { border-color: #4ADE80; box-shadow: 0 18px 0 #15803D, 0 0 40px rgba(74,222,128,.8), inset 0 4px 0 rgba(255,255,255,.95); } 76% { } 100% { border-color: #22C55E; box-shadow: 0 16px 0 #15803D, 0 0 36px rgba(74,222,128,.75), inset 0 4px 0 rgba(255,255,255,.95); } }
@keyframes correct-badge-reveal { 0% { transform: scale(1); } 55% { transform: scale(1.14); } 100% { transform: scale(1.06); } }
@keyframes visual-correct-card-reveal { 0% { transform: translateY(0) scale(1); } 55% { transform: translateY(-12px) scale(1.06); } 100% { transform: translateY(-4px) scale(1.03); } }
@keyframes visual-correct-border { 0% { border-color: #fff; } 55% { border-color: #22C55E; box-shadow: 0 18px 0 #15803D, 0 0 40px rgba(74,222,128,.8), inset 0 4px 8px rgba(255,255,255,.95); } 100% { border-color: #22C55E; box-shadow: 0 16px 0 #15803D, 0 0 36px rgba(74,222,128,.75), inset 0 4px 8px rgba(255,255,255,.95); } }
@keyframes visual-correct-label-reveal { 0% { border-color: #fff; } 55% { border-color: #22C55E; box-shadow: 0 12px 0 #15803D, 0 0 28px rgba(74,222,128,.7); } 100% { border-color: #22C55E; box-shadow: 0 10px 0 #15803D, 0 0 24px rgba(74,222,128,.65); } }
@keyframes incorrect-card-settle { from { opacity: 1; transform: scale(1); filter: grayscale(0%) contrast(1) brightness(1); } to { opacity: .35; transform: scale(.94); filter: grayscale(78%) contrast(0.95) brightness(0.92); } }
@keyframes status-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
@keyframes cross-pop { 0% { transform: scale(0); } 65% { transform: scale(1.15); } 100% { transform: scale(1); } }
@keyframes hero-reveal-push { from { transform: scale(1); } to { transform: scale(1.035); } }
@keyframes hero-ken-burn { from { transform: scale(1); } to { transform: scale(1.06); } }
@keyframes reveal-pop { from { opacity: 0; transform: scale(.7) rotate(-5deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes reveal-answer-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes stamp-pop { 0% { opacity: 0; transform: scale(0) rotate(-18deg); } 68% { opacity: 1; transform: scale(1.18) rotate(6deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes star-burst { from { opacity: 0; transform: translateY(28px) scale(.2) rotate(-28deg); } to { opacity: 1; transform: translateY(0) scale(1) rotate(0); } }
@keyframes quizProgressStarTwinkle { 0%, 100% { opacity: 0.65; transform: translate(-50%, -50%) scale(0.95); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); } }
@keyframes quizProgressMarkerPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); } 25% { transform: translate(-50%, -50%) scale(1.12) rotate(4deg); } 55% { transform: translate(-50%, -50%) scale(0.96) rotate(-3deg); } 75% { transform: translate(-50%, -50%) scale(1.05) rotate(1deg); } }
@keyframes reveal-impact { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.45); } 25% { opacity: .95; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.12); } }
@keyframes progress-pop { 0% { transform: scale(1); } 58% { transform: scale(1.08); } 100% { transform: scale(1); } }
@keyframes phase-exit { to { opacity: 0; } }

@keyframes mascot-sprite-play { from { background-position: 0% 0%; } to { background-position: 100% 0%; } }
@keyframes mascot-single-breathe { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 6px)) scale(1.025, 0.98); } }
@keyframes mascot-single-sway { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(-2.5deg); } 100% { transform: translate(calc(var(--action-offset-x, 0px) + 4px), calc(var(--action-offset-y, 0px) - 8px)) rotate(3.5deg); } }
@keyframes mascot-single-jump { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1, 0.95); } 40% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 22px)) scale(1.04, 1.05) rotate(2deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 28px)) scale(1.06, 1.06) rotate(-2deg); } }
@keyframes mascot-single-shake { 0%, 100% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(0deg); } 25% { transform: translate(calc(var(--action-offset-x, 0px) - 5px), var(--action-offset-y, 0px)) rotate(-4deg); } 75% { transform: translate(calc(var(--action-offset-x, 0px) + 5px), var(--action-offset-y, 0px)) rotate(4deg); } }
@keyframes mascot-single-pulse { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) scale(1); } 100% { transform: translate(calc(var(--action-offset-x, 0px) + 6px), calc(var(--action-offset-y, 0px) - 4px)) scale(1.03); } }
@keyframes mascot-single-wave { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) rotate(-3deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 10px)) rotate(4deg) scale(1.03); } }
@keyframes mascot-single-float { 0% { transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)) translateY(0) rotate(0deg); } 50% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 14px)) rotate(1.5deg); } 100% { transform: translate(var(--action-offset-x, 0px), calc(var(--action-offset-y, 0px) - 6px)) rotate(-1.5deg); } }
`;
}
