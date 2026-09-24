import { hasNativeTransparency } from "./alphaFeathering.js";
import { normalizeImageToPng } from "./imageFormatNormalizer.js";
import { decodePngToRgba, type DecodedImage } from "./pngCodec.js";

export type GreenScreenCanvasComposition = "1:1" | "16:9" | "auto";

export type GreenScreenRejectionReason =
  | "native_transparency"
  | "insufficient_green_chroma"
  | "invalid_image"
  | "zero_dimensions";

export type GreenScreenValidationDetails = {
  headroomRatio?: number;
  headroomPoints?: number;
  headroomGreenPoints?: number;
  borderRatio?: number;
  borderPoints?: number;
  borderGreenPoints?: number;
  cornerRatio?: number;
  cornerPoints?: number;
  cornerGreenPoints?: number;
};

export type GreenScreenValidationResult = {
  isValid: boolean;
  reason?: GreenScreenRejectionReason;
  greenRatio: number;
  sampledPoints: number;
  greenPoints: number;
  isTransparent: boolean;
  composition: "1:1" | "16:9";
  details?: GreenScreenValidationDetails;
};

export type GreenScreenValidationOptions = {
  /**
   * Target canvas composition.
   * - "1:1": Square composition (samples outer borders and 4 corners).
   * - "16:9": Widescreen composition (samples top 1/3 headroom, side borders, and 4 corners).
   * - "auto": Inferred automatically from image aspect ratio (width / height >= 1.4 -> "16:9", else "1:1").
   * Default is "auto".
   */
  composition?: GreenScreenCanvasComposition;

  /**
   * Minimum ratio of sampled points that must satisfy chroma green criteria (0.0 to 1.0).
   * Default is 0.65 (65%).
   */
  minGreenRatio?: number;

  /**
   * Maximum allowed ratio of transparent pixels before rejecting for native transparency.
   * Default is 0.05.
   */
  transparencyThresholdRatio?: number;

  /**
   * Maximum allowed ratio of border pixels that can be transparent before rejecting.
   * Default is 0.15.
   */
  borderTransparencyThresholdRatio?: number;

  /**
   * Custom sampling stride step in pixels.
   * If omitted, automatically determined by image resolution.
   */
  sampleStep?: number;
};

/**
 * Evaluates whether a single pixel satisfies chroma-key green criteria.
 * Formula: g > r + 35 && g > b + 35 && g >= 120 (and opaque alpha >= 200).
 */
export function isChromaGreenPixel(r: number, g: number, b: number, a = 255): boolean {
  return a >= 200 && g > r + 35 && g > b + 35 && g >= 120;
}

/**
 * Resolves composition to either "1:1" or "16:9".
 */
export function resolveComposition(
  width: number,
  height: number,
  composition?: GreenScreenCanvasComposition,
): "1:1" | "16:9" {
  if (composition === "16:9" || composition === "1:1") {
    return composition;
  }
  return width / Math.max(height, 1) >= 1.4 ? "16:9" : "1:1";
}

/**
 * Detects if an image contains native alpha transparency in borders or general area.
 */
export function detectNativeTransparency(
  image: DecodedImage,
  options?: { thresholdRatio?: number; borderThresholdRatio?: number },
): boolean {
  const thresholdRatio = options?.thresholdRatio ?? 0.05;
  const borderThresholdRatio = options?.borderThresholdRatio ?? 0.15;

  if (hasNativeTransparency(image, thresholdRatio)) {
    return true;
  }

  const { width, height, data } = image;
  const totalPixels = width * height;
  if (totalPixels === 0) return false;

  let transparentPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] < 50) {
      transparentPixels++;
    }
  }

  let borderTransparent = 0;
  let borderTotal = 0;
  for (let x = 0; x < width; x++) {
    if (data[(0 * width + x) * 4 + 3] < 50) borderTransparent++;
    if (data[((height - 1) * width + x) * 4 + 3] < 50) borderTransparent++;
    borderTotal += 2;
  }
  for (let y = 1; y < height - 1; y++) {
    if (data[(y * width + 0) * 4 + 3] < 50) borderTransparent++;
    if (data[(y * width + (width - 1)) * 4 + 3] < 50) borderTransparent++;
    borderTotal += 2;
  }

  const overallRatio = transparentPixels / totalPixels;
  const borderRatio = borderTotal > 0 ? borderTransparent / borderTotal : 0;

  return overallRatio >= thresholdRatio || borderRatio >= borderThresholdRatio;
}

