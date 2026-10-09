import type { ThumbnailAspectRatio } from "@studio/shared";
import type { QuizThumbnailPlan } from "../thumbnailTypes.js";
import { normalizeThumbnailImage } from "../thumbnailImageNormalizer.js";

/**
 * Validates, normalizes, and encodes editorial thumbnail artwork generated natively by the image model.
 * The model natively renders typography, brush banners, and option badges without artificial backend text overlays.
 * Kept for backward compatibility; every plan (editorial or preset layout) now shares the same normalization.
 */
export async function composeEditorialThumbnail(
  source: Buffer,
  _plan: QuizThumbnailPlan,
  ratio: ThumbnailAspectRatio,
  _projectRoot: string,
): Promise<Buffer> {
  return normalizeThumbnailImage(source, ratio);
}
