import type { FrameRect, LandscapeFrameGeometry } from "./quizFrame.types.js";

export const REFERENCE_THINKING_RECT: FrameRect = Object.freeze({
  x: 470,
  y: 822,
  width: 1240,
  height: 84,
});

export const REFERENCE_COUNTER_RECT: FrameRect = Object.freeze({
  x: 55,
  y: 0,
  width: 250,
  height: 194,
});

export const REFERENCE_BRAND_RECT: FrameRect = Object.freeze({
  x: 20,
  y: 390,
  width: 320,
  height: 246.594,
});

export const LANDSCAPE_FRAME: LandscapeFrameGeometry = Object.freeze({
  canvas: Object.freeze({
    width: 1920,
    height: 1080,
  }),
  question: Object.freeze({
    x: 380,
    y: 53,
    width: 1420,
    height: 168,
  }),
  thinking: Object.freeze({
    x: 470,
    y: 882,
    width: 1240,
    height: 84,
  }),
  fact: Object.freeze({
    x: 470,
    y: 846,
    width: 1240,
    height: 156,
  }),
  arena: Object.freeze({
    x: 380,
    y: 253,
    width: 1420,
    height: 520,
  }),
  timerProtection: Object.freeze({
    x: 350,
    y: 804,
    width: 1480,
    height: 240,
  }),
  counter: Object.freeze({
    centerX: 180,
    top: 0,
  }),
  brand: Object.freeze({
    centerX: 180,
    top: 390,
    width: 320,
  }),
});
