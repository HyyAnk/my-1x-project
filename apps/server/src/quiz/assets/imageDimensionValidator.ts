import { RepositoryError } from "../../repository.js";
import { parsePngChunks } from "../../utils/matting/pngChunkParser.js";

export interface DecodedImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Extracts width and height from image bytes (PNG IHDR) or fallback metadata string.
 */
export function extractImageDimensions(bytes: Uint8Array, fallbackSize?: string): DecodedImageDimensions | null {
  // Check for PNG signature
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    try {
      const chunks = parsePngChunks(bytes);
      if (chunks.width > 0 && chunks.height > 0) {
        return {
          width: chunks.width,
          height: chunks.height,
          aspectRatio: chunks.width / chunks.height,
        };
      }
    } catch {
      // Fall through to fallbackSize
    }
  }

  // Parse fallbackSize (e.g., "1280x720")
  if (fallbackSize) {
    const parts = fallbackSize.trim().split("x").map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      return {
        width: parts[0],
        height: parts[1],
        aspectRatio: parts[0] / parts[1],
      };
    }
  }

  return null;
}

/**
 * Validates that returned image dimensions match the requested aspect ratio within tolerance (5%).
 */
export function validateReturnedImageDimensions(
  bytes: Uint8Array,
  requestedRatio: string,
  metadataSize?: string,
  tolerance = 0.05,
): DecodedImageDimensions {
  const [numStr, denStr] = requestedRatio.split(":");
  const num = Number(numStr);
  const den = Number(denStr);
  if (!num || !den) {
    throw new RepositoryError(`Invalid requested aspect ratio: "${requestedRatio}"`, "INVALID_ASPECT_RATIO");
  }
  const expectedRatio = num / den;

  const dims = extractImageDimensions(bytes, metadataSize);
  if (!dims) {
    // If dimensions cannot be decoded from bytes or metadata, allow passage with logged warning
    return { width: 0, height: 0, aspectRatio: expectedRatio };
  }

  const deviation = Math.abs(dims.aspectRatio - expectedRatio) / expectedRatio;
  if (deviation > tolerance) {
    throw new RepositoryError(
      `[IMAGE_RATIO_MISMATCH] Returned image dimensions ${dims.width}x${dims.height} (ratio ${(dims.aspectRatio).toFixed(3)}) mismatch requested aspect ratio ${requestedRatio} (ratio ${expectedRatio.toFixed(3)}) with deviation ${(deviation * 100).toFixed(1)}%`,
      "IMAGE_RATIO_MISMATCH",
    );
  }

  return dims;
}
