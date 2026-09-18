import { TRANSITION_STYLES_CSS } from "@studio/shared";
import { candyArcadeKeyframesCss } from "./candyArcadeKeyframes.js";

/**
 * Thinking bar, countdown timer, reward effects, transitions, and mascot sprite animation styles.
 */
export function candyArcadeAnimationCss(): string {
  return `
.thinking-bar { position: relative; z-index: 5; isolation: isolate; display: flex; align-items: center; justify-content: center; width: min(82vw, 1360px); min-height: 84px; margin: 0 auto; padding: 6px 0; border: 0; border-radius: 9999px; background: transparent; box-shadow: none; opacity: 0; animation: phase-hold var(--timer-duration) steps(1,end) var(--timer-start) both, timer-exit-fade .28s cubic-bezier(.22,.8,.3,1) calc(var(--timer-start) + var(--timer-duration) - .28s) both; contain: layout style; will-change: transform, opacity; }
.thinking-track { position: relative; z-index: 0; width: 100%; height: 58px; overflow: visible; border: 6px solid rgba(255,255,255,.98); border-radius: 9999px; background: rgba(18,38,80,.62); box-shadow: inset 0 3px 6px rgba(255,255,255,.35), inset 0 -4px 8px rgba(0,0,0,.22), 0 8px 22px rgba(13,35,71,.35), 0 0 20px rgba(255,255,255,.25); }
.timer-milestones { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.milestone-star { position: absolute; top: 50%; font-size: 24px; line-height: 1; color: #FFE66D; text-shadow: 0 0 10px rgba(255,230,109,.95), 0 2px 4px rgba(0,0,0,.4); transform: translate(-50%,-50%); animation: quizProgressStarTwinkle 2.4s ease-in-out infinite; }
.milestone-star.star-1 { left: 20%; animation-delay: 0s; }
.milestone-star.star-2 { left: 40%; animation-delay: .6s; }
.milestone-star.star-3 { left: 60%; animation-delay: 1.2s; }
.milestone-star.star-4 { left: 80%; animation-delay: 1.8s; }
.timer-progress { position: absolute; top: 0; left: 0; bottom: 0; width: 100%; border-radius: 9999px; overflow: hidden; background: linear-gradient(90deg, #ff4f5e 0%, #ff7a45 20%, #ffc83d 42%, #6fa9ff 70%, #28d5d0 100%); background-size: 1360px 100%; background-position: left center; z-index: 1; animation: quiz-timer-drain var(--timer-duration) linear var(--timer-start) both, quiz-timer-danger var(--timer-duration) linear var(--timer-start) both; will-change: transform; }
.timer-progress::after { position: absolute; top: 0; left: 0; right: 0; height: 50%; border-radius: 9999px 9999px 0 0; background: linear-gradient(to bottom, rgba(255,255,255,.38) 0%, rgba(255,255,255,.1) 40%, rgba(255,255,255,0) 70%); content: ""; pointer-events: none; z-index: 2; }
.timer-marker { position: absolute; top: 50%; left: 100%; display: grid; place-items: center; width: 176px; height: 176px; border: none; background: transparent; transform: translate(-50%,-50%); animation: quiz-timer-marker-slide var(--timer-duration) linear var(--timer-start) both, quizProgressMarkerPulse 2.4s ease-in-out infinite; z-index: 6; will-change: transform; }
.marker-star-svg { position: absolute; inset: -8px; width: 192px; height: 192px; overflow: visible; pointer-events: none; z-index: 4; }
.marker-val { position: absolute; inset: 0; display: grid; place-items: center; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 64px; font-weight: 900; line-height: 1; color: #FFFFFF; text-shadow: 0 3px 6px rgba(120,20,45,.75), 0 0 12px rgba(255,255,255,.6); opacity: 0; pointer-events: none; z-index: 7; transform: translateY(-2px); }
.val-query { animation: query-hold var(--query-hold-duration) linear var(--timer-start) both; display: var(--query-display, grid); }
.val-5 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd5-at)) both; display: var(--cd5-display, grid); }
.val-4 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd4-at)) both; display: var(--cd4-display, grid); }
.val-3 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd3-at)) both; display: var(--cd3-display, grid); }
.val-2 { animation: number-countdown-tick 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd2-at)) both; display: var(--cd2-display, grid); }
.val-1 { animation: number-countdown-final 1s cubic-bezier(.18,1.42,.34,1) calc(var(--timer-start) + var(--cd1-at)) both; display: var(--cd1-display, grid); }
.timer-sparkles { position: absolute; inset: -20px -14px; pointer-events: none; z-index: 8; }
.timer-sparkles i { position: absolute; color: #FFE66D; font-size: 26px; font-style: normal; text-shadow: 0 0 10px rgba(255,230,109,.95); animation: timer-sparkle var(--timer-duration) ease-in-out calc(var(--timer-start) + var(--ambient-phase)) 1 both; will-change: transform, opacity; }
.timer-sparkles i:nth-child(1) { right: 6%; top: -18px; }
.timer-sparkles i:nth-child(2) { right: 1%; bottom: -16px; color: #5CE1E6; font-size: 22px; animation-delay: calc(var(--timer-start) + .55s); }
.timer-sparkles i:nth-child(3) { left: 4%; top: -16px; color: #fff; animation-delay: calc(var(--timer-start) + 1.05s); }
.fact-card { position: relative; z-index: 5; max-width: 1220px; margin-top: 14px; padding: 24px 48px; border: 6px solid rgba(255,255,255,.85); border-radius: 38px; background: var(--surface); box-shadow: 0 16px 0 rgba(13,35,71,.18), 0 22px 36px rgba(10,25,60,.14); text-align: center; opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both; contain: layout style; will-change: transform, opacity; }
.fact-card span { color: var(--surface-accent); font-size: 24px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
.fact-card p { margin: 0; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 38px; font-weight: 900; line-height: 1.2; letter-spacing: -0.3px; }

.quiz-question-clip .hero-image { animation: hero-enter .62s cubic-bezier(.22,.8,.3,1) var(--clip-start) both; }
.reward-fx { position: absolute; z-index: 7; inset: 0; color: #fff; pointer-events: none; text-shadow: 0 7px 0 rgba(13,35,71,.18); opacity: 0; animation: phase-enter .01s steps(1,end) calc(var(--clip-start) + var(--reward-at)) both; }
.reward-fx i { position: absolute; font-size: 51px; font-style: normal; animation: star-burst .72s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + var(--reward-at)) both; }
.reward-fx i:nth-child(1) { left: 5%; top: 34%; }.reward-fx i:nth-child(2) { right: 6%; top: 38%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .06s); }.reward-fx i:nth-child(3) { left: 9%; bottom: 18%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .12s); }.reward-fx i:nth-child(4) { right: 10%; bottom: 16%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .18s); }.reward-fx i:nth-child(5) { left: 3%; top: 58%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .24s); }.reward-fx i:nth-child(6) { right: 3%; top: 61%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .3s); }.reward-fx i:nth-child(7) { left: 7%; bottom: 8%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .36s); }
.reward-fx i:nth-child(8) { right: 18%; top: 20%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .42s); }.reward-fx i:nth-child(9) { left: 20%; bottom: 23%; animation-delay: calc(var(--clip-start, 0s) + var(--reward-at, 0s) + .48s); }
.reward-small i { font-size: 57px; }
.reward-big i { font-size: 71px; }
.episode-progress.streak { animation: progress-pop .52s cubic-bezier(.18,1.42,.34,1) calc(var(--clip-start) + .12s) both; }
.episode-progress.streak i { margin-left: 2px; color: var(--surface-accent); font-size: 24px; font-style: normal; }
.quiz-question-clip::after { position: absolute; z-index: 2; top: 58%; left: 50%; width: 980px; height: 440px; border: 26px solid rgba(255,255,255,.54); border-radius: 50%; content: ""; pointer-events: none; transform: translate(-50%,-50%) scale(.45); animation: reveal-impact .7s ease-out calc(var(--clip-start) + var(--reveal-at) + .04s) both; }
.is-final-scene .question-card-inner { border-color: #FF708A; box-shadow: inset 0 4px 0 rgba(255,255,255,0.95), inset 0 8px 0 rgba(255,182,193,0.35), inset 0 -5px 0 rgba(230,60,90,0.25), 0 16px 0 rgba(230,60,90,0.32), 0 26px 42px rgba(10,25,60,0.2); }
.quiz-question-clip .question-title { animation: question-card-enter 0.52s cubic-bezier(0.18, 1.42, 0.34, 1) var(--clip-start) both, question-card-float 4.2s ease-in-out calc(var(--clip-start) + 0.52s) infinite alternate both; }
${TRANSITION_STYLES_CSS}

${candyArcadeKeyframesCss()}

@media (prefers-reduced-motion: reduce) { .milestone-star { animation: none; } }

.candy-mascot-sprite { width: 220px; height: 220px; background-image: var(--sprite-url); background-repeat: no-repeat; background-position: center bottom; background-size: contain; transform: translate(var(--action-offset-x, 0px), var(--action-offset-y, 0px)); filter: drop-shadow(0 14px 18px rgba(13,35,71,.35)); }
.mascot-state-layer { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.15s ease-out; }
.mascot-state-layer:not([style*="--mascot-frames:1;"]):not([style*="--mascot-frames: 1;"]) .candy-mascot-sprite { background-size: calc(var(--mascot-frames, 1) * 100%) 100%; background-position: 0% 50%; animation: mascot-sprite-play calc(var(--mascot-frames, 1) / var(--mascot-fps, 8) * 1s) steps(calc(var(--mascot-frames, 1) - 1)) infinite; }
.state-idle[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-idle[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-breathe 3.2s ease-in-out infinite alternate; }
.state-thinking[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-thinking[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-sway 2.4s ease-in-out infinite alternate; }
.state-celebrate[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-celebrate[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-jump 0.85s cubic-bezier(.18,1.42,.34,1) infinite alternate; }
.state-oops[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-oops[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-shake 2.0s ease-in-out infinite; }
.state-point[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-point[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-pulse 1.8s ease-in-out infinite alternate; }
.state-wave[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-wave[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-wave 2.0s ease-in-out infinite alternate; }
.state-float[style*="--mascot-frames:1;"] .candy-mascot-sprite, .state-float[style*="--mascot-frames: 1;"] .candy-mascot-sprite { animation: mascot-single-float 2.8s ease-in-out infinite alternate; }
.mascot-intro .candy-mascot-sprite, .mascot-outro .candy-mascot-sprite { animation: mascot-sprite-play calc(var(--mascot-frames, 1) / var(--mascot-fps, 8) * 1s) steps(calc(var(--mascot-frames, 1) - 1)) infinite; }
.quiz-question-clip .mascot-state-layer.state-thinking { opacity: 1; animation: phase-exit .001s linear var(--reveal-at) forwards; }
.quiz-question-clip .mascot-state-layer.state-celebrate { opacity: 0; animation: phase-enter .001s linear var(--reveal-at) forwards; }
`;
}

/**
 * Universal reduced-motion override styles.
 */
export function candyArcadeReducedMotionCss(): string {
  return `
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
  .candy-mascot-container.mascot-v2-container .mascot-v2-state {
    animation-duration: var(--mascot-state-span, .04s) !important;
  }
}
`;
}
