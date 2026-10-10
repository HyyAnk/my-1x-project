import type { FrameRect } from "./quizFrame.types.js";
import { PORTRAIT_FRAME_GEOMETRY, QUIZ_PORTRAIT_LAYOUT_GEOMETRY, type QuizPortraitLayoutId } from "@studio/shared";

export type PortraitFrameGeometry = Readonly<{
  canvas: Readonly<{ width: number; height: number }>;
  safeArea: FrameRect;
  reservedTop: number;
  reservedBottom: number;
  reservedRight: number;
  progressStrip: FrameRect;
  question: FrameRect;
  arena: FrameRect;
  countdown: FrameRect;
  mascot: FrameRect;
  cta: FrameRect;
}>;

/** Server-side portrait frame contract: the 1080x1920 Quiz Short canvas and its fixed slots. */
export const PORTRAIT_FRAME: PortraitFrameGeometry = Object.freeze({
  canvas: PORTRAIT_FRAME_GEOMETRY.canvas,
  safeArea: PORTRAIT_FRAME_GEOMETRY.safeArea,
  reservedTop: PORTRAIT_FRAME_GEOMETRY.reservedTop,
  reservedBottom: PORTRAIT_FRAME_GEOMETRY.reservedBottom,
  reservedRight: PORTRAIT_FRAME_GEOMETRY.reservedRight,
  progressStrip: PORTRAIT_FRAME_GEOMETRY.progressStrip,
  question: PORTRAIT_FRAME_GEOMETRY.question,
  arena: PORTRAIT_FRAME_GEOMETRY.arena,
  countdown: PORTRAIT_FRAME_GEOMETRY.countdown,
  mascot: PORTRAIT_FRAME_GEOMETRY.mascot,
  cta: PORTRAIT_FRAME_GEOMETRY.cta,
});

export const PORTRAIT_LAYOUT_ARENA_GEOMETRY: Readonly<Record<QuizPortraitLayoutId, FrameRect>> = Object.freeze({
  short_stack_list: QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_stack_list.arena,
  short_media_top_choices: QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_media_top_choices.arena,
  short_versus_two: QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_versus_two.arena,
  short_verdict_yes_no: QUIZ_PORTRAIT_LAYOUT_GEOMETRY.short_verdict_yes_no.arena,
});

/** True when the rect sits entirely inside the portrait safe area (clear of platform chrome). */
export function isInsidePortraitSafeArea(rect: FrameRect): boolean {
  const safe = PORTRAIT_FRAME.safeArea;
  return rect.x >= safe.x && rect.y >= safe.y && rect.x + rect.width <= safe.x + safe.width && rect.y + rect.height <= safe.y + safe.height;
}

/** Converts a canvas rect into coordinates local to the given anchor rect. */
export function toLocalRect(rect: FrameRect, anchor: FrameRect): FrameRect {
  return Object.freeze({ x: rect.x - anchor.x, y: rect.y - anchor.y, width: rect.width, height: rect.height });
}
