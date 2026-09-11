import { LANDSCAPE_FRAME } from "./landscapeFrameGeometry.js";

/**
 * Returns scoped CSS rules for the unified 16:9 landscape quiz frame.
 * Controls fixed positioning for counter, question card, brand rail, thinking bar, and fact card.
 */
export function quizFrameCss(): string {
  const { question, thinking, fact, arena, counter, brand, canvas } = LANDSCAPE_FRAME;

  return `
/* === Unified Landscape Quiz Frame Contract === */
.quiz-frame-unified.candy-scene {
  padding: 0;
}

.quiz-frame-unified .game-stage {
  position: absolute;
  inset: 0;
  width: ${canvas.width}px;
  height: ${canvas.height}px;
  max-width: none;
  min-height: 0;
  margin: 0;
  padding: 0;
  display: block;
}

.quiz-frame-unified .game-header {
  position: absolute;
  z-index: 6;
  top: ${counter.top}px;
  left: ${counter.centerX}px;
  transform: translateX(-50%);
  contain: layout style;
}

.quiz-frame-unified .channel-brand-mark {
  position: absolute;
  z-index: var(--candy-layer-brand, 9);
  left: ${brand.centerX}px;
  top: ${brand.top}px;
  width: ${brand.width}px;
  max-width: ${brand.width}px;
  transform: translateX(-50%);
  contain: layout style;
}

.quiz-frame-unified .quiz-question-anchor {
  position: absolute;
  z-index: 3;
  left: ${question.x}px;
  top: ${question.y}px;
  width: ${question.width}px;
  height: ${question.height}px;
  contain: layout style;
}

.quiz-frame-unified .quiz-question-anchor .question-title {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: ${question.height}px;
  margin: 0;
}

.quiz-frame-unified .quiz-content-anchor {
  position: absolute;
  z-index: 3;
  left: ${arena.x}px;
  top: ${arena.y}px;
  width: ${arena.width}px;
  height: ${arena.height}px;
  contain: layout style;
}

.quiz-frame-unified .phase-region {
  position: absolute;
  z-index: 5;
  inset: 0;
  width: ${canvas.width}px;
  height: ${canvas.height}px;
  margin: 0;
  transform: none;
  pointer-events: none;
}

.quiz-frame-unified .quiz-thinking-anchor {
  position: absolute;
  left: ${thinking.x}px;
  top: ${thinking.y}px;
  width: ${thinking.width}px;
  height: ${thinking.height}px;
  pointer-events: auto;
}

@keyframes quiz-unified-timer-exit {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.96);
  }
}

.quiz-frame-unified .quiz-thinking-anchor > .thinking-bar {
  position: relative;
  inset: auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  transform: none;
  animation: phase-hold var(--timer-duration) steps(1,end) var(--timer-start) both, quiz-unified-timer-exit .28s cubic-bezier(.22,.8,.3,1) calc(var(--timer-start) + var(--timer-duration) - .28s) both;
}

.quiz-frame-unified .quiz-fact-anchor {
  position: absolute;
  left: ${fact.x}px;
  top: ${fact.y}px;
  width: ${fact.width}px;
  height: ${fact.height}px;
  pointer-events: auto;
}

.quiz-frame-unified .quiz-fact-anchor > .fact-card {
  position: relative;
  inset: auto;
  width: 100%;
  height: 100%;
  max-width: none;
  margin: 0;
  transform: none;
  box-sizing: border-box;
  padding: 16px 32px;
  border: 6px solid rgba(255, 255, 255, 0.85);
  border-radius: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quiz-frame-unified .quiz-fact-anchor > .fact-card p {
  margin: 0;
  width: 100%;
  text-align: center;
  font-family: "Fredoka", "SVN-Hello Headline", "Baloo 2", "Nunito", sans-serif;
  font-size: 38px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

/* Ensure .has-mascot never shifts the invariant landscape frame anchors */
.quiz-frame-unified.has-mascot .game-header {
  left: ${counter.centerX}px;
  top: ${counter.top}px;
  transform: translateX(-50%);
}

.quiz-frame-unified.has-mascot .channel-brand-mark {
  left: ${brand.centerX}px;
  top: ${brand.top}px;
  width: ${brand.width}px;
  max-width: ${brand.width}px;
  transform: translateX(-50%);
}

.quiz-frame-unified.has-mascot .game-stage {
  position: absolute;
  inset: 0;
  width: ${canvas.width}px;
  height: ${canvas.height}px;
  margin: 0;
}

.quiz-frame-unified.has-mascot .question-title {
  width: 100%;
  max-width: 100%;
}

.quiz-frame-unified.has-mascot .phase-region {
  left: 0;
  width: ${canvas.width}px;
  transform: none;
}
`;
}
