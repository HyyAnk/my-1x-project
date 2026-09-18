import fs from "node:fs/promises";
import sharp from "sharp";
import type { MascotFrameRect } from "@studio/shared";
import type { AnimationQaThresholds } from "./animationQaTypes.js";

const THUMB_SIZE = 16;

export interface FrameMetrics {
  alphaRatios: number[];
  adjacentDifferences: number[];
  duplicateCount: number;
  duplicateRatio: number;
  averageMotionDifference: number;
  seamDifference: number;
}

export async function resolveAtlasBuffer(atlas: { buffer?: Buffer; filePath?: string }): Promise<Buffer | null> {
  if (atlas.buffer && atlas.buffer.length > 0) return atlas.buffer;
  if (atlas.filePath) {
    try {
      return await fs.readFile(atlas.filePath);
    } catch {
      return null;
    }
  }
  return null;
}

export function computePixelDifference(bufA: Buffer, bufB: Buffer): number {
  const len = Math.min(bufA.length, bufB.length);
  if (len === 0) return 0;
  let diffSum = 0;
  for (let i = 0; i < len; i += 1) {
    diffSum += Math.abs(bufA[i] - bufB[i]);
  }
  return diffSum / (255 * len);
}

export async function extractFrameThumbnailsAndAlpha(
  atlasBuffer: Buffer,
  frames: MascotFrameRect[],
  atlasWidth: number,
  atlasHeight: number,
): Promise<{ thumbnails: Buffer[]; alphaRatios: number[] }> {
  const thumbnails: Buffer[] = [];
  const alphaRatios: number[] = [];

  for (const frame of frames) {
    const isInside =
      frame.x >= 0 &&
      frame.y >= 0 &&
      frame.width > 0 &&
      frame.height > 0 &&
      frame.x + frame.width <= atlasWidth &&
      frame.y + frame.height <= atlasHeight;

    if (!isInside) {
      thumbnails.push(Buffer.alloc(THUMB_SIZE * THUMB_SIZE * 4));
      alphaRatios.push(0);
      continue;
    }

    const { data: rawPixels, info } = await sharp(atlasBuffer)
      .extract({
        left: Math.round(frame.x),
        top: Math.round(frame.y),
        width: Math.round(frame.width),
        height: Math.round(frame.height),
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let nonTransparent = 0;
    const channels = info.channels;
    const totalPixels = info.width * info.height;

    for (let i = 0; i < rawPixels.length; i += channels) {
      const alpha = channels === 4 ? rawPixels[i + 3] : 255;
      if (alpha > 15) nonTransparent += 1;
    }
    alphaRatios.push(totalPixels > 0 ? nonTransparent / totalPixels : 0);

    const thumb = await sharp(atlasBuffer)
      .extract({
        left: Math.round(frame.x),
        top: Math.round(frame.y),
        width: Math.round(frame.width),
        height: Math.round(frame.height),
      })
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "fill" })
      .raw()
      .toBuffer();

    thumbnails.push(thumb);
  }

  return { thumbnails, alphaRatios };
}

export function analyzeFrameTransitions(thumbnails: Buffer[], alphaRatios: number[], thresholds: AnimationQaThresholds): FrameMetrics {
  const adjacentDifferences: number[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < thumbnails.length - 1; i += 1) {
    const diff = computePixelDifference(thumbnails[i], thumbnails[i + 1]);
    adjacentDifferences.push(diff);
    if (diff < thresholds.duplicatePixelDiffThreshold) {
      duplicateCount += 1;
    }
  }

  const comparisons = adjacentDifferences.length;
  const duplicateRatio = comparisons > 0 ? duplicateCount / comparisons : 0;
  const totalMotion = adjacentDifferences.reduce((sum, d) => sum + d, 0);
  const averageMotionDifference = comparisons > 0 ? totalMotion / comparisons : 0;

  const seamDifference = thumbnails.length >= 2 ? computePixelDifference(thumbnails[thumbnails.length - 1], thumbnails[0]) : 0;

  return {
    alphaRatios,
    adjacentDifferences,
    duplicateCount,
    duplicateRatio,
    averageMotionDifference,
    seamDifference,
  };
}
