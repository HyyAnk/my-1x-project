import type { QuizDimensions, QuizRect } from "./types.js";

/**
 * Portrait (9:16) frame geometry for Quiz Short videos on a 1080x1920 canvas.
 *
 * Reserved zones keep content clear of platform chrome on Shorts, Reels and TikTok:
 * the top strip (status bar and title), the bottom strip (caption, controls) and the
 * right column (action icons). Everything a viewer must read sits inside the safe area.
 */
export type QuizPortraitFrameGeometry = Readonly<{
  canvas: QuizDimensions;
  safeArea: QuizRect;
  reservedTop: number;
  reservedBottom: number;
  reservedRight: number;
  progressStrip: QuizRect;
  question: QuizRect;
  arena: QuizRect;
  countdown: QuizRect;
  reveal: QuizRect;
  mascot: QuizRect;
  cta: QuizRect;
}>;

const CANVAS: QuizDimensions = Object.freeze({ width: 1080, height: 1920 });

const RESERVED_TOP = 192;
const RESERVED_BOTTOM = 422;
const RESERVED_RIGHT = 151;
const GUTTER = 72;

export const PORTRAIT_FRAME_GEOMETRY: QuizPortraitFrameGeometry = Object.freeze({
  canvas: CANVAS,
  reservedTop: RESERVED_TOP,
  reservedBottom: RESERVED_BOTTOM,
  reservedRight: RESERVED_RIGHT,
  safeArea: Object.freeze({
    x: GUTTER,
    y: RESERVED_TOP,
    width: CANVAS.width - GUTTER * 2,
    height: CANVAS.height - RESERVED_TOP - RESERVED_BOTTOM,
  }),
  progressStrip: Object.freeze({ x: GUTTER, y: 212, width: 936, height: 24 }),
  question: Object.freeze({ x: GUTTER, y: 260, width: 936, height: 240 }),
  arena: Object.freeze({ x: GUTTER, y: 530, width: 936, height: 968 }),
  countdown: Object.freeze({ x: 858, y: 430, width: 150, height: 150 }),
  // The reveal card stops short of the mascot column so the two never overlap.
  reveal: Object.freeze({ x: GUTTER, y: 1352, width: 468, height: 146 }),
  // The mascot may dip below the safe area: platform captions sit bottom-left, not bottom-right.
  mascot: Object.freeze({ x: 568, y: 1180, width: 440, height: 440 }),
  cta: Object.freeze({ x: GUTTER, y: 540, width: 936, height: 580 }),
});

export const PORTRAIT_MIN_QUESTION_FONT_PX = 56;
export const PORTRAIT_MIN_CHOICE_FONT_PX = 44;
