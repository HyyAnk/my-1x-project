import type { DecodedImage } from "./pngCodec.js";
import type { MattingOptions } from "./mattingTypes.js";
import { colorDistance, sampleBorderBackgroundColor, calculateChroma, isGreenKeyColor, applyGreenDespill } from "./colorSampling.js";
import { computeFeatheredAlpha } from "./alphaFeathering.js";
import { removeEnclosedCavities } from "./cavityDetector.js";

// Re-exports for 100% backward compatibility
export type { MattingOptions } from "./mattingTypes.js";
export { colorDistance, sampleBorderBackgroundColor } from "./colorSampling.js";
export { hasNativeTransparency, cleanupTransparentImage } from "./alphaFeathering.js";
export { removeEnclosedCavities } from "./cavityDetector.js";

function seedBorderQueue(width: number, height: number, queue: number[], visited: Uint8Array): void {
  for (let x = 0; x < width; x++) {
    queue.push(x);
    visited[x] = 1;
    const btmIdx = (height - 1) * width + x;
    queue.push(btmIdx);
    visited[btmIdx] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    const leftIdx = y * width;
    queue.push(leftIdx);
    visited[leftIdx] = 1;
    const rightIdx = y * width + (width - 1);
    queue.push(rightIdx);
    visited[rightIdx] = 1;
  }
}

/**
 * Smart Alpha Matting & Background Removal.
 * Uses BFS Flood-Fill starting from outer boundaries, followed by intelligent enclosed cavity
 * detection and matting for trapped backdrop regions (e.g. under wings, between limbs) while
 * strictly safeguarding all white, light, and delicate details on the character (eyes, teeth, highlights).
 */
export function removeImageBackgroundRgba(image: DecodedImage, options: MattingOptions = {}): DecodedImage {
  const { width, height, data } = image;
  const tolerance = options.tolerance ?? 28;
  const feather = options.feather ?? 16;
  const alphaCutoff = options.alphaCutoff ?? 5;
  const targetBg = options.targetColor ?? sampleBorderBackgroundColor(data, width, height);
  const [bgR, bgG, bgB] = targetBg;
  const isGreenKey = isGreenKeyColor(bgR, bgG, bgB);
  const isBgNeutral = calculateChroma(bgR, bgG, bgB) <= 12;

  const shouldRemoveCavities = options.removeEnclosedCavities ?? (isGreenKey || options.cavityTolerance !== undefined);
  const cavityTolerance = options.cavityTolerance ?? 8;
  const minCavitySize = options.minCavitySize ?? 16;

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  seedBorderQueue(width, height, queue, visited);

  let head = 0;
  while (head < queue.length) {
    const pixelIndex = queue[head++];
    const px = pixelIndex % width;
    const py = Math.floor(pixelIndex / width);
    const dataIdx = pixelIndex * 4;
    const a = data[dataIdx + 3];

    if (a < alphaCutoff) continue;

    const dist = colorDistance(data[dataIdx], data[dataIdx + 1], data[dataIdx + 2], bgR, bgG, bgB);

    if (dist <= tolerance) {
      data[dataIdx + 3] = 0;

      if (px + 1 < width && !visited[py * width + (px + 1)]) {
        visited[py * width + (px + 1)] = 1;
        queue.push(py * width + (px + 1));
      }
      if (px - 1 >= 0 && !visited[py * width + (px - 1)]) {
        visited[py * width + (px - 1)] = 1;
        queue.push(py * width + (px - 1));
      }
      if (py + 1 < height && !visited[(py + 1) * width + px]) {
        visited[(py + 1) * width + px] = 1;
        queue.push((py + 1) * width + px);
      }
      if (py - 1 >= 0 && !visited[(py - 1) * width + px]) {
        visited[(py - 1) * width + px] = 1;
        queue.push((py - 1) * width + px);
      }
    } else if (dist <= tolerance + feather) {
      data[dataIdx + 3] = computeFeatheredAlpha(dist, tolerance, feather, a);
    }
  }

  if (shouldRemoveCavities) {
    removeEnclosedCavities({
      data,
      width,
      height,
      visited,
      targetBg,
      isBgNeutral,
      isGreenKey,
      cavityTolerance,
      feather,
      alphaCutoff,
      minCavitySize,
    });
  }

  if (isGreenKey) {
    applyGreenDespill(data, width, height);
  }

  return { width, height, data };
}
