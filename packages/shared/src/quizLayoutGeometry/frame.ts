import type { QuizFixedFrameGeometry, QuizRect } from "./types.js";

const QUESTION_FRAME: QuizRect = Object.freeze({
  x: 380,
  y: 53,
  width: 1420,
  height: 168,
});

function createCounterSlot(question: QuizRect): QuizFixedFrameGeometry["counter"] {
  return Object.freeze({
    x: 0,
    top: question.y,
    width: question.x,
    height: question.height,
    centerX: question.x / 2,
    bodyCenterY: question.y + question.height / 2,
  });
}

export const FIXED_FRAME_GEOMETRY: QuizFixedFrameGeometry = Object.freeze({
  canvas: Object.freeze({
    width: 1920,
    height: 1080,
  }),
  question: QUESTION_FRAME,
  counter: createCounterSlot(QUESTION_FRAME),
  brand: Object.freeze({
    centerX: 180,
    top: 390,
    width: 320,
  }),
  thinking: Object.freeze({
    x: 470,
    y: 936,
    width: 1240,
    height: 84,
  }),
  factBefore: Object.freeze({
    x: 470,
    y: 846,
    width: 1240,
    height: 156,
  }),
  factAfter: Object.freeze({
    x: 470,
    y: 886,
    width: 1240,
    height: 156,
  }),
  factBottomClearance: 38,
});
