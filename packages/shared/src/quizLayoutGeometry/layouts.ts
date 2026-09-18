import { createColumns, createStackedRows } from "./choiceGeometry.js";
import type { QuizLandscapeLayoutId, QuizLayoutGeometry } from "./types.js";

export const MEDIA_LEFT_CHOICES_RIGHT_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "media_left_choices_right",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 570 }),
  hero: Object.freeze({ x: 380, y: 253, width: 720, height: 570 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 720, height: 570 }),
    mediaBorderBox: Object.freeze({ width: 720, height: 570 }),
    borderEachSide: 12,
    viewport: Object.freeze({ width: 696, height: 546, fit: "cover" as const }),
  }),
  answerVariants: Object.freeze({
    2: createStackedRows({
      x: 1140,
      rowYPositions: [366, 558],
      assemblyWidth: 660,
      assemblyHeight: 152,
      badgeSize: 152,
      textOffsetLeft: 108,
      textOffsetTop: 14,
      textWidth: 552,
      textHeight: 124,
      gap: 40,
      overlap: 44,
    }),
    3: createStackedRows({
      x: 1140,
      rowYPositions: [304, 472, 640],
      assemblyWidth: 660,
      assemblyHeight: 132,
      badgeSize: 132,
      textOffsetLeft: 94,
      textOffsetTop: 12,
      textWidth: 566,
      textHeight: 108,
      gap: 36,
      overlap: 38,
    }),
  }),
});

export const VISUAL_CHOICES_THREE_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "visual_choices_three",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 586 }),
  hero: null,
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 452, height: 586 }),
    mediaBorderBox: Object.freeze({ width: 452, height: 461 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 432, height: 441, fit: "cover" as const }),
  }),
  cardSize: Object.freeze({ width: 452, height: 586 }),
  answerVariants: Object.freeze({
    3: createColumns({
      columnXs: [380, 864, 1348],
      y: 735,
      assemblyWidth: 452,
      assemblyHeight: 104,
      badgeSize: 104,
      textOffsetLeft: 74,
      textOffsetTop: 9,
      textWidth: 378,
      textHeight: 86,
      overlap: 30,
    }),
  }),
  extra: Object.freeze({
    mediaAnswerGap: 21,
  }),
});

export const VISUAL_CHOICES_THREE_PURE_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "visual_choices_three_pure",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 608 }),
  hero: null,
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 452, height: 608 }),
    mediaBorderBox: Object.freeze({ width: 452, height: 564 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 432, height: 544, fit: "cover" as const }),
  }),
  cardSize: Object.freeze({ width: 452, height: 608 }),
  answerVariants: Object.freeze({
    3: Object.freeze({
      outer: Object.freeze([
        Object.freeze({ x: 380, y: 253, width: 452, height: 564 }),
        Object.freeze({ x: 864, y: 253, width: 452, height: 564 }),
        Object.freeze({ x: 1348, y: 253, width: 452, height: 564 }),
      ]),
      badge: Object.freeze([
        Object.freeze({ x: 562, y: 773, width: 88, height: 88 }),
        Object.freeze({ x: 1046, y: 773, width: 88, height: 88 }),
        Object.freeze({ x: 1530, y: 773, width: 88, height: 88 }),
      ]),
      text: Object.freeze([]),
    }),
  }),
  extra: Object.freeze({
    badgeCenterY: 817,
    factGap: 25,
  }),
});

export const SPLIT_VERSUS_TWO_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "split_versus_two",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 578 }),
  hero: null,
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 698, height: 578 }),
    mediaBorderBox: Object.freeze({ width: 698, height: 446 }),
    borderEachSide: 12,
    viewport: Object.freeze({ width: 674, height: 422, fit: "cover" as const }),
  }),
  cardSize: Object.freeze({ width: 698, height: 578 }),
  answerVariants: Object.freeze({
    2: Object.freeze({
      outer: Object.freeze([
        Object.freeze({ x: 380, y: 709, width: 698, height: 122 }),
        Object.freeze({ x: 1102, y: 709, width: 698, height: 122 }),
      ]),
      badge: Object.freeze([]),
      text: Object.freeze([
        Object.freeze({ x: 380, y: 709, width: 698, height: 122 }),
        Object.freeze({ x: 1102, y: 709, width: 698, height: 122 }),
      ]),
    }),
  }),
  extra: Object.freeze({
    mediaAnswerGap: 10,
    mediaRadius: 32,
    textRadius: 32,
    columnGap: 24,
    versusEdgeOverlap: 50,
    factGap: 55,
    versusEmblem: Object.freeze({ x: 1028, y: 414, width: 124, height: 124 }),
    textOnlyFallback: Object.freeze([
      Object.freeze({ x: 380, y: 253, width: 698, height: 504 }),
      Object.freeze({ x: 1102, y: 253, width: 698, height: 504 }),
    ]),
  }),
});

