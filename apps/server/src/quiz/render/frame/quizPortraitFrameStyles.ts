import { PORTRAIT_FRAME, PORTRAIT_LAYOUT_ARENA_GEOMETRY } from "./portraitFrameGeometry.js";
import { portraitMascotAnchorCss } from "./portraitMascotAnchor.js";
import { progressStripCss } from "./progressStrip.js";
import { PORTRAIT_MIN_QUESTION_FONT_PX } from "@studio/shared";

/** Scope that wins over the generic 9:16 stage rules in candyArcadePortraitStyles. */
export const PORTRAIT_FRAME_SCOPE = '#stage[data-aspect-ratio="9:16"] .quiz-frame-portrait';

function portraitQuestionCss(scope: string): string {
  const { question } = PORTRAIT_FRAME;
  return `
${scope} .quiz-question-anchor { position: absolute; z-index: 3; left: ${question.x}px; top: ${question.y}px; width: ${question.width}px; height: ${question.height}px; contain: layout style; }
${scope} .quiz-question-anchor .question-title { position: relative; width: 100%; max-width: 100%; height: 100%; min-height: ${question.height}px; margin: 0; }
${scope} .quiz-question-anchor .question-card-inner { min-height: ${question.height}px; padding: 18px 40px; }
${scope} .question-title h1 { font-size: max(var(--question-size, 56px), ${PORTRAIT_MIN_QUESTION_FONT_PX}px); -webkit-line-clamp: 3; }
`;
}

function portraitArenaCss(scope: string): string {
  const { arena } = PORTRAIT_FRAME;
  const perLayout = Object.entries(PORTRAIT_LAYOUT_ARENA_GEOMETRY)
    .map(([layoutId, rect]) => `${scope}.layout-${layoutId} .quiz-content-anchor { top: ${rect.y}px; height: ${rect.height}px; }`)
    .join("\n");
  return `
${scope} .quiz-content-anchor { position: absolute; z-index: 3; left: ${arena.x}px; top: ${arena.y}px; width: ${arena.width}px; height: ${arena.height}px; contain: layout style; }
${perLayout}
`;
}

function portraitPhaseCss(scope: string): string {
  const { countdown, reveal, canvas } = PORTRAIT_FRAME;
  return `
${scope} .phase-region { position: absolute; z-index: 5; inset: 0; width: ${canvas.width}px; height: ${canvas.height}px; margin: 0; transform: none; pointer-events: none; }
${scope} .quiz-thinking-anchor { position: absolute; left: ${countdown.x}px; top: ${countdown.y}px; width: ${countdown.width}px; height: ${countdown.height}px; pointer-events: auto; }
${scope} .quiz-fact-anchor { position: absolute; left: ${reveal.x}px; top: ${reveal.y}px; width: ${reveal.width}px; height: ${reveal.height}px; pointer-events: auto; }
${scope} .quiz-fact-anchor > .fact-card { position: relative; inset: auto; width: 100%; height: 100%; max-width: none; margin: 0; transform: none; box-sizing: border-box; padding: 10px 28px; border: 6px solid rgba(255,255,255,.85); border-radius: 30px; display: flex; align-items: center; justify-content: center; }
${scope} .quiz-fact-anchor > .fact-card p { margin: 0; width: 100%; text-align: center; font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif; font-size: 30px; font-weight: 900; line-height: 1.18; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
`;
}

function portraitMascotCss(scope: string): string {
  return portraitMascotAnchorCss(`${scope}.candy-scene.clip`);
}

/**
 * Scoped CSS for the unified 9:16 portrait quiz frame: safe zones and fixed slots for the
 * progress strip, question card, content arena, ring timer, reveal card and mascot.
 */
export function quizPortraitFrameCss(): string {
  const scope = PORTRAIT_FRAME_SCOPE;
  const { canvas, safeArea, reservedTop, reservedBottom, reservedRight } = PORTRAIT_FRAME;
  return `
/* === Unified Portrait Quiz Frame Contract (Quiz Short, 1080x1920) === */
${scope}.candy-scene { padding: 0; --safe-zone-top: ${reservedTop}px; --safe-zone-bottom: ${reservedBottom}px; --safe-zone-left: ${safeArea.x}px; --safe-zone-right: ${reservedRight}px; }
${scope} .game-stage, ${scope}.has-mascot .game-stage { position: absolute; inset: 0; width: ${canvas.width}px; height: ${canvas.height}px; max-width: none; min-height: 0; margin: 0; padding: 0; display: block; }
${scope} .game-header, ${scope}.has-mascot .game-header { position: static; width: auto; height: auto; margin: 0; transform: none; display: contents; }
${scope} .channel-brand-mark { display: none; }
${progressStripCss(scope, PORTRAIT_FRAME.progressStrip)}
${portraitQuestionCss(scope)}
${portraitArenaCss(scope)}
${portraitPhaseCss(scope)}
${portraitMascotCss(scope)}
${scope} .reward-fx { bottom: ${reservedBottom}px; }
`;
}
