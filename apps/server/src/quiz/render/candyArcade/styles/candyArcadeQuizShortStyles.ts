import { PORTRAIT_FRAME } from "../../frame/portraitFrameGeometry.js";
import { SHORT_RING_CIRCUMFERENCE, SHORT_RING_TIMER_CLASS } from "../shortRingTimer.js";

const STAGE = '#stage[data-aspect-ratio="9:16"]';
const HEADLINE_FONT = '"Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif';

function ringTimerCss(): string {
  const scope = `${STAGE} .quiz-frame-portrait .${SHORT_RING_TIMER_CLASS}`;
  const digits = [3, 2, 1]
    .map(
      (digit) =>
        `${scope} .ring-digit-${digit} { display: var(--cd${digit}-display, grid); animation: short-digit-tick 1s cubic-bezier(.22,.8,.3,1) calc(var(--timer-start, 0s) + var(--cd${digit}-at, 0s)) both; }`,
    )
    .join("\n");
  return `
${scope} { position: absolute; inset: 0; display: grid; place-items: center; animation: phase-hold var(--timer-duration, 3s) steps(1,end) var(--timer-start, 0s) both; filter: drop-shadow(0 12px 0 rgba(13,35,71,.22)); }
${scope} .ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
${scope} .ring-track { fill: rgba(255,255,255,.92); stroke: rgba(13,35,71,.14); stroke-width: 18; }
${scope} .ring-progress { fill: none; stroke: var(--accent, #FF6277); stroke-width: 18; stroke-linecap: round; stroke-dasharray: ${SHORT_RING_CIRCUMFERENCE}; stroke-dashoffset: 0; animation: short-ring-drain var(--timer-duration, 3s) linear var(--timer-start, 0s) both; }
${scope} .ring-digits { position: absolute; inset: 0; display: grid; place-items: center; }
${scope} .ring-digit { position: absolute; opacity: 0; font-family: ${HEADLINE_FONT}; font-size: 80px; font-weight: 900; line-height: 1; color: #342245; text-shadow: 0 3px 0 rgba(255,255,255,.9); }
${digits}
@keyframes short-ring-drain { from { stroke-dashoffset: 0; } to { stroke-dashoffset: ${SHORT_RING_CIRCUMFERENCE}; } }
@keyframes short-digit-tick { 0% { opacity: 0; transform: scale(.55); } 14% { opacity: 1; transform: scale(1.1); } 30% { transform: scale(1); } 86% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.9); } }
`;
}

function bookendCardCss(): string {
  const { cta, reservedBottom, reservedRight } = PORTRAIT_FRAME;
  const card = `left: ${cta.x}px; top: ${cta.y}px; width: ${cta.width}px; height: ${cta.height}px;`;
  return `
${STAGE} .candy-kickoff-scene, ${STAGE} .candy-score-cta-scene { padding: 0; background: linear-gradient(180deg, var(--bg-primary, #F6B83D) 0%, var(--bg-secondary, #FF8A5B) 100%); color: #172A59; }
${STAGE} .kickoff-rays, ${STAGE} .score-cta-rays { position: absolute; z-index: 0; inset: -30%; opacity: .14; background: repeating-conic-gradient(from 8deg, rgba(255,255,255,.9) 0 9deg, transparent 9deg 19deg); animation: ray-spin 150s linear 0s infinite both; }
${STAGE} .kickoff-card, ${STAGE} .score-cta-card { position: absolute; z-index: 3; ${card} display: grid; align-content: center; justify-items: center; gap: 28px; box-sizing: border-box; padding: 48px 56px; text-align: center; border: 8px solid #FFFFFF; border-radius: 56px; background: linear-gradient(180deg, #FFFFFF 0%, #FFF8EA 100%); box-shadow: 0 18px 0 rgba(13,35,71,.22), 0 30px 48px rgba(10,25,60,.18); animation: short-pop-in .5s cubic-bezier(.18,1.42,.34,1) var(--clip-start, 0s) both; }
${STAGE} .kickoff-badge { display: inline-flex; padding: 14px 30px; border-radius: 999px; background: #FF6277; color: #FFFFFF; font-family: ${HEADLINE_FONT}; font-size: 36px; font-weight: 900; letter-spacing: 2px; box-shadow: 0 8px 0 rgba(13,35,71,.18); }
${STAGE} .kickoff-count, ${STAGE} .score-cta-headline { margin: 0; font-family: ${HEADLINE_FONT}; font-size: 96px; font-weight: 900; line-height: 1.04; letter-spacing: -2px; color: #342245; text-wrap: balance; }
${STAGE} .kickoff-ready, ${STAGE} .score-cta-prompt { margin: 0; font-family: ${HEADLINE_FONT}; font-size: 56px; font-weight: 900; line-height: 1.12; color: #047857; }
${STAGE} .score-cta-sparkles { color: #FFC436; font-size: 44px; }
${STAGE} .candy-score-cta-scene .candy-mascot-container.mascot-v2-container { bottom: ${reservedBottom}px; }
${STAGE} .candy-score-cta-scene .candy-mascot-container.mascot-v2-container.anchor-bottom_right { right: ${reservedRight}px; }
${STAGE} .candy-score-cta-scene .candy-mascot-container.mascot-v2-container.anchor-bottom_left { left: ${cta.x}px; }
@keyframes short-pop-in { from { opacity: 0; transform: translateY(40px) scale(.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;
}

/**
 * Quiz Short stage styles: the kickoff and score CTA cards, the centered ring timer and the
 * entrance keyframes the portrait layouts share. Injected only on the 9:16 canvas.
 */
export function candyArcadeQuizShortStylesCss(): string {
  return `
/* === Quiz Short (9:16) bookends, ring timer and shared motion === */
${ringTimerCss()}
${bookendCardCss()}
`;
}
