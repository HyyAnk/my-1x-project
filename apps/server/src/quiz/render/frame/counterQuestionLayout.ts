import type { FrameRect } from "./quizFrame.types.js";

type CounterQuestionLayoutGeometry = Pick<FrameRect, "x" | "y" | "height">;

/**
 * Couples the counter slot to the question card geometry while leaving each
 * counter skin responsible only for its mount and body dimensions.
 */
export function counterQuestionLayoutCss(scope: string, question: CounterQuestionLayoutGeometry): string {
  return `
${scope} .game-header {
  position: absolute;
  z-index: 6;
  top: ${question.y}px;
  left: 0;
  width: ${question.x}px;
  height: ${question.height}px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transform: none;
  contain: layout style;
}

${scope} .game-header > :first-child {
  flex: 0 0 auto;
  margin-top: calc((${question.height}px - var(--counter-badge-body-height, 150px)) / 2 - var(--counter-badge-mount-height, 64px));
}
`;
}
