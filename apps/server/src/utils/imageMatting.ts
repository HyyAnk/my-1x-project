import {
  decodePngToRgba,
  encodeRgbaToPng,
  hasNativeTransparency,
  cleanupTransparentImage,
  removeImageBackgroundAi,
  removeImageBackgroundRgba,
  normalizeImageToPng,
  type MattingOptions,
  type DecodedImage,
} from "./matting/index.js";

export * from "./matting/index.js";

/**
 * High-level helper: removes background from PNG image bytes and returns transparent PNG bytes.
 * Defaults to AI Matting (RMBG) for high fidelity, with transparent fallback to procedural matting.
 * If input is already cleanly transparent, preserves original alpha without destructive re-matting.
 */
export async function removeImageBackground(imageBytes: Uint8Array, options: MattingOptions = {}): Promise<Uint8Array> {
  try {
    const pngBytes = await normalizeImageToPng(imageBytes);
    const decoded: DecodedImage = decodePngToRgba(pngBytes);

    // 1. If image already has genuine native alpha transparency (e.g. from GPTi2 transparent PNG),
    // preserve the pristine AI edges directly instead of destructive re-matting!
    if (hasNativeTransparency(decoded)) {
      const cleaned = cleanupTransparentImage(decoded);
      return encodeRgbaToPng(cleaned);
    }

    // 2. If image is opaque, run AI matting model (briaai/RMBG-1.4) via ONNX Runtime
    if (options.preferAi !== false && decoded.width >= 64 && decoded.height >= 64) {
      try {
        const aiMatted = await removeImageBackgroundAi(decoded, options);
        if (hasNativeTransparency(aiMatted)) {
          return encodeRgbaToPng(aiMatted);
        }
      } catch {
        // Graceful fallback to procedural BFS flood-fill if AI model fails
      }
    }

    // 3. Procedural flood-fill fallback for opaque images or an ineffective AI mask
    const matted = removeImageBackgroundRgba(decoded, options);
    return encodeRgbaToPng(matted);
  } catch {
    // Preserve unknown or invalid image formats for backward compatibility.
  }
  return imageBytes;
}
