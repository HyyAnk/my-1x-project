import type { EnclosedCavityOptions } from "./mattingTypes.js";
import { colorDistance, calculateChroma } from "./colorSampling.js";
import { computeFeatheredAlpha } from "./alphaFeathering.js";

export type { EnclosedCavityOptions } from "./mattingTypes.js";

function buildDarkFeatureMap(data: Uint8Array, width: number, height: number, visited: Uint8Array): Uint8Array {
  const isDarkFeature = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (!visited[i]) {
      const dIdx = i * 4;
      if (data[dIdx] < 60 && data[dIdx + 1] < 60 && data[dIdx + 2] < 60) {
        isDarkFeature[i] = 1;
      }
    }
  }
  return isDarkFeature;
}

function isCavityColorMatch(
  dist: number,
  r: number,
  g: number,
  b: number,
  chroma: number,
  cavityTolerance: number,
  isGreenKey: boolean,
  isBgNeutral: boolean,
): boolean {
  if (isGreenKey) {
    return dist <= Math.max(cavityTolerance, 56) || (g > r + 30 && g > b + 30);
  }
  return dist <= cavityTolerance && (!isBgNeutral || chroma <= 6);
}

function isNearDarkFeature(cx: number, cy: number, width: number, height: number, isDarkFeature: Uint8Array): boolean {
  for (let dy = -28; dy <= 28; dy += 3) {
    for (let dx = -28; dx <= 28; dx += 3) {
      const ny = cy + dy;
      const nx = cx + dx;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && isDarkFeature[ny * width + nx]) {
        return true;
      }
    }
  }
  return false;
}

function findEnclosedCavitySeeds(options: EnclosedCavityOptions, isDarkFeature: Uint8Array): number[] {
  const { data, width, height, visited, targetBg, isBgNeutral, isGreenKey, cavityTolerance, alphaCutoff, minCavitySize } = options;
  const [bgR, bgG, bgB] = targetBg;
  const compVisited = new Uint8Array(width * height);
  const validCavitySeeds: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pIdx = y * width + x;
      if (visited[pIdx] || compVisited[pIdx] || data[pIdx * 4 + 3] < alphaCutoff) continue;

      const dIdx = pIdx * 4;
      const dist = colorDistance(data[dIdx], data[dIdx + 1], data[dIdx + 2], bgR, bgG, bgB);
      const chroma = calculateChroma(data[dIdx], data[dIdx + 1], data[dIdx + 2]);
      if (!isCavityColorMatch(dist, data[dIdx], data[dIdx + 1], data[dIdx + 2], chroma, cavityTolerance, isGreenKey, isBgNeutral)) {
        continue;
      }

      const cQueue = [pIdx];
      compVisited[pIdx] = 1;
      let cqHead = 0;
      let nearPupil = false;

      while (cqHead < cQueue.length) {
        const curr = cQueue[cqHead++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        if (!nearPupil && !isGreenKey && isNearDarkFeature(cx, cy, width, height, isDarkFeature)) {
          nearPupil = true;
        }

        const nIndices = [
          cx + 1 < width ? cy * width + (cx + 1) : -1,
          cx - 1 >= 0 ? cy * width + (cx - 1) : -1,
          cy + 1 < height ? (cy + 1) * width + cx : -1,
          cy - 1 >= 0 ? (cy - 1) * width + cx : -1,
        ];
        for (const nIdx of nIndices) {
          if (nIdx >= 0 && !visited[nIdx] && !compVisited[nIdx]) {
            const ndIdx = nIdx * 4;
            const ndist = colorDistance(data[ndIdx], data[ndIdx + 1], data[ndIdx + 2], bgR, bgG, bgB);
            const nchroma = calculateChroma(data[ndIdx], data[ndIdx + 1], data[ndIdx + 2]);
            if (
              isCavityColorMatch(ndist, data[ndIdx], data[ndIdx + 1], data[ndIdx + 2], nchroma, cavityTolerance, isGreenKey, isBgNeutral)
            ) {
              compVisited[nIdx] = 1;
              cQueue.push(nIdx);
            }
          }
        }
      }

      if (cQueue.length >= minCavitySize && (isGreenKey || !nearPupil)) {
        for (let i = 0; i < cQueue.length; i++) {
          validCavitySeeds.push(cQueue[i]);
        }
      }
    }
  }

  return validCavitySeeds;
}

function fillCavitiesFromSeeds(options: EnclosedCavityOptions, validCavitySeeds: number[]): void {
  const { data, width, height, visited, targetBg, isGreenKey, cavityTolerance, feather } = options;
  const [bgR, bgG, bgB] = targetBg;
  const cavityQueue = [...validCavitySeeds];
  for (const s of validCavitySeeds) {
    visited[s] = 1;
  }

  const effectiveCavityTol = isGreenKey ? Math.max(cavityTolerance + 4, 64) : cavityTolerance + 4;
  const effectiveCavityFeather = Math.min(feather, 8);

  let cHead = 0;
  while (cHead < cavityQueue.length) {
    const pIdx = cavityQueue[cHead++];
    const px = pIdx % width;
    const py = Math.floor(pIdx / width);
    const dIdx = pIdx * 4;
    const a = data[dIdx + 3];

    const dist = colorDistance(data[dIdx], data[dIdx + 1], data[dIdx + 2], bgR, bgG, bgB);
    const isPixelMatch =
      dist <= effectiveCavityTol || (isGreenKey && data[dIdx + 1] > data[dIdx] + 25 && data[dIdx + 1] > data[dIdx + 2] + 25);

    if (isPixelMatch) {
      data[dIdx + 3] = 0;

      const nIndices = [
        px + 1 < width ? py * width + (px + 1) : -1,
        px - 1 >= 0 ? py * width + (px - 1) : -1,
        py + 1 < height ? (py + 1) * width + px : -1,
        py - 1 >= 0 ? (py - 1) * width + px : -1,
      ];
      for (const ni of nIndices) {
        if (ni >= 0 && !visited[ni]) {
          visited[ni] = 1;
          cavityQueue.push(ni);
        }
      }
    } else if (dist <= effectiveCavityTol + effectiveCavityFeather) {
      data[dIdx + 3] = computeFeatheredAlpha(dist, effectiveCavityTol, effectiveCavityFeather, a);
    }
  }
}

/**
 * Detects and removes enclosed background cavities (trapped backdrop areas like gaps
 * under wings or between limbs) while safeguarding delicate character details like eyes.
 */
export function removeEnclosedCavities(options: EnclosedCavityOptions): void {
  const isDarkFeature = buildDarkFeatureMap(options.data, options.width, options.height, options.visited);
  const seeds = findEnclosedCavitySeeds(options, isDarkFeature);
  if (seeds.length > 0) {
    fillCavitiesFromSeeds(options, seeds);
  }
}
