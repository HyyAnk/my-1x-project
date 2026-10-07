import sharp from "sharp";
import type { ThumbnailAspectRatio } from "@studio/shared";
import type { QuizThumbnailPlan } from "../thumbnailTypes.js";
import { editorialGeometry } from "./editorialGeometry.js";

/**
 * Validates, normalizes, and encodes editorial thumbnail artwork generated natively by the image model.
 * The model natively renders typography, brush banners, and option badges without artificial backend text overlays.
 */
export async function composeEditorialThumbnail(
  source: Buffer,
  plan: QuizThumbnailPlan,
  ratio: ThumbnailAspectRatio,
  _projectRoot: string,
): Promise<Buffer> {
  if (!plan.editorial) return source;
  const metadata = await sharp(source, { failOn: "warning" }).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 180 || metadata.height < 180) {
    throw new Error("Thumbnail provider returned an undersized image. Retry generation.");
  }
  const geometry = editorialGeometry(ratio, plan.editorial);
  return sharp(source, { failOn: "warning" })
    .rotate()
    .resize(geometry.width, geometry.height, { fit: "cover", position: "centre" })
    .flatten({ background: "#101c30" })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
