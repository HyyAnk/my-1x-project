import type { FrameRect, LandscapeFrameGeometry } from "./quizFrame.types.js";
import { FIXED_FRAME_GEOMETRY, QUIZ_LAYOUT_GEOMETRY, type QuizLandscapeLayoutId } from "@studio/shared";

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
  canvas: FIXED_FRAME_GEOMETRY.canvas,
  question: FIXED_FRAME_GEOMETRY.question,
  thinking: FIXED_FRAME_GEOMETRY.thinking,
  fact: FIXED_FRAME_GEOMETRY.factAfter,
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
  counter: FIXED_FRAME_GEOMETRY.counter,
  brand: FIXED_FRAME_GEOMETRY.brand,
});

export const LAYOUT_ARENA_GEOMETRY: Readonly<Record<QuizLandscapeLayoutId, FrameRect>> = Object.freeze({
  media_left_choices_right: QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.arena,
  visual_choices_three: QUIZ_LAYOUT_GEOMETRY.visual_choices_three.arena,
  visual_choices_three_pure: QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure.arena,
  split_versus_two: QUIZ_LAYOUT_GEOMETRY.split_versus_two.arena,
  verdict_true_false: QUIZ_LAYOUT_GEOMETRY.verdict_true_false.arena,
  full_stack_list: QUIZ_LAYOUT_GEOMETRY.full_stack_list.arena,
  mystery_reveal: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.arena,
});
