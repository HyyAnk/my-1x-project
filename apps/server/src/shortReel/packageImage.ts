import sharp, { type Metadata } from "sharp";
export type ReferenceErrorCode =
  | "MISSING_REFERENCE"
  | "INVALID_REFERENCE_PATH"
  | "CORRUPT_IMAGE"
  | "UNSUPPORTED_FORMAT"
  | "DIMENSIONS_OUT_OF_BOUNDS"
  | "FILE_TOO_LARGE"
  | "ANIMATION_ATLAS_REJECTED";

export class ReferenceError extends Error {
  constructor(
    public readonly code: ReferenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReferenceError";
  }
}

export interface ValidatedImageInfo {
  width: number;
  height: number;
  format: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * Validates raw image buffer signatures, decoded dimensions, raster format,
 * and checks that an image is not an animated atlas or multi-page sprite.
 */
export async function validateImageBuffer(
  buffer: Buffer,
  role: "mascot" | "style",
  options?: { allowAtlas?: boolean; maxBytes?: number },
): Promise<ValidatedImageInfo> {
  const maxBytes = options?.maxBytes ?? 20 * 1024 * 1024;
  if (!buffer || buffer.length === 0) {
    throw new ReferenceError("CORRUPT_IMAGE", `Image buffer for ${role} is empty.`);
  }
  if (buffer.length > maxBytes) {
    throw new ReferenceError("FILE_TOO_LARGE", `Image buffer for ${role} exceeds ${maxBytes} bytes limit.`);
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: "warning", limitInputPixels: 32 * 1024 * 1024 }).metadata();
  } catch {
    throw new ReferenceError("CORRUPT_IMAGE", `Corrupt image data or unreadable image header for ${role}.`);
  }

  const format = metadata.format;
  if (!format || (format !== "png" && format !== "jpeg" && format !== "webp")) {
    throw new ReferenceError(
      "UNSUPPORTED_FORMAT",
      `Image format "${format || "unknown"}" for ${role} is not supported. Use PNG, JPEG or WebP.`,
    );
  }

  if (!options?.allowAtlas && metadata.pages && metadata.pages > 1) {
    throw new ReferenceError(
      "ANIMATION_ATLAS_REJECTED",
      `Multi-frame animated image or atlas is not a usable single-frame ${role} reference.`,
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < 64 || height < 64 || width > 8192 || height > 8192) {
    throw new ReferenceError(
      "DIMENSIONS_OUT_OF_BOUNDS",
      `Image dimensions (${width}x${height}) for ${role} are out of allowed bounds [64..8192].`,
    );
  }

  try {
    await sharp(buffer, { failOn: "warning", limitInputPixels: 32 * 1024 * 1024 })
      .raw()
      .toBuffer();
  } catch {
    throw new ReferenceError("CORRUPT_IMAGE", "Image could not be fully decoded.");
  }
  const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
  return { width, height, format, mimeType, buffer };
}