type Point = [number, number];

type RegionStats = {
  total: number;
  green: number;
};

function resolveSampleStep(size: number, customStep?: number): number {
  if (customStep && customStep > 0) return customStep;
  return size > 100 ? Math.max(1, Math.floor(size / 80)) : 1;
}

function evaluatePixelPoints(
  data: Uint8Array,
  width: number,
  points: Point[],
  visited: Uint8Array,
): RegionStats {
  let total = 0;
  let green = 0;

  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    total++;
    const pixelIdx = idx * 4;
    if (isChromaGreenPixel(data[pixelIdx], data[pixelIdx + 1], data[pixelIdx + 2], data[pixelIdx + 3])) {
      green++;
    }
  }

  return { total, green };
}

function collectCornerPoints(width: number, height: number): Point[] {
  const corners: Point[] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  const patchSize = Math.max(1, Math.min(3, Math.floor(Math.min(width, height) * 0.05)));
  for (let dy = 0; dy < patchSize; dy++) {
    for (let dx = 0; dx < patchSize; dx++) {
      corners.push([dx, dy]);
      corners.push([width - 1 - dx, dy]);
      corners.push([dx, height - 1 - dy]);
      corners.push([width - 1 - dx, height - 1 - dy]);
    }
  }

  return corners;
}

function sampleHeadroomPoints(width: number, headroomHeight: number, stepX: number, stepY: number): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < headroomHeight; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      points.push([x, y]);
    }
  }
  return points;
}

function sampleSideBorders(
  width: number,
  height: number,
  startY: number,
  borderWidth: number,
  stepX: number,
  stepY: number,
): Point[] {
  const points: Point[] = [];
  for (let y = startY; y < height; y += stepY) {
    for (let x = 0; x < borderWidth; x += stepX) {
      points.push([x, y]);
    }
    for (let x = width - borderWidth; x < width; x += stepX) {
      points.push([x, y]);
    }
  }
  return points;
}

function sampleSquareBorders(
  width: number,
  height: number,
  borderWidth: number,
  borderHeight: number,
  stepX: number,
  stepY: number,
): Point[] {
  const points: Point[] = [];

  // Top and bottom horizontal strips
  for (let y = 0; y < borderHeight; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      points.push([x, y]);
    }
  }
  for (let y = height - borderHeight; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      points.push([x, y]);
    }
  }

  // Left and right vertical middle strips
  for (let y = borderHeight; y < height - borderHeight; y += stepY) {
    for (let x = 0; x < borderWidth; x += stepX) {
      points.push([x, y]);
    }
    for (let x = width - borderWidth; x < width; x += stepX) {
      points.push([x, y]);
    }
  }

  return points;
}

function computeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
}

function decodeInput(input: Uint8Array | DecodedImage): DecodedImage | null {
  if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
    try {
      return decodePngToRgba(input);
    } catch {
      return null;
    }
  }
  if (input && typeof input.width === "number" && typeof input.height === "number" && input.data) {
    return input;
  }
  return null;
}

/**
 * Validates whether an image buffer is compliant with Chroma-Key Green standards.
 * Implements dual-layer validation:
 * 1. Native Transparency Guard: Rejects pre-matted or transparent background images.
 * 2. Chroma Green Coverage: Samples borders, corners, and headroom according to composition.
 * Subject color safe: Confines sampling strictly outside mascot subject regions.
 */
