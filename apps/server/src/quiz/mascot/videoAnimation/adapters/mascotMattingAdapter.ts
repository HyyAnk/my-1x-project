import { createMattingWorkerSession } from "./mattingWorkerSession.js";
import type { MattingSession } from "./mattingWorker.types.js";
import {
  decodePngToRgba,
  encodeRgbaToPng,
  removeImageBackgroundRgba,
  hasNativeTransparency,
  cleanupTransparentImage,
  type MattingOptions,
  type DecodedImage,
} from "../../../../utils/imageMatting.js";

export class MascotMattingError extends Error {
  public readonly code: string;

  constructor(message: string, code = "FRAME_MATTING_FAILED") {
    super(message);
    this.name = "MascotMattingError";
    this.code = code;
  }
}

export interface FrameAlphaDiagnostics {
  hiddenRgbDetected: boolean;
  hiddenRgbPixelsZeroed: number;
  residualBackgroundRatio: number;
  holesDetected: boolean;
  edgeClippingDetected: boolean;
  transparentPixels: number;
  opaquePixels: number;
  translucentPixels: number;
  contentBounds: {
    x: number;
    y: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  alphaMean: number;
}

export interface MatteFrameInput {
  imageBytes: Uint8Array;
  options?: MattingOptions;
  frameIndex?: number;
}

export interface MatteFrameResult {
  imageBytes: Uint8Array;
  width: number;
  height: number;
  diagnostics: FrameAlphaDiagnostics;
}

export type FixtureMatteHandler = (input: MatteFrameInput) => Promise<MatteFrameResult>;

export interface MascotMattingAdapterOptions {
  defaultOptions?: MattingOptions;
  fixtureHandler?: FixtureMatteHandler | null;
}

export interface MascotMattingAdapter {
  createSession?: (signal?: AbortSignal) => MattingSession;
  matteFrame: (input: MatteFrameInput) => Promise<MatteFrameResult>;
}

/**
 * Zeroes out RGB values wherever alpha < 5 to prevent color bleed / halo fringing,
 * and extracts comprehensive alpha diagnostics.
 */
function buildContentBounds(minX: number, maxX: number, minY: number, maxY: number) {
  const hasContent = maxX >= minX && maxY >= minY;
  return hasContent
    ? {
        x: minX,
        y: minY,
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      }
    : {
        x: 0,
        y: 0,
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      };
}

function detectBorderClipping(
  cleanedData: Uint8Array,
  width: number,
  height: number,
): { edgeClippingDetected: boolean; residualBackgroundRatio: number } {
  let edgeClippingDetected = false;
  let borderNonTransparent = 0;
  let borderTotal = 0;

  for (let x = 0; x < width; x++) {
    if (cleanedData[(0 * width + x) * 4 + 3] > 20) {
      edgeClippingDetected = true;
      borderNonTransparent++;
    }
    if (cleanedData[((height - 1) * width + x) * 4 + 3] > 20) {
      edgeClippingDetected = true;
      borderNonTransparent++;
    }
    borderTotal += 2;
  }

  for (let y = 1; y < height - 1; y++) {
    if (cleanedData[(y * width + 0) * 4 + 3] > 20) {
      edgeClippingDetected = true;
      borderNonTransparent++;
    }
    if (cleanedData[(y * width + (width - 1)) * 4 + 3] > 20) {
      edgeClippingDetected = true;
      borderNonTransparent++;
    }
    borderTotal += 2;
  }

  const residualBackgroundRatio = borderTotal > 0 ? Number((borderNonTransparent / borderTotal).toFixed(4)) : 0;
  return { edgeClippingDetected, residualBackgroundRatio };
}

function hasCardinalEnclosure(
  cleanedData: Uint8Array,
  width: number,
  x: number,
  y: number,
  contentBounds: { minX: number; maxX: number; minY: number; maxY: number },
): boolean {
  let hasNorth = false;
  let hasSouth = false;
  let hasWest = false;
  let hasEast = false;

  for (let ny = y - 1; ny >= contentBounds.minY; ny -= 4) {
    if (cleanedData[(ny * width + x) * 4 + 3] > 200) {
      hasNorth = true;
      break;
    }
  }
  for (let sy = y + 1; sy <= contentBounds.maxY; sy += 4) {
    if (cleanedData[(sy * width + x) * 4 + 3] > 200) {
      hasSouth = true;
      break;
    }
  }
  for (let wx = x - 1; wx >= contentBounds.minX; wx -= 4) {
    if (cleanedData[(y * width + wx) * 4 + 3] > 200) {
      hasWest = true;
      break;
    }
  }
  for (let ex = x + 1; ex <= contentBounds.maxX; ex += 4) {
    if (cleanedData[(y * width + ex) * 4 + 3] > 200) {
      hasEast = true;
      break;
    }
  }

  return hasNorth && hasSouth && hasWest && hasEast;
}

function detectEnclosedHoles(
  cleanedData: Uint8Array,
  width: number,
  height: number,
  hasContent: boolean,
  contentBounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number },
): boolean {
  if (!hasContent || contentBounds.width <= 20 || contentBounds.height <= 20) {
    return false;
  }

  const margin = 10;
  const startX = Math.max(0, contentBounds.minX + margin);
  const endX = Math.min(width - 1, contentBounds.maxX - margin);
  const startY = Math.max(0, contentBounds.minY + margin);
  const endY = Math.min(height - 1, contentBounds.maxY - margin);

  for (let y = startY; y <= endY; y += 2) {
    for (let x = startX; x <= endX; x += 2) {
      const idx = (y * width + x) * 4;
      if (cleanedData[idx + 3] < 5 && hasCardinalEnclosure(cleanedData, width, x, y, contentBounds)) {
        return true;
      }
    }
  }

  return false;
}

