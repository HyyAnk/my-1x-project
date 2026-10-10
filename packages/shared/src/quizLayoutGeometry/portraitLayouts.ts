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
  arena: Object.freeze({ x: ARENA.x, y: ARENA.y, width: ARENA.width, height: 930 }),
  hero: Object.freeze({ x: 180, y: 530, width: 720, height: 540 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 720, height: 540 }),
    mediaBorderBox: Object.freeze({ width: 720, height: 540 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 700, height: 520, fit: "cover" as const }),
  }),
  answerVariants: Object.freeze({
    2: createStackedRows({
      x: ARENA.x,
      rowYPositions: [1120, 1290],
      assemblyWidth: 936,
      assemblyHeight: 130,
      badgeSize: 130,
      textOffsetLeft: 96,
      textOffsetTop: 12,
      textWidth: 840,
      textHeight: 106,
      gap: 40,
      overlap: 34,
    }),
    3: createStackedRows({
      x: ARENA.x,
      rowYPositions: [1100, 1220, 1340],
      assemblyWidth: 936,
      assemblyHeight: 104,
      badgeSize: 104,
      textOffsetLeft: 80,
      textOffsetTop: 10,
      textWidth: 856,
      textHeight: 84,
      gap: 16,
      overlap: 28,
    }),
  }),
});

/** Two portrait (3:4) choice images side by side with a label under each. */
export const SHORT_VERSUS_TWO_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "short_versus_two",
  arena: Object.freeze({ x: ARENA.x, y: 560, width: ARENA.width, height: 700 }),
  hero: null,
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 444, height: 592 }),
    mediaBorderBox: Object.freeze({ width: 444, height: 592 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 424, height: 572, fit: "cover" as const }),
  }),
  cardSize: Object.freeze({ width: 444, height: 592 }),
  answerVariants: Object.freeze({
    2: createColumns({
      columnXs: [ARENA.x, 564],
      y: 1168,
      assemblyWidth: 444,
      assemblyHeight: 88,
      badgeSize: 0,
      textOffsetLeft: 0,
      textOffsetTop: 0,
      textWidth: 444,
      textHeight: 88,
    }),
  }),
  extra: Object.freeze({
    cardYs: Object.freeze([560, 560]),
    versusBadge: Object.freeze({ x: 480, y: 796, width: 120, height: 120 }),
  }),
});

/** One hero image (4:3) with large YES and NO buttons beneath. */
export const SHORT_VERDICT_YES_NO_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "short_verdict_yes_no",
  arena: Object.freeze({ x: ARENA.x, y: 540, width: ARENA.width, height: 880 }),
  hero: Object.freeze({ x: ARENA.x, y: 540, width: 936, height: 702 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 936, height: 702 }),
    mediaBorderBox: Object.freeze({ width: 936, height: 702 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 916, height: 682, fit: "cover" as const }),
  }),
  answerVariants: Object.freeze({
    2: Object.freeze({
      outer: Object.freeze([
        Object.freeze({ x: ARENA.x, y: 1290, width: 444, height: 130 }),
        Object.freeze({ x: 564, y: 1290, width: 444, height: 130 }),
      ]),
      badge: Object.freeze([]),
      text: Object.freeze([
        Object.freeze({ x: ARENA.x, y: 1290, width: 444, height: 130 }),
        Object.freeze({ x: 564, y: 1290, width: 444, height: 130 }),
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
