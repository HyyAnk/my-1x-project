import { createColumns, createStackedRows } from "./choiceGeometry.js";
import { PORTRAIT_FRAME_GEOMETRY } from "./portraitFrame.js";
import type { QuizLayoutGeometry, QuizPortraitLayoutId } from "./types.js";

const ARENA = PORTRAIT_FRAME_GEOMETRY.arena;

/** Text-only list of 2 or 3 stacked choices. The primary layout for text topics. */
export const SHORT_STACK_LIST_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "short_stack_list",
  arena: Object.freeze({ x: ARENA.x, y: 560, width: ARENA.width, height: 600 }),
  hero: null,
  imageSlot: null,
  answerVariants: Object.freeze({
    2: createStackedRows({
      x: ARENA.x,
      rowYPositions: [640, 860],
      assemblyWidth: 936,
      assemblyHeight: 168,
      badgeSize: 168,
      textOffsetLeft: 124,
      textOffsetTop: 16,
      textWidth: 812,
      textHeight: 136,
      gap: 52,
      overlap: 44,
    }),
    3: createStackedRows({
      x: ARENA.x,
      rowYPositions: [600, 790, 980],
      assemblyWidth: 936,
      assemblyHeight: 150,
      badgeSize: 150,
      textOffsetLeft: 110,
      textOffsetTop: 14,
      textWidth: 826,
      textHeight: 122,
      gap: 40,
      overlap: 40,
    }),
  }),
});

/** One hero image (4:3) above 2 or 3 stacked text choices. */
export const SHORT_MEDIA_TOP_CHOICES_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "short_media_top_choices",
  arena: Object.freeze({ x: ARENA.x, y: ARENA.y, width: ARENA.width, height: 640 }),
  hero: Object.freeze({ x: 280, y: 530, width: 520, height: 390 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 520, height: 390 }),
    mediaBorderBox: Object.freeze({ width: 520, height: 390 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 500, height: 370, fit: "cover" as const }),
  }),
  answerVariants: Object.freeze({
    2: createStackedRows({
      x: ARENA.x,
      rowYPositions: [946, 1066],
      assemblyWidth: 936,
      assemblyHeight: 100,
      badgeSize: 100,
      textOffsetLeft: 78,
      textOffsetTop: 9,
      textWidth: 858,
      textHeight: 82,
      gap: 20,
      overlap: 28,
    }),
    3: createStackedRows({
      x: ARENA.x,
      rowYPositions: [940, 1018, 1096],
      assemblyWidth: 936,
      assemblyHeight: 72,
      badgeSize: 72,
      textOffsetLeft: 58,
      textOffsetTop: 6,
      textWidth: 878,
      textHeight: 60,
      gap: 16,
      overlap: 28,
    }),
  }),
});

/** Two portrait (3:4) choice images side by side with a label under each. */
export const SHORT_VERSUS_TWO_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "short_versus_two",
  arena: Object.freeze({ x: ARENA.x, y: 536, width: ARENA.width, height: 630 }),
  hero: null,
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 400, height: 534 }),
    mediaBorderBox: Object.freeze({ width: 400, height: 534 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 380, height: 514, fit: "cover" as const }),
  }),
  cardSize: Object.freeze({ width: 400, height: 534 }),
  answerVariants: Object.freeze({
    2: createColumns({
      columnXs: [92, 588],
      y: 1086,
      assemblyWidth: 400,
      assemblyHeight: 80,
      badgeSize: 0,
      textOffsetLeft: 0,
      textOffsetTop: 0,
      textWidth: 400,
      textHeight: 80,
    }),
  }),
  extra: Object.freeze({
    cardYs: Object.freeze([536, 536]),
    versusBadge: Object.freeze({ x: 480, y: 743, width: 120, height: 120 }),
  }),
});

/** One hero image (4:3) with large YES and NO buttons beneath. */
export const SHORT_VERDICT_YES_NO_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "short_verdict_yes_no",
  arena: Object.freeze({ x: ARENA.x, y: 540, width: ARENA.width, height: 630 }),
  hero: Object.freeze({ x: 220, y: 540, width: 640, height: 480 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 640, height: 480 }),
    mediaBorderBox: Object.freeze({ width: 640, height: 480 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 620, height: 460, fit: "cover" as const }),
  }),
  answerVariants: Object.freeze({
    2: Object.freeze({
      outer: Object.freeze([
        Object.freeze({ x: ARENA.x, y: 1040, width: 444, height: 130 }),
        Object.freeze({ x: 564, y: 1040, width: 444, height: 130 }),
      ]),
      badge: Object.freeze([]),
      text: Object.freeze([
        Object.freeze({ x: ARENA.x, y: 1040, width: 444, height: 130 }),
        Object.freeze({ x: 564, y: 1040, width: 444, height: 130 }),
      ]),
      gap: 48,
    }),
  }),
});

export const QUIZ_PORTRAIT_LAYOUT_GEOMETRY: Readonly<Record<QuizPortraitLayoutId, QuizLayoutGeometry>> = Object.freeze({
  short_stack_list: SHORT_STACK_LIST_GEOMETRY,
  short_media_top_choices: SHORT_MEDIA_TOP_CHOICES_GEOMETRY,
  short_versus_two: SHORT_VERSUS_TWO_GEOMETRY,
  short_verdict_yes_no: SHORT_VERDICT_YES_NO_GEOMETRY,
});
