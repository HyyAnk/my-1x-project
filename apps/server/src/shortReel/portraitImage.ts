import sharp, { type Metadata } from "sharp";
import { GenerationError } from "./generationErrors.js";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MiB
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;
const TARGET_ASPECT_RATIO = 9 / 16; // 0.5625
const RATIO_TOLERANCE = 0.01;

/**
 * Validates raster headers, single-frame constraint, 20 MiB limit, decoded dimensions,
 * portrait orientation (width < height) and aspect ratio within 0.01 of 9:16.
 * Normalizes accepted portrait to exact 1080x1920 PNG format without stretching.
 */
export async function normalizeReelPortrait(bytes: Uint8Array): Promise<Buffer> {
  if (!bytes || bytes.length === 0) {
    throw new GenerationError("CORRUPT_IMAGE", "Image byte buffer is empty.");
  }
  if (bytes.length > MAX_BYTES) {
    throw new GenerationError("FILE_TOO_LARGE", `Image byte size (${bytes.length}) exceeds 20 MiB limit.`);
  }

  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: "warning", limitInputPixels: 32 * 1024 * 1024 }).metadata();
  } catch (err) {
    throw new GenerationError("CORRUPT_IMAGE", "Corrupt image data or unreadable image header.", { cause: err });
  }

  const format = metadata.format;
  if (!format || (format !== "png" && format !== "jpeg" && format !== "webp")) {
    throw new GenerationError("UNSUPPORTED_FORMAT", `Image format "${format || "unknown"}" is not supported. Use PNG, JPEG or WebP.`);
  }

  if (metadata.pages && metadata.pages > 1) {
    throw new GenerationError(
      "ANIMATION_ATLAS_REJECTED",
      "Multi-frame animated images or atlases are not allowed for Short-Reel portrait output.",
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width < 64 || height < 64 || width > 8192 || height > 8192) {
    throw new GenerationError("INVALID_DIMENSIONS", `Image dimensions (${width}x${height}) are out of allowed bounds [64..8192].`);
  }

  if (width >= height) {
    throw new GenerationError("INVALID_DIMENSIONS", `Expected portrait orientation (width < height), but received ${width}x${height}.`);
  }

  const actualRatio = width / height;
  if (Math.abs(actualRatio - TARGET_ASPECT_RATIO) > RATIO_TOLERANCE) {
    throw new GenerationError(
      "INVALID_DIMENSIONS",
      `Image aspect ratio (${actualRatio.toFixed(4)}) deviates from 9:16 (${TARGET_ASPECT_RATIO.toFixed(4)}) by more than tolerance (${RATIO_TOLERANCE}).`,
    );
  }

  try {
    await sharp(buffer, { failOn: "warning", limitInputPixels: 32 * 1024 * 1024 })
      .raw()
      .toBuffer();
  } catch (err) {
    throw new GenerationError("CORRUPT_IMAGE", "Image could not be fully decoded.", { cause: err });
  }

  try {
    return await sharp(buffer).resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: "cover" }).png().toBuffer();
  } catch (err) {
    throw new GenerationError("CORRUPT_IMAGE", "Failed to normalize image to 1080x1920 PNG.", { cause: err });
  }
}
