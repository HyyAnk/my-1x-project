import type { FrameRect } from "../frame/quizFrame.types.js";
import type { ResolvedQuizLayoutId } from "@studio/shared";

export type LayoutContentGeometry = Readonly<{
  hero: FrameRect | null;
  answers: Readonly<Partial<Record<0 | 1 | 2 | 3, readonly FrameRect[]>>>;
}>;

export const LAYOUT_CONTENT_GEOMETRY: Readonly<Record<ResolvedQuizLayoutId, LayoutContentGeometry>> = Object.freeze({
  media_left_choices_right: Object.freeze({
    hero: Object.freeze({ x: 380, y: 253, width: 720, height: 510 }),
    answers: Object.freeze({
      2: Object.freeze([
        Object.freeze({ x: 1140, y: 336, width: 660, height: 152 }),
        Object.freeze({ x: 1140, y: 528, width: 660, height: 152 }),
      ]),
      3: Object.freeze([
        Object.freeze({ x: 1140, y: 274, width: 660, height: 132 }),
        Object.freeze({ x: 1140, y: 442, width: 660, height: 132 }),
        Object.freeze({ x: 1140, y: 610, width: 660, height: 132 }),
      ]),
    }),
  }),

  visual_choices_three: Object.freeze({
    hero: null,
    answers: Object.freeze({
      3: Object.freeze([
        Object.freeze({ x: 380, y: 253, width: 452, height: 504 }),
        Object.freeze({ x: 864, y: 253, width: 452, height: 504 }),
        Object.freeze({ x: 1348, y: 253, width: 452, height: 504 }),
      ]),
    }),
  }),

  visual_choices_three_pure: Object.freeze({
    hero: null,
    answers: Object.freeze({
      3: Object.freeze([
        Object.freeze({ x: 380, y: 253, width: 452, height: 504 }),
        Object.freeze({ x: 864, y: 253, width: 452, height: 504 }),
        Object.freeze({ x: 1348, y: 253, width: 452, height: 504 }),
      ]),
    }),
  }),

  split_versus_two: Object.freeze({
    hero: null,
    answers: Object.freeze({
      2: Object.freeze([
        Object.freeze({ x: 380, y: 253, width: 646, height: 504 }),
        Object.freeze({ x: 1154, y: 253, width: 646, height: 504 }),
      ]),
    }),
  }),

  verdict_true_false: Object.freeze({
    hero: Object.freeze({ x: 380, y: 253, width: 820, height: 510 }),
    answers: Object.freeze({
      2: Object.freeze([
        Object.freeze({ x: 1240, y: 322, width: 560, height: 164 }),
        Object.freeze({ x: 1240, y: 530, width: 560, height: 164 }),
      ]),
    }),
  }),

  full_stack_list: Object.freeze({
    hero: null,
    answers: Object.freeze({
      2: Object.freeze([
        Object.freeze({ x: 450, y: 329, width: 1280, height: 164 }),
        Object.freeze({ x: 450, y: 533, width: 1280, height: 164 }),
      ]),
      3: Object.freeze([
        Object.freeze({ x: 450, y: 275, width: 1280, height: 140 }),
        Object.freeze({ x: 450, y: 443, width: 1280, height: 140 }),
        Object.freeze({ x: 450, y: 611, width: 1280, height: 140 }),
      ]),
    }),
  }),

  mystery_reveal: Object.freeze({
    hero: Object.freeze({ x: 630, y: 253, width: 920, height: 360 }),
    answers: Object.freeze({
      0: Object.freeze([]),
      1: Object.freeze([Object.freeze({ x: 630, y: 637, width: 920, height: 120 })]),
      2: Object.freeze([
        Object.freeze({ x: 470, y: 637, width: 600, height: 120 }),
        Object.freeze({ x: 1110, y: 637, width: 600, height: 120 }),
      ]),
      3: Object.freeze([
        Object.freeze({ x: 380, y: 637, width: 452, height: 120 }),
        Object.freeze({ x: 864, y: 637, width: 452, height: 120 }),
        Object.freeze({ x: 1348, y: 637, width: 452, height: 120 }),
      ]),
    }),
  }),

  clue_deduction: Object.freeze({
    hero: Object.freeze({ x: 400, y: 329, width: 824, height: 410 }),
    answers: Object.freeze({
      0: Object.freeze([]),
      1: Object.freeze([Object.freeze({ x: 1256, y: 462, width: 524, height: 144 })]),
      2: Object.freeze([
        Object.freeze({ x: 1256, y: 376, width: 524, height: 144 }),
        Object.freeze({ x: 1256, y: 548, width: 524, height: 144 }),
      ]),
      3: Object.freeze([
        Object.freeze({ x: 1256, y: 340, width: 524, height: 116 }),
        Object.freeze({ x: 1256, y: 476, width: 524, height: 116 }),
        Object.freeze({ x: 1256, y: 612, width: 524, height: 116 }),
      ]),
    }),
  }),
});
