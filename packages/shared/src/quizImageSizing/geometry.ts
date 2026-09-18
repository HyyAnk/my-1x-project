import { QUIZ_LAYOUT_GEOMETRY } from "../quizLayoutGeometry/index.js";
import type { GetQuizImageSlotGeometryInput, ImageSlotGeometry, ImageSlotViewport } from "./types.js";

export const CANONICAL_IMAGE_SLOT_DEFINITIONS = Object.freeze({
  visual_choices_three: Object.freeze({
    cardBorderBox: QUIZ_LAYOUT_GEOMETRY.visual_choices_three.imageSlot!.cardBorderBox,
    mediaBorderBox: QUIZ_LAYOUT_GEOMETRY.visual_choices_three.imageSlot!.mediaBorderBox,
    borderEachSide: QUIZ_LAYOUT_GEOMETRY.visual_choices_three.imageSlot!.borderEachSide,
    viewport: QUIZ_LAYOUT_GEOMETRY.visual_choices_three.imageSlot!.viewport,
  }),
  visual_choices_three_pure: Object.freeze({
    cardBorderBox: QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure.imageSlot!.cardBorderBox,
    mediaBorderBox: QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure.imageSlot!.mediaBorderBox,
    borderEachSide: QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure.imageSlot!.borderEachSide,
    viewport: QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure.imageSlot!.viewport,
  }),
  split_versus_two: Object.freeze({
    cardBorderBox: QUIZ_LAYOUT_GEOMETRY.split_versus_two.imageSlot!.cardBorderBox,
    mediaBorderBox: QUIZ_LAYOUT_GEOMETRY.split_versus_two.imageSlot!.mediaBorderBox,
    borderEachSide: QUIZ_LAYOUT_GEOMETRY.split_versus_two.imageSlot!.borderEachSide,
    viewport: QUIZ_LAYOUT_GEOMETRY.split_versus_two.imageSlot!.viewport,
  }),
  media_left_choices_right: Object.freeze({
    cardBorderBox: QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.imageSlot!.cardBorderBox,
    mediaBorderBox: QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.imageSlot!.mediaBorderBox,
    borderEachSide: QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.imageSlot!.borderEachSide,
    viewport: QUIZ_LAYOUT_GEOMETRY.media_left_choices_right.imageSlot!.viewport,
  }),
  verdict_true_false: Object.freeze({
    cardBorderBox: QUIZ_LAYOUT_GEOMETRY.verdict_true_false.imageSlot!.cardBorderBox,
    mediaBorderBox: QUIZ_LAYOUT_GEOMETRY.verdict_true_false.imageSlot!.mediaBorderBox,
    borderEachSide: QUIZ_LAYOUT_GEOMETRY.verdict_true_false.imageSlot!.borderEachSide,
    viewport: QUIZ_LAYOUT_GEOMETRY.verdict_true_false.imageSlot!.viewport,
  }),
  mystery_reveal: Object.freeze({
    cardBorderBox: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.imageSlot!.cardBorderBox,
    mediaBorderBox: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.imageSlot!.mediaBorderBox,
    borderEachSide: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.imageSlot!.borderEachSide,
    slot: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.imageSlot!.slot!,
    viewport: QUIZ_LAYOUT_GEOMETRY.mystery_reveal.imageSlot!.viewport,
    viewports: Object.freeze([QUIZ_LAYOUT_GEOMETRY.mystery_reveal.imageSlot!.viewport]),
  }),
});

function serializeGeometryKey(
  layoutId: string,
  purpose: string,
  canvas: { width: number; height: number },
  viewports: readonly ImageSlotViewport[],
): string {
  const vpParts = viewports.map((v) => `${Math.round(v.width * 100) / 100}x${Math.round(v.height * 100) / 100}_${v.fit}`).join(",");
  return `${layoutId}:${purpose}:${canvas.width}x${canvas.height}:${vpParts}`;
}

export function getQuizImageSlotGeometry(input: GetQuizImageSlotGeometryInput): ImageSlotGeometry | null {
  if (input.canvasAspectRatio !== "16:9") {
    return null;
  }
  const canvas = { width: 1920, height: 1080 };

  if (input.purpose === "hero_question_image") {
    switch (input.layoutId) {
      case "media_left_choices_right": {
        const vp = CANONICAL_IMAGE_SLOT_DEFINITIONS.media_left_choices_right.viewport;
        const viewports = [vp];
        return {
          layoutId: input.layoutId,
          purpose: input.purpose,
          canvas,
          viewports,
          geometryKey: serializeGeometryKey(input.layoutId, input.purpose, canvas, viewports),
        };
      }
      case "verdict_true_false": {
        const vp = CANONICAL_IMAGE_SLOT_DEFINITIONS.verdict_true_false.viewport;
        const viewports = [vp];
        return {
          layoutId: input.layoutId,
          purpose: input.purpose,
          canvas,
          viewports,
          geometryKey: serializeGeometryKey(input.layoutId, input.purpose, canvas, viewports),
        };
      }
      case "mystery_reveal": {
        const viewports = CANONICAL_IMAGE_SLOT_DEFINITIONS.mystery_reveal.viewports;
        return {
          layoutId: input.layoutId,
          purpose: input.purpose,
          canvas,
          viewports,
          geometryKey: serializeGeometryKey(input.layoutId, input.purpose, canvas, viewports),
        };
      }
      default:
        return null;
    }
  }

  if (input.purpose === "answer_option") {
    if (input.presentation !== "visual") {
      return null;
    }

    switch (input.layoutId) {
      case "visual_choices_three": {
        const vp = CANONICAL_IMAGE_SLOT_DEFINITIONS.visual_choices_three.viewport;
        const viewports = [vp];
        return {
          layoutId: input.layoutId,
          purpose: input.purpose,
          canvas,
          viewports,
          geometryKey: serializeGeometryKey(input.layoutId, input.purpose, canvas, viewports),
        };
      }
      case "visual_choices_three_pure": {
        const vp = CANONICAL_IMAGE_SLOT_DEFINITIONS.visual_choices_three_pure.viewport;
        const viewports = [vp];
        return {
          layoutId: input.layoutId,
          purpose: input.purpose,
          canvas,
          viewports,
          geometryKey: serializeGeometryKey(input.layoutId, input.purpose, canvas, viewports),
        };
      }
      case "split_versus_two": {
        const vp = CANONICAL_IMAGE_SLOT_DEFINITIONS.split_versus_two.viewport;
        const viewports = [vp];
        return {
          layoutId: input.layoutId,
          purpose: input.purpose,
          canvas,
          viewports,
          geometryKey: serializeGeometryKey(input.layoutId, input.purpose, canvas, viewports),
        };
      }
      default:
        return null;
    }
  }

  return null;
}
