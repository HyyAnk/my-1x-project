import type { DecodedImage } from "./pngCodec.js";

/**
 * Computes feathered alpha value for boundary pixels within transition zone.
 */
export function computeFeatheredAlpha(distance: number, tolerance: number, feather: number, originalAlpha: number): number {
  if (feather <= 0) return 0;
  const factor = (distance - tolerance) / feather;
  return Math.round(Math.min(255, Math.max(0, factor * originalAlpha)));
}

/**
 * Detects if an image already contains genuine alpha transparency (e.g. from GPTi2 with background: "transparent").
 */
export function hasNativeTransparency(image: DecodedImage, thresholdRatio = 0.1): boolean {
  const { width, height, data } = image;
  const totalPixels = width * height;
  if (totalPixels === 0) return false;

  let transparentPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 20) {
      transparentPixels++;
    }
  }

  // Also check borders
  let borderTransparent = 0;
  let borderTotal = 0;
  for (let x = 0; x < width; x++) {
    if (data[(0 * width + x) * 4 + 3] < 20) borderTransparent++;
    if (data[((height - 1) * width + x) * 4 + 3] < 20) borderTransparent++;
    borderTotal += 2;
  }
  for (let y = 1; y < height - 1; y++) {
    if (data[(y * width + 0) * 4 + 3] < 20) borderTransparent++;
    if (data[(y * width + (width - 1)) * 4 + 3] < 20) borderTransparent++;
    borderTotal += 2;
  }

  return transparentPixels / totalPixels >= thresholdRatio && borderTransparent / borderTotal >= 0.3;
}

/**
 * Cleans up isolated stray noise specks on an already transparent PNG without eroding soft antialiased edges.
 */
export function cleanupTransparentImage(image: DecodedImage): DecodedImage {
  const { width, height, data } = image;
  const out = new Uint8Array(data.length);
  out.set(data);

  // Eliminate near-zero alpha noise (e.g. compression artifacts with alpha < 5)
  for (let i = 0; i < width * height; i++) {
    const a = out[i * 4 + 3];
    if (a < 5) {
      out[i * 4 + 3] = 0;
    }
  }
  return { width, height, data: out };
}
