import sharp from "sharp";
import { THUMBNAIL_DIMENSION_SPECS, type ThumbnailAspectRatio } from "@studio/shared";

/** YouTube rejects custom thumbnails larger than 2 MB. */
export const YOUTUBE_THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

const MIN_SOURCE_EDGE_PX = 180;
const FLATTEN_BACKGROUND = "#101c30";
const JPEG_QUALITY_STEPS = [94, 90, 85, 80, 72] as const;
const FULL_CHROMA_MIN_QUALITY = 90;

async function assertUsableSource(source: Buffer): Promise<void> {
  const metadata = await sharp(source, { failOn: "warning" }).metadata();
  if (!metadata.width || !metadata.height || metadata.width < MIN_SOURCE_EDGE_PX || metadata.height < MIN_SOURCE_EDGE_PX) {
    throw new Error("Thumbnail provider returned an undersized image. Retry generation.");
  }
}

function encodeAtQuality(source: Buffer, ratio: ThumbnailAspectRatio, quality: number): Promise<Buffer> {
  const { width, height } = THUMBNAIL_DIMENSION_SPECS[ratio];
  return sharp(source, { failOn: "warning" })
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .flatten({ background: FLATTEN_BACKGROUND })
    .jpeg({ quality, chromaSubsampling: quality >= FULL_CHROMA_MIN_QUALITY ? "4:4:4" : "4:2:0" })
    .toBuffer();
}

/**
 * Converts any provider image into an upload-ready YouTube thumbnail:
 * exact canvas size for the ratio, baseline JPEG, and at most 2 MB.
 * Quality steps down only when the encoded file would exceed the size limit.
 */
export async function normalizeThumbnailImage(source: Buffer, ratio: ThumbnailAspectRatio): Promise<Buffer> {
  await assertUsableSource(source);
  for (const quality of JPEG_QUALITY_STEPS) {
    const encoded = await encodeAtQuality(source, ratio, quality);
    if (encoded.byteLength <= YOUTUBE_THUMBNAIL_MAX_BYTES) return encoded;
  }
  throw new Error("Thumbnail image exceeds the 2 MB YouTube limit after compression. Retry generation.");
}