export const VERDICT_TRUE_FALSE_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "verdict_true_false",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 565 }),
  hero: Object.freeze({ x: 380, y: 253, width: 820, height: 565 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 820, height: 565 }),
    mediaBorderBox: Object.freeze({ width: 820, height: 565 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 800, height: 545, fit: "cover" as const }),
  }),
  answerVariants: Object.freeze({
    2: Object.freeze({
      outer: Object.freeze([
        Object.freeze({ x: 1240, y: 349.5, width: 560, height: 164 }),
        Object.freeze({ x: 1240, y: 557.5, width: 560, height: 164 }),
      ]),
      badge: Object.freeze([]),
      text: Object.freeze([
        Object.freeze({ x: 1240, y: 349.5, width: 560, height: 164 }),
        Object.freeze({ x: 1240, y: 557.5, width: 560, height: 164 }),
      ]),
      gap: 44,
    }),
  }),
  extra: Object.freeze({
    heroAndAnswerCenterY: 535.5,
  }),
});

export const FULL_STACK_LIST_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "full_stack_list",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 528 }),
  hero: null,
  imageSlot: null,
  answerVariants: Object.freeze({
    2: createStackedRows({
      x: 450,
      rowYPositions: [329, 548],
      assemblyWidth: 1280,
      assemblyHeight: 164,
      badgeSize: 164,
      textOffsetLeft: 118,
      textOffsetTop: 14,
      textWidth: 1162,
      textHeight: 136,
      gap: 55,
      overlap: 46,
    }),
    3: createStackedRows({
      x: 450,
      rowYPositions: [275, 458, 641],
      assemblyWidth: 1280,
      assemblyHeight: 140,
      badgeSize: 140,
      textOffsetLeft: 100,
      textOffsetTop: 12,
      textWidth: 1180,
      textHeight: 116,
      gap: 43,
      overlap: 40,
    }),
  }),
});

export const MYSTERY_REVEAL_GEOMETRY: QuizLayoutGeometry = Object.freeze({
  layoutId: "mystery_reveal",
  arena: Object.freeze({ x: 380, y: 253, width: 1420, height: 757 }),
  hero: Object.freeze({ x: 630, y: 253, width: 920, height: 540 }),
  imageSlot: Object.freeze({
    cardBorderBox: Object.freeze({ width: 920, height: 540 }),
    mediaBorderBox: Object.freeze({ width: 920, height: 540 }),
    borderEachSide: 0,
    slot: Object.freeze({ width: 880, height: 500 }),
    viewport: Object.freeze({ width: 880, height: 495, fit: "contain" as const }),
  }),
  answerVariants: Object.freeze({
    1: Object.freeze({
      outer: Object.freeze([Object.freeze({ x: 630, y: 890, width: 920, height: 120 })]),
      badge: Object.freeze([]),
      text: Object.freeze([Object.freeze({ x: 630, y: 890, width: 920, height: 120 })]),
    }),
  }),
  extra: Object.freeze({
    stageBorder: 4,
    stagePadding: 16,
    slot: Object.freeze({ x: 650, y: 273, width: 880, height: 500 }),
    viewport: Object.freeze({ x: 650, y: 275.5, width: 880, height: 495 }),
    answerBottomClearance: 70,
    heroAnswerGap: 97,
    factVisible: false,
    timerToRevealGapSeconds: 0.5,
  }),
});

export const QUIZ_LAYOUT_GEOMETRY: Readonly<Record<QuizLandscapeLayoutId, QuizLayoutGeometry>> = Object.freeze({
  media_left_choices_right: MEDIA_LEFT_CHOICES_RIGHT_GEOMETRY,
  visual_choices_three: VISUAL_CHOICES_THREE_GEOMETRY,
  visual_choices_three_pure: VISUAL_CHOICES_THREE_PURE_GEOMETRY,
  split_versus_two: SPLIT_VERSUS_TWO_GEOMETRY,
  verdict_true_false: VERDICT_TRUE_FALSE_GEOMETRY,
  full_stack_list: FULL_STACK_LIST_GEOMETRY,
  mystery_reveal: MYSTERY_REVEAL_GEOMETRY,
});
