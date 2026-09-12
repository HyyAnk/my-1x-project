import type { GetQuizImageSlotGeometryInput, ImageSlotGeometry, ImageSlotViewport } from "./types.js";

export const CANONICAL_IMAGE_SLOT_DEFINITIONS = Object.freeze({
  visual_choices_three: Object.freeze({
    cardBorderBox: Object.freeze({ width: 452, height: 504 }),
    mediaBorderBox: Object.freeze({ width: 452, height: 356 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 432, height: 336, fit: "cover" as const }),
  }),
  visual_choices_three_pure: Object.freeze({
    cardBorderBox: Object.freeze({ width: 452, height: 504 }),
    mediaBorderBox: Object.freeze({ width: 452, height: 504 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 432, height: 484, fit: "cover" as const }),
  }),
  split_versus_two: Object.freeze({
    cardBorderBox: Object.freeze({ width: 646, height: 504 }),
    mediaBorderBox: Object.freeze({ width: 646, height: 366 }),
    borderEachSide: 12,
    viewport: Object.freeze({ width: 622, height: 342, fit: "cover" as const }),
  }),
  media_left_choices_right: Object.freeze({
    cardBorderBox: Object.freeze({ width: 720, height: 510 }),
    mediaBorderBox: Object.freeze({ width: 720, height: 510 }),
    borderEachSide: 12,
    viewport: Object.freeze({ width: 696, height: 486, fit: "cover" as const }),
  }),
  verdict_true_false: Object.freeze({
    cardBorderBox: Object.freeze({ width: 820, height: 510 }),
    mediaBorderBox: Object.freeze({ width: 820, height: 510 }),
    borderEachSide: 10,
    viewport: Object.freeze({ width: 800, height: 490, fit: "cover" as const }),
  }),
  mystery_reveal: Object.freeze({
    cardBorderBox: Object.freeze({ width: 920, height: 360 }),
    mediaBorderBox: Object.freeze({ width: 920, height: 360 }),
    borderEachSide: 0,
    viewports: Object.freeze([
      Object.freeze({ width: 754.8, height: 249.27, fit: "contain" as const }),
      Object.freeze({ width: 761.6, height: 255.36, fit: "contain" as const }),
    ]),
  }),
  clue_deduction: Object.freeze({
    cardBorderBox: Object.freeze({ width: 824, height: 410 }),
    mediaBorderBox: Object.freeze({ width: 824, height: 410 }),
    borderEachSide: 0,
    viewport: Object.freeze({ width: 672, height: 324.23, fit: "contain" as const }),
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
      case "clue_deduction": {
        const vp = CANONICAL_IMAGE_SLOT_DEFINITIONS.clue_deduction.viewport;
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
