import fs from "node:fs/promises";
import path from "node:path";
import { REQUIRED_FRAME_COUNT, type AnimationState } from "@studio/shared";
import type { AnimationStorageAdapter } from "./adapters/animationStorageAdapter.js";
import { type MascotMattingAdapter, type FrameAlphaDiagnostics, MascotMattingError } from "./adapters/mascotMattingAdapter.js";
import type { MattingOptions } from "../../../utils/imageMatting.js";

export class FrameMattingServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code = "FRAME_MATTING_FAILED") {
    super(message);
    this.name = "FrameMattingServiceError";
    this.code = code;
  }
}

export interface FrameMattingServiceOptions {
  batchSize?: number;
}

export interface MatteAttemptFramesParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  attemptId: string | number;
  mattingOptions?: MattingOptions;
  frameCount?: number;
  batchSize?: number;
  signal?: AbortSignal;
}

export interface SequenceAlphaDiagnostics {
  alphaFlickerScore: number;
  alphaFlickerDetected: boolean;
  maxAreaJump: number;
  anyHolesDetected: boolean;
  anyEdgeClippingDetected: boolean;
  maxResidualBackgroundRatio: number;
  totalHiddenRgbZeroed: number;
  hiddenRgbDetected: boolean;
}

export interface MatteAttemptFramesResult {
  mattedFrames: string[];
  frameDiagnostics: FrameAlphaDiagnostics[];
  sequenceDiagnostics: SequenceAlphaDiagnostics;
  outputDir: string;
}

export interface FrameMattingService {
  matteAttemptFrames: (params: MatteAttemptFramesParams) => Promise<MatteAttemptFramesResult>;
}

export function computeSequenceAlphaDiagnostics(frameDiagnostics: FrameAlphaDiagnostics[]): SequenceAlphaDiagnostics {
  if (frameDiagnostics.length === 0) {
    return {
      alphaFlickerScore: 0,
      alphaFlickerDetected: false,
      maxAreaJump: 0,
      anyHolesDetected: false,
      anyEdgeClippingDetected: false,
      maxResidualBackgroundRatio: 0,
      totalHiddenRgbZeroed: 0,
      hiddenRgbDetected: false,
    };
  }

  let anyHolesDetected = false;
  let anyEdgeClippingDetected = false;
  let maxResidualBackgroundRatio = 0;
  let totalHiddenRgbZeroed = 0;
  let hiddenRgbDetected = false;

  const opaqueCounts = frameDiagnostics.map((d) => d.opaquePixels + Math.round(d.translucentPixels * 0.5));

  for (const diag of frameDiagnostics) {
    if (diag.holesDetected) anyHolesDetected = true;
    if (diag.edgeClippingDetected) anyEdgeClippingDetected = true;
    if (diag.hiddenRgbDetected) hiddenRgbDetected = true;
    totalHiddenRgbZeroed += diag.hiddenRgbPixelsZeroed;
    if (diag.residualBackgroundRatio > maxResidualBackgroundRatio) {
      maxResidualBackgroundRatio = diag.residualBackgroundRatio;
    }
  }

  // Calculate adjacent frame area variations
  let totalJump = 0;
  let maxAreaJump = 0;
  const jumpsCount = opaqueCounts.length - 1;

  for (let i = 0; i < jumpsCount; i++) {
    const a1 = opaqueCounts[i];
    const a2 = opaqueCounts[i + 1];
    const maxVal = Math.max(a1, a2, 1);
    const jump = Math.abs(a2 - a1) / maxVal;
    totalJump += jump;
    if (jump > maxAreaJump) {
      maxAreaJump = jump;
    }
  }

  const avgJump = jumpsCount > 0 ? totalJump / jumpsCount : 0;
  const alphaFlickerScore = Number(avgJump.toFixed(4));
  // An abrupt jump exceeding 40% between consecutive frames indicates flicker
  const alphaFlickerDetected = maxAreaJump > 0.4;

  return {
    alphaFlickerScore,
    alphaFlickerDetected,
    maxAreaJump: Number(maxAreaJump.toFixed(4)),
    anyHolesDetected,
    anyEdgeClippingDetected,
    maxResidualBackgroundRatio,
    totalHiddenRgbZeroed,
    hiddenRgbDetected,
  };
}

