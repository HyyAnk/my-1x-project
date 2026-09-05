import type { DecodedImage } from "./pngCodec.js";
import { decodePngToRgba, encodeRgbaToPng } from "./pngCodec.js";

/**
 * Creates a pixelate mosaic representation of a decoded RGBA image.
 *
 * For each NxN block, calculates average RGB from opaque/semi-opaque subject pixels,
 * assigning the averaged color across the block while strictly preserving each pixel's
 * original alpha value so transparent background and edge anti-aliasing stay intact.
 */
export function createMosaicPixelateRgba(decoded: DecodedImage, blockSize = 18): DecodedImage {
  const { width, height, data } = decoded;
  const outputData = new Uint8Array(data.length);
  outputData.set(data);

  const safeBlockSize = Math.max(2, Math.floor(blockSize));

  for (let blockY = 0; blockY < height; blockY += safeBlockSize) {
    for (let blockX = 0; blockX < width; blockX += safeBlockSize) {
      const xEnd = Math.min(width, blockX + safeBlockSize);
      const yEnd = Math.min(height, blockY + safeBlockSize);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      // 1. Accumulate colors from non-transparent subject pixels in block
      for (let y = blockY; y < yEnd; y++) {
        for (let x = blockX; x < xEnd; x++) {
          const idx = (y * width + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 12) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
      }

      // If the block contains subject pixels, fill with averaged block color
      if (count > 0) {
        const avgR = Math.round(sumR / count);
        const avgG = Math.round(sumG / count);
        const avgB = Math.round(sumB / count);

        for (let y = blockY; y < yEnd; y++) {
          for (let x = blockX; x < xEnd; x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > 0) {
              outputData[idx] = avgR;
              outputData[idx + 1] = avgG;
              outputData[idx + 2] = avgB;
              // alpha at outputData[idx + 3] remains original alpha
            }
          }
        }
      }
    }
  }

  return {
    width,
    height,
    data: outputData,
  };
}

/**
 * Creates a pixelate mosaic PNG from input PNG bytes.
 */
export function createMosaicImagePng(imageBytes: Uint8Array, blockSize = 18): Uint8Array {
  const decoded = decodePngToRgba(imageBytes);
  const mosaic = createMosaicPixelateRgba(decoded, blockSize);
  return encodeRgbaToPng(mosaic);
}