export function validateGreenScreen(
  input: Uint8Array | DecodedImage,
  options?: GreenScreenValidationOptions,
): GreenScreenValidationResult {
  const decoded = decodeInput(input);
  if (!decoded) {
    return {
      isValid: false,
      reason: "invalid_image",
      greenRatio: 0,
      sampledPoints: 0,
      greenPoints: 0,
      isTransparent: false,
      composition: "1:1",
    };
  }

  const { width, height, data } = decoded;
  if (width <= 0 || height <= 0) {
    return {
      isValid: false,
      reason: "zero_dimensions",
      greenRatio: 0,
      sampledPoints: 0,
      greenPoints: 0,
      isTransparent: false,
      composition: "1:1",
    };
  }

  const composition = resolveComposition(width, height, options?.composition);

  // Layer 1: Native Transparency Check
  const isTransparent = detectNativeTransparency(decoded, {
    thresholdRatio: options?.transparencyThresholdRatio,
    borderThresholdRatio: options?.borderTransparencyThresholdRatio,
  });

  if (isTransparent) {
    return {
      isValid: false,
      reason: "native_transparency",
      greenRatio: 0,
      sampledPoints: 0,
      greenPoints: 0,
      isTransparent: true,
      composition,
    };
  }

  // Layer 2: Chroma Green Coverage Check
  const stepX = resolveSampleStep(width, options?.sampleStep);
  const stepY = resolveSampleStep(height, options?.sampleStep);
  const visited = new Uint8Array(width * height);
  const cornerPoints = collectCornerPoints(width, height);
  const cornerStats = evaluatePixelPoints(data, width, cornerPoints, visited);

  let totalPoints = cornerStats.total;
  let greenPoints = cornerStats.green;
  const details: GreenScreenValidationDetails = {
    cornerRatio: computeRatio(cornerStats.green, cornerStats.total),
    cornerPoints: cornerStats.total,
    cornerGreenPoints: cornerStats.green,
  };

  if (composition === "16:9") {
    const headroomHeight = Math.max(1, Math.floor(height / 3));
    const borderWidth = Math.max(2, Math.floor(width * 0.05));

    const headroomPoints = sampleHeadroomPoints(width, headroomHeight, stepX, stepY);
    const sidePoints = sampleSideBorders(width, height, headroomHeight, borderWidth, stepX, stepY);

    const headroomStats = evaluatePixelPoints(data, width, headroomPoints, visited);
    const sideStats = evaluatePixelPoints(data, width, sidePoints, visited);

    totalPoints += headroomStats.total + sideStats.total;
    greenPoints += headroomStats.green + sideStats.green;

    details.headroomRatio = computeRatio(headroomStats.green, headroomStats.total);
    details.headroomPoints = headroomStats.total;
    details.headroomGreenPoints = headroomStats.green;

    const totalBorderPoints = sideStats.total + cornerStats.total;
    const totalBorderGreen = sideStats.green + cornerStats.green;
    details.borderRatio = computeRatio(totalBorderGreen, totalBorderPoints);
    details.borderPoints = totalBorderPoints;
    details.borderGreenPoints = totalBorderGreen;
  } else {
    const borderWidth = Math.max(2, Math.floor(width * 0.05));
    const borderHeight = Math.max(2, Math.floor(height * 0.05));

    const borderPoints = sampleSquareBorders(width, height, borderWidth, borderHeight, stepX, stepY);
    const borderStats = evaluatePixelPoints(data, width, borderPoints, visited);

    totalPoints += borderStats.total;
    greenPoints += borderStats.green;

    const totalBorderPoints = borderStats.total + cornerStats.total;
    const totalBorderGreen = borderStats.green + cornerStats.green;
    details.borderRatio = computeRatio(totalBorderGreen, totalBorderPoints);
    details.borderPoints = totalBorderPoints;
    details.borderGreenPoints = totalBorderGreen;
  }

  const greenRatio = computeRatio(greenPoints, totalPoints);
  const minGreenRatio = options?.minGreenRatio ?? 0.65;
  const isValid = greenRatio >= minGreenRatio;

  return {
    isValid,
    reason: isValid ? undefined : "insufficient_green_chroma",
    greenRatio,
    sampledPoints: totalPoints,
    greenPoints,
    isTransparent: false,
    composition,
    details,
  };
}

/**
 * Asynchronous validator that normalizes any image format (WebP, JPEG) to PNG before validation.
 */
export async function validateGreenScreenNormalized(
  imageBytes: Uint8Array,
  options?: GreenScreenValidationOptions,
): Promise<GreenScreenValidationResult> {
  try {
    const pngBytes = await normalizeImageToPng(imageBytes);
    return validateGreenScreen(pngBytes, options);
  } catch {
    return {
      isValid: false,
      reason: "invalid_image",
      greenRatio: 0,
      sampledPoints: 0,
      greenPoints: 0,
      isTransparent: false,
      composition: "1:1",
    };
  }
}
