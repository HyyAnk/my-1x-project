import fs from "node:fs/promises";
import path from "node:path";
import { REQUIRED_FRAME_COUNT } from "@studio/shared";
import { AnimationPackagingError } from "./packagingErrors.js";

export interface VerifiedFramesResult {
  mattedFramePaths: string[];
  targetCount: number;
}

/**
 * Validates that matted frames exist, are non-empty, and determines total sequence frame count.
 */
export async function verifyAndCollectMattedFrames(mattedFramesDir: string, requestedFrameCount?: number): Promise<VerifiedFramesResult> {
  try {
    const stats = await fs.stat(mattedFramesDir);
    if (!stats.isDirectory()) {
      throw new AnimationPackagingError(`Matted frames directory not found: ${mattedFramesDir}`, "FRAMES_DIR_NOT_FOUND");
    }
  } catch (err: unknown) {
    if (err instanceof AnimationPackagingError) throw err;
    throw new AnimationPackagingError(`Cannot access matted frames directory: ${(err as Error).message}`, "FRAMES_DIR_NOT_FOUND");
  }

  const frameRegex = /^frame_(\d+)\.png$/i;
  const detectedIndices: number[] = [];
  try {
    const entries = await fs.readdir(mattedFramesDir);
    for (const entry of entries) {
      const match = entry.match(frameRegex);
      if (match) detectedIndices.push(parseInt(match[1], 10));
    }
  } catch (err: unknown) {
    throw new AnimationPackagingError(`Failed to read matted frames directory: ${(err as Error).message}`, "FRAME_MISSING");
  }

  let targetCount: number;
  if (requestedFrameCount !== undefined) {
    targetCount = requestedFrameCount;
  } else if (detectedIndices.length > 0) {
    targetCount = Math.max(REQUIRED_FRAME_COUNT, ...detectedIndices);
  } else {
    targetCount = REQUIRED_FRAME_COUNT;
  }

  if (targetCount <= 0) {
    throw new AnimationPackagingError(`Invalid frame count: ${targetCount}`, "FRAME_MISSING");
  }

  const mattedFramePaths: string[] = [];
  for (let i = 1; i <= targetCount; i++) {
    const filename = `frame_${String(i).padStart(3, "0")}.png`;
    const filePath = path.join(mattedFramesDir, filename);
    try {
      const stat = await fs.stat(filePath);
      if (stat.size === 0) {
        throw new AnimationPackagingError(`Matted frame is empty (0 bytes): ${filePath}`, "FRAME_EMPTY");
      }
      mattedFramePaths.push(filePath);
    } catch (err: unknown) {
      if (err instanceof AnimationPackagingError) throw err;
      throw new AnimationPackagingError(`Required matted frame ${filename} not found: ${(err as Error).message}`, "FRAME_MISSING");
    }
  }

  return { mattedFramePaths, targetCount };
}
