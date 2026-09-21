import {
  decodePngToRgba,
  encodeRgbaToPng,
  hasNativeTransparency,
  cleanupTransparentImage,
  inferResidualGreenKeyColor,
  isGreenKeyColor,
  removeImageBackgroundAi,
  removeImageBackgroundRgba,
  normalizeImageToPng,
  sampleBorderBackgroundColor,
  type MattingOptions,
  type DecodedImage,
} from "./matting/index.js";

export * from "./matting/index.js";

function encodeCleanTransparentImage(image: DecodedImage): Uint8Array {
  return encodeRgbaToPng(cleanupTransparentImage(image));
}

function removeGreenKeyArtifacts(image: DecodedImage, targetColor: [number, number, number], options: MattingOptions): DecodedImage {
  return removeImageBackgroundRgba(image, {
    ...options,
    targetColor,
    removeEnclosedCavities: options.removeEnclosedCavities ?? true,
  });
}

/**
 * High-level helper: removes background from PNG image bytes and returns transparent PNG bytes.
 * Uses deterministic chroma-key matting for green screens and AI matting for other opaque inputs.
 * Transparent inputs preserve their alpha unless a large, flat residual green-screen cluster remains.
 */
export async function removeImageBackground(imageBytes: Uint8Array, options: MattingOptions = {}): Promise<Uint8Array> {
  try {
    const pngBytes = await normalizeImageToPng(imageBytes);
    const decoded: DecodedImage = decodePngToRgba(pngBytes);
    const sampledBackground = options.targetColor ?? sampleBorderBackgroundColor(decoded.data, decoded.width, decoded.height);
    const sourceHasGreenKey = isGreenKeyColor(...sampledBackground);

    // 1. If image already has genuine native alpha transparency (e.g. from GPTi2 transparent PNG),
    // preserve clean edges, but repair a sufficiently large and flat residual green-screen cluster.
    if (hasNativeTransparency(decoded)) {
      const cleaned = cleanupTransparentImage(decoded);
      const residualGreenKey =
        (sourceHasGreenKey ? sampledBackground : null) ??
        inferResidualGreenKeyColor(cleaned.data, cleaned.width, cleaned.height, options.alphaCutoff);
      const repaired = residualGreenKey ? removeGreenKeyArtifacts(cleaned, residualGreenKey, options) : cleaned;
      return encodeCleanTransparentImage(repaired);
    }

    // 2. A known chroma-key source is more accurately and efficiently handled by deterministic color matting.
    if (sourceHasGreenKey) {
      return encodeCleanTransparentImage(removeGreenKeyArtifacts(decoded, sampledBackground, options));
    }

    // 3. If an opaque image has no chroma key, run AI matting (briaai/RMBG-1.4) via ONNX Runtime.
    if (options.preferAi !== false && decoded.width >= 64 && decoded.height >= 64) {
      try {
        const aiMatted = await removeImageBackgroundAi(decoded, options);
        if (hasNativeTransparency(aiMatted)) {
          return encodeCleanTransparentImage(aiMatted);
        }
      } catch {
        // Graceful fallback to procedural BFS flood-fill if AI model fails
      }
    }

    // 4. Procedural flood-fill fallback for opaque images or an ineffective AI mask.
    const matted = removeImageBackgroundRgba(decoded, options);
    return encodeCleanTransparentImage(matted);
  } catch {
    // Preserve unknown or invalid image formats for backward compatibility.
  }
  return imageBytes;
}
