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
 * Calculates color chroma as the maximum difference between any two color channels.
 */
export function calculateChroma(r: number, g: number, b: number): number {
  return Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
}

/**
 * Checks if color qualifies as green screen chroma key backdrop.
 */
export function isGreenKeyColor(r: number, g: number, b: number): boolean {
  return g > r + 35 && g > b + 35;
}

const RESIDUAL_GREEN_MIN_CHANNEL = 180;
const RESIDUAL_GREEN_MIN_DOMINANCE = 80;
const RESIDUAL_GREEN_MIN_PIXELS = 64;
const RESIDUAL_GREEN_MIN_VISIBLE_RATIO = 0.015;
const RESIDUAL_GREEN_MIN_PARTIAL_PIXELS = 16;
const RESIDUAL_GREEN_MIN_PARTIAL_RATIO = 0.01;
const RESIDUAL_GREEN_MAX_RED_BLUE = 48;
const RESIDUAL_GREEN_MIN_MEAN_GREEN = 220;
const RESIDUAL_GREEN_COMPACT_DISTANCE = 48;
const RESIDUAL_GREEN_MIN_COMPACT_RATIO = 0.75;

type ResidualGreenStats = {
  visiblePixels: number;
  candidates: number;
  partialCandidates: number;
  totals: [number, number, number];
};

function isStrongGreenKeyCandidate(r: number, g: number, b: number): boolean {
  return g >= RESIDUAL_GREEN_MIN_CHANNEL && g - r >= RESIDUAL_GREEN_MIN_DOMINANCE && g - b >= RESIDUAL_GREEN_MIN_DOMINANCE;
}

function collectResidualGreenStats(data: Uint8Array, width: number, height: number, alphaCutoff: number): ResidualGreenStats {
  const stats: ResidualGreenStats = { visiblePixels: 0, candidates: 0, partialCandidates: 0, totals: [0, 0, 0] };
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const alpha = data[idx + 3];
    if (alpha < alphaCutoff) continue;
    stats.visiblePixels++;
    if (!isStrongGreenKeyCandidate(data[idx], data[idx + 1], data[idx + 2])) continue;
    stats.candidates++;
    if (alpha < 250) stats.partialCandidates++;
    stats.totals[0] += data[idx];
    stats.totals[1] += data[idx + 1];
    stats.totals[2] += data[idx + 2];
  }
  return stats;
}

function countCompactGreenCandidates(
  data: Uint8Array,
  width: number,
  height: number,
  alphaCutoff: number,
  mean: [number, number, number],
): number {
  let compactCandidates = 0;
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (data[idx + 3] < alphaCutoff || !isStrongGreenKeyCandidate(data[idx], data[idx + 1], data[idx + 2])) continue;
    if (colorDistance(data[idx], data[idx + 1], data[idx + 2], ...mean) <= RESIDUAL_GREEN_COMPACT_DISTANCE) compactCandidates++;
  }
  return compactCandidates;
}

/**
 * Infers a flat green-screen color left behind by an earlier alpha-matting pass.
 * The thresholds intentionally reject small green subject details and varied natural greens.
 */
export function inferResidualGreenKeyColor(
  data: Uint8Array,
  width: number,
  height: number,
  alphaCutoff = 5,
): [number, number, number] | null {
  const stats = collectResidualGreenStats(data, width, height, alphaCutoff);
  const requiredCandidates = Math.max(RESIDUAL_GREEN_MIN_PIXELS, Math.ceil(stats.visiblePixels * RESIDUAL_GREEN_MIN_VISIBLE_RATIO));
  const hasMaskTransition =
    stats.partialCandidates >= RESIDUAL_GREEN_MIN_PARTIAL_PIXELS &&
    stats.partialCandidates / Math.max(stats.candidates, 1) >= RESIDUAL_GREEN_MIN_PARTIAL_RATIO;
  if (stats.candidates < requiredCandidates || !hasMaskTransition) return null;

  const mean: [number, number, number] = [
    stats.totals[0] / stats.candidates,
    stats.totals[1] / stats.candidates,
    stats.totals[2] / stats.candidates,
  ];
  if (mean[0] > RESIDUAL_GREEN_MAX_RED_BLUE || mean[1] < RESIDUAL_GREEN_MIN_MEAN_GREEN || mean[2] > RESIDUAL_GREEN_MAX_RED_BLUE) {
    return null;
  }

  const compactCandidates = countCompactGreenCandidates(data, width, height, alphaCutoff, mean);
  if (compactCandidates / stats.candidates < RESIDUAL_GREEN_MIN_COMPACT_RATIO) return null;
  return [Math.round(mean[0]), Math.round(mean[1]), Math.round(mean[2])];
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
 * Applies green spill suppression (despill) on semi-transparent edge pixels.
 * Eliminates green reflection/fringing on anti-aliased edge pixels.
 */
export function applyGreenDespill(data: Uint8Array, width: number, height: number): void {
  for (let i = 0; i < width * height; i++) {
    const dIdx = i * 4;
    const a = data[dIdx + 3];
    if (a > 0 && a < 255) {
      const r = data[dIdx];
      const g = data[dIdx + 1];
      const b = data[dIdx + 2];
      const maxOther = Math.max(r, b);
      if (g > maxOther) {
        data[dIdx + 1] = maxOther;
      }
    }
  }
}
