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
