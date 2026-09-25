import fs from "node:fs/promises";
import path from "node:path";
import { REQUIRED_FRAME_COUNT } from "@studio/shared";
import type { AnimationStorageAdapter } from "../adapters/animationStorageAdapter.js";
import { decodePngToRgba } from "../../../../utils/imageMatting.js";
import { FrameRegistrationError } from "./registrationErrors.js";
import type { ComputeAttemptRegistrationParams, FrameGeometryInput } from "./registrationTypes.js";

const FRAME_REGEX = /^frame_(\d+)\.png$/i;

async function validateFramesDirectory(framesDir: string): Promise<void> {
  try {
    const stats = await fs.stat(framesDir);
    if (!stats.isDirectory()) {
      throw new FrameRegistrationError(`Frames path is not a directory: ${framesDir}`, "FRAMES_DIR_NOT_FOUND");
    }
  } catch (err: unknown) {
    if (err instanceof FrameRegistrationError) throw err;
    throw new FrameRegistrationError(`Frames directory not found: ${framesDir}`, "FRAMES_DIR_NOT_FOUND");
  }
}

async function resolveTargetFrameCount(framesDir: string, frameCount?: number): Promise<number> {
  if (frameCount !== undefined) {
    return frameCount;
  }

  const detectedIndices: number[] = [];
  try {
    const entries = await fs.readdir(framesDir);
    for (const entry of entries) {
      const match = entry.match(FRAME_REGEX);
      if (match) {
        detectedIndices.push(parseInt(match[1], 10));
      }
    }
  } catch (err: unknown) {
    throw new FrameRegistrationError(`Cannot read frames directory at ${framesDir}: ${(err as Error).message}`, "FRAMES_DIR_NOT_FOUND");
  }

  if (detectedIndices.length > 0) {
    return Math.max(REQUIRED_FRAME_COUNT, ...detectedIndices);
  }

  return REQUIRED_FRAME_COUNT;
}

async function decodeFrameBounds(filePath: string, frameIndex: number, filename: string): Promise<FrameGeometryInput> {
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(filePath);
  } catch (err: unknown) {
    throw new FrameRegistrationError(`Cannot read frame ${frameIndex} at ${filePath}: ${(err as Error).message}`, "REQUIRED_FRAME_MISSING");
  }

  let decoded;
  try {
    decoded = decodePngToRgba(new Uint8Array(bytes));
  } catch (err: unknown) {
    throw new FrameRegistrationError(`Cannot decode frame ${frameIndex} PNG: ${(err as Error).message}`, "INVALID_IMAGE_FORMAT");
  }

  const { width, height, data } = decoded;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let alphaWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        alphaWeight += alpha;
        weightedX += x * alpha;
        weightedY += y * alpha;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new FrameRegistrationError(`Frame ${frameIndex} (${filename}) contains no visible pixels for registration`, "EMPTY_FRAME_BOUNDS");
  }

  return {
    frameIndex,
    width,
    height,
    centroid: { x: weightedX / alphaWeight, y: weightedY / alphaWeight },
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * Loads attempt frame images from disk and decodes individual frame content bounding boxes.
 */
export async function loadAttemptFrameGeometries(
  storageAdapter: AnimationStorageAdapter,
  params: ComputeAttemptRegistrationParams,
): Promise<{ frameGeometries: FrameGeometryInput[]; targetCount: number }> {
  const { mascotId, styleId, state, slotIndex, attemptId, subDir = "matted", frameCount } = params;

  const framesDir = storageAdapter.getAttemptFramesDir(mascotId, styleId, state, slotIndex, attemptId, subDir);

  await validateFramesDirectory(framesDir);
  const targetCount = await resolveTargetFrameCount(framesDir, frameCount);

  if (targetCount <= 0) {
    throw new FrameRegistrationError(`No frame images found in directory: ${framesDir}`, "REQUIRED_FRAME_MISSING");
  }

  const frameGeometries: FrameGeometryInput[] = [];

  for (let i = 1; i <= targetCount; i++) {
    const filename = `frame_${String(i).padStart(3, "0")}.png`;
    const filePath = path.join(framesDir, filename);
    const geometry = await decodeFrameBounds(filePath, i, filename);
    frameGeometries.push(geometry);
  }

  return { frameGeometries, targetCount };
}
