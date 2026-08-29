import type { DecodedImage } from "./pngCodec.js";

export type MattingOptions = {
  /**
   * Color distance tolerance for background detection (0-255). Default is 25.
   */
  tolerance?: number;
  /**
   * Edge feathering width in distance space for smooth anti-aliasing. Default is 15.
   */
  feather?: number;
  /**
   * Target background color [R, G, B] to remove. If omitted, automatically sampled from borders.
   */
  targetColor?: [number, number, number];
  /**
   * Minimum alpha threshold below which a pixel is considered fully transparent. Default is 5.
   */
  alphaCutoff?: number;
  /**
   * Whether to prefer AI segmentation model (RMBG) over procedural flood fill. Default is true.
   */
  preferAi?: boolean;
};

/**
 * Computes Euclidean color distance in RGB space.
 */
export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Samples background color from border pixels if not explicitly provided.
 */
export function sampleBorderBackgroundColor(data: Uint8Array, width: number, height: number): [number, number, number] {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  // Sample the 4 outer corner regions
  const samplePoints: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [width - 1, 0],
    [width - 2, 0],
    [width - 1, 1],
    [0, height - 1],
    [1, height - 1],
    [0, height - 2],
    [width - 1, height - 1],
    [width - 2, height - 1],
    [width - 1, height - 2],
    // Center of top and bottom edges
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  for (const [x, y] of samplePoints) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * 4;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }
  }

  if (count === 0) return [255, 255, 255];
  return [Math.round(totalR / count), Math.round(totalG / count), Math.round(totalB / count)];
}

/**
 * Smart Alpha Matting & Background Removal.
 * Uses BFS Flood-Fill starting strictly from outer boundaries to remove solid/near-solid backgrounds
 * while strictly preserving all white or light details inside the character body.
 */
export function removeImageBackgroundRgba(image: DecodedImage, options: MattingOptions = {}): DecodedImage {
  const { width, height, data } = image;
  const tolerance = options.tolerance ?? 28;
  const feather = options.feather ?? 16;
  const alphaCutoff = options.alphaCutoff ?? 5;

  const targetBg = options.targetColor ?? sampleBorderBackgroundColor(data, width, height);
  const [bgR, bgG, bgB] = targetBg;

  // Track visited pixels to prevent duplicate queue items
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // 1. Seed boundary pixels into flood fill queue
  for (let x = 0; x < width; x++) {
    // Top border
    queue.push(0 * width + x);
    visited[0 * width + x] = 1;
    // Bottom border
    const btmIdx = (height - 1) * width + x;
    queue.push(btmIdx);
    visited[btmIdx] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    // Left border
    queue.push(y * width + 0);
    visited[y * width + 0] = 1;
    // Right border
    const rgtIdx = y * width + (width - 1);
    queue.push(rgtIdx);
    visited[rgtIdx] = 1;
  }

  // 2. BFS Flood Fill from borders inward
  let head = 0;
  while (head < queue.length) {
    const pixelIndex = queue[head++];
    const px = pixelIndex % width;
    const py = Math.floor(pixelIndex / width);
    const dataIdx = pixelIndex * 4;

    const r = data[dataIdx];
    const g = data[dataIdx + 1];
    const b = data[dataIdx + 2];
    const a = data[dataIdx + 3];

    // If already transparent, skip
    if (a < alphaCutoff) continue;

    const dist = colorDistance(r, g, b, bgR, bgG, bgB);

    if (dist <= tolerance) {
      // Pixel is definitely background -> 100% transparent
      data[dataIdx + 3] = 0;

      // Expand to 4-connected neighbors
      const neighbors: [number, number][] = [
        [px + 1, py],
        [px - 1, py],
        [px, py + 1],
        [px, py - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    } else if (dist <= tolerance + feather) {
      // Feathered transition boundary pixel
      const factor = (dist - tolerance) / feather;
      const newAlpha = Math.round(Math.min(255, Math.max(0, factor * a)));
      data[dataIdx + 3] = newAlpha;
      // Do not expand beyond feathered boundary
    }
  }

  return { width, height, data };
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