export function createFrameMattingService(
  storageAdapter: AnimationStorageAdapter,
  mattingAdapter: MascotMattingAdapter,
  serviceOptions?: FrameMattingServiceOptions,
): FrameMattingService {
  async function matteAttemptFrames(params: MatteAttemptFramesParams): Promise<MatteAttemptFramesResult> {
    const { mascotId, styleId, state, slotIndex, attemptId, mattingOptions, frameCount, batchSize, signal } = params;

    const sourceFramesDir = storageAdapter.getAttemptFramesDir(mascotId, styleId, state, slotIndex, attemptId, "source");
    const mattedFramesDir = storageAdapter.getAttemptFramesDir(mascotId, styleId, state, slotIndex, attemptId, "matted");

    // Verify source directory exists
    try {
      const stats = await fs.stat(sourceFramesDir);
      if (!stats.isDirectory()) {
        throw new FrameMattingServiceError(`Source frames path is not a directory: ${sourceFramesDir}`, "SOURCE_DIR_INVALID");
      }
    } catch (err: unknown) {
      if (err instanceof FrameMattingServiceError) throw err;
      throw new FrameMattingServiceError(`Source frames directory not found: ${sourceFramesDir}`, "SOURCE_FRAMES_NOT_FOUND");
    }

    const frameRegex = /^frame_(\d+)\.png$/i;
    const detectedIndices: number[] = [];
    try {
      const entries = await fs.readdir(sourceFramesDir);
      for (const entry of entries) {
        const match = entry.match(frameRegex);
        if (match) {
          detectedIndices.push(parseInt(match[1], 10));
        }
      }
    } catch (err: unknown) {
      throw new FrameMattingServiceError(`Failed to read source frames directory: ${(err as Error).message}`, "SOURCE_DIR_INVALID");
    }

    let targetCount: number;
    if (frameCount !== undefined) {
      targetCount = frameCount;
    } else if (detectedIndices.length > 0) {
      targetCount = Math.max(REQUIRED_FRAME_COUNT, ...detectedIndices);
    } else {
      targetCount = REQUIRED_FRAME_COUNT;
    }

    if (targetCount <= 0) {
      throw new FrameMattingServiceError(`Invalid frame count: ${targetCount}`, "REQUIRED_FRAME_MISSING");
    }

    await fs.mkdir(mattedFramesDir, { recursive: true });

    const mattedFramePaths: string[] = [];
    const frameDiagnostics: FrameAlphaDiagnostics[] = [];
    const effectiveBatchSize = Math.max(1, batchSize ?? serviceOptions?.batchSize ?? 16);

    // Process frames in chunked batches to prevent memory exhaustion on large sequences
    for (let batchStart = 1; batchStart <= targetCount; batchStart += effectiveBatchSize) {
      if (signal?.aborted) {
        throw new FrameMattingServiceError("Frame matting was cancelled", "ABORTED");
      }
      const batchEnd = Math.min(batchStart + effectiveBatchSize - 1, targetCount);
      const batchIndices: number[] = [];
      for (let i = batchStart; i <= batchEnd; i++) {
        batchIndices.push(i);
      }

      const batchResults = await Promise.all(
        batchIndices.map(async (frameIndex) => {
          const frameFilename = `frame_${String(frameIndex).padStart(3, "0")}.png`;
          const sourceFramePath = path.join(sourceFramesDir, frameFilename);
          const mattedFramePath = path.join(mattedFramesDir, frameFilename);

          let sourceBytes: Buffer;
          try {
            sourceBytes = await fs.readFile(sourceFramePath);
          } catch (err: unknown) {
            throw new FrameMattingServiceError(
              `Required frame ${frameIndex} (${frameFilename}) could not be read: ${(err as Error).message}`,
              "REQUIRED_FRAME_MISSING",
            );
          }

          let matteResult;
          try {
            matteResult = await mattingAdapter.matteFrame({
              imageBytes: new Uint8Array(sourceBytes),
              options: mattingOptions,
              frameIndex,
            });
          } catch (err: unknown) {
            // Enforce Core Invariant: One failed required frame fails the entire processing attempt
            if (err instanceof MascotMattingError) {
              throw new FrameMattingServiceError(`Frame ${frameIndex} failed matting: ${err.message}`, "FRAME_MATTING_FAILED");
            }
            throw new FrameMattingServiceError(
              `Frame ${frameIndex} encountered unexpected error: ${(err as Error).message}`,
              "FRAME_MATTING_FAILED",
            );
          }

          // Write matted PNG file to disk
          await fs.writeFile(mattedFramePath, Buffer.from(matteResult.imageBytes));
          return {
            mattedFramePath,
            diagnostics: matteResult.diagnostics,
          };
        }),
      );

      for (const res of batchResults) {
        mattedFramePaths.push(res.mattedFramePath);
        frameDiagnostics.push(res.diagnostics);
      }
    }

    const sequenceDiagnostics = computeSequenceAlphaDiagnostics(frameDiagnostics);

    return {
      mattedFrames: mattedFramePaths,
      frameDiagnostics,
      sequenceDiagnostics,
      outputDir: mattedFramesDir,
    };
  }

  return {
    matteAttemptFrames,
  };
}