export function cleanupAlphaAndExtractDiagnostics(image: DecodedImage): {
  cleanedImage: DecodedImage;
  diagnostics: FrameAlphaDiagnostics;
} {
  const { width, height, data } = image;
  const cleanedData = new Uint8Array(data.length);
  cleanedData.set(data);

  let hiddenRgbDetected = false;
  let hiddenRgbPixelsZeroed = 0;
  let transparentPixels = 0;
  let opaquePixels = 0;
  let translucentPixels = 0;
  let totalNonZeroAlpha = 0;
  let nonZeroAlphaCount = 0;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = cleanedData[idx];
      const g = cleanedData[idx + 1];
      const b = cleanedData[idx + 2];
      const a = cleanedData[idx + 3];

      if (a < 5) {
        transparentPixels++;
        if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
          hiddenRgbDetected = true;
          hiddenRgbPixelsZeroed++;
          cleanedData[idx] = 0;
          cleanedData[idx + 1] = 0;
          cleanedData[idx + 2] = 0;
          cleanedData[idx + 3] = 0;
        }
      } else {
        totalNonZeroAlpha += a;
        nonZeroAlphaCount++;

        if (a >= 250) {
          opaquePixels++;
        } else {
          translucentPixels++;
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const contentBounds = buildContentBounds(minX, maxX, minY, maxY);
  const hasContent = maxX >= minX && maxY >= minY;
  const { edgeClippingDetected, residualBackgroundRatio } = detectBorderClipping(cleanedData, width, height);
  const holesDetected = detectEnclosedHoles(cleanedData, width, height, hasContent, contentBounds);

  const alphaMean = nonZeroAlphaCount > 0 ? Number((totalNonZeroAlpha / nonZeroAlphaCount).toFixed(2)) : 0;

  return {
    cleanedImage: { width, height, data: cleanedData },
    diagnostics: {
      hiddenRgbDetected,
      hiddenRgbPixelsZeroed,
      residualBackgroundRatio,
      holesDetected,
      edgeClippingDetected,
      transparentPixels,
      opaquePixels,
      translucentPixels,
      contentBounds,
      alphaMean,
    },
  };
}

export function createMascotMattingAdapter(options: MascotMattingAdapterOptions = {}): MascotMattingAdapter {
  async function matteFrame(input: MatteFrameInput): Promise<MatteFrameResult> {
    if (options.fixtureHandler) {
      return options.fixtureHandler(input);
    }

    const { imageBytes, options: mattingOptions = options.defaultOptions } = input;

    if (!imageBytes || imageBytes.length === 0) {
      throw new MascotMattingError("Image bytes are empty", "IMAGE_DATA_EMPTY");
    }

    let decoded: DecodedImage;
    try {
      decoded = decodePngToRgba(imageBytes);
    } catch (err: unknown) {
      throw new MascotMattingError(`Failed to decode PNG frame: ${(err as Error).message}`, "INVALID_IMAGE_FORMAT");
    }

    let mattedImage: DecodedImage;
    try {
      if (hasNativeTransparency(decoded)) {
        mattedImage = cleanupTransparentImage(decoded);
      } else {
        mattedImage = removeImageBackgroundRgba(decoded, mattingOptions);
      }
    } catch (err: unknown) {
      throw new MascotMattingError(`Matting algorithm error: ${(err as Error).message}`, "FRAME_MATTING_FAILED");
    }

    // Run strict hidden-RGB cleanup and diagnostics extraction
    const { cleanedImage, diagnostics } = cleanupAlphaAndExtractDiagnostics(mattedImage);

    // Fail if frame is 100% transparent (no character survived matting)
    if (diagnostics.contentBounds.width === 0 || diagnostics.contentBounds.height === 0) {
      throw new MascotMattingError(
        `Frame ${input.frameIndex ?? "unknown"} yielded completely transparent output (0 content pixels).`,
        "FRAME_MATTING_FAILED",
      );
    }

    let encodedPng: Uint8Array;
    try {
      encodedPng = encodeRgbaToPng(cleanedImage);
    } catch (err: unknown) {
      throw new MascotMattingError(`Failed to encode matted PNG: ${(err as Error).message}`, "ENCODING_FAILED");
    }

    return {
      imageBytes: encodedPng,
      width: cleanedImage.width,
      height: cleanedImage.height,
      diagnostics,
    };
  }

  return {
    matteFrame,
    ...(!options.fixtureHandler
      ? { createSession: (signal?: AbortSignal) => createMattingWorkerSession(signal, options.defaultOptions) }
      : {}),
  };
}
