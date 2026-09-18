import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import type { MascotAnimationManifestAtlas, MascotFrameRect } from "@studio/shared";
import type {
  AlphaBoundingBox,
  CalculateContentCropParams,
  CropBoundsResult,
  StitchAtlasGridParams,
  StitchAtlasResult,
  RenderPreviewThumbnailsParams,
} from "./packagingTypes.js";

/**
 * Computes non-transparent alpha bounding box from raw RGBA pixel data.
 */
export function findAlphaBoundingBox(pixels: Uint8Array, width: number, height: number, alphaThreshold = 0): AlphaBoundingBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Determines crop bounds and sequence registration based on common sequence bounds.
 */
export function calculateContentCrop(params: CalculateContentCropParams): CropBoundsResult {
  const { cropToContent, commonBounds, commonPivot, canvas, fallbackRegistration } = params;

  if (cropToContent && commonBounds.width > 0 && commonBounds.height > 0) {
    const { x: cropX, y: cropY, width: cellWidth, height: cellHeight } = commonBounds;
    return {
      cropX,
      cropY,
      cellWidth,
      cellHeight,
      sequenceRegistration: {
        source_width: cellWidth,
        source_height: cellHeight,
        content_bounds: { x: 0, y: 0, width: cellWidth, height: cellHeight },
        pivot: { x: commonPivot.x - cropX, y: commonPivot.y - cropY },
        offset_x: cropX,
        offset_y: cropY,
      },
    };
  }

  return {
    cropX: 0,
    cropY: 0,
    cellWidth: canvas.width,
    cellHeight: canvas.height,
    sequenceRegistration: fallbackRegistration,
  };
}

/**
 * Packs frames into a sprite sheet atlas for short animations (<= 36 frames)
 * or collates zero-offset frame rects for longer animations without large atlas images.
 */
export async function stitchAtlasGrid(params: StitchAtlasGridParams): Promise<StitchAtlasResult> {
  const {
    attemptDir,
    mattedFramePaths,
    targetCount,
    cellWidth,
    cellHeight,
    canvasWidth,
    canvasHeight,
    cropX,
    cropY,
    cropToContent,
    frameDurationMs,
  } = params;

  if (targetCount > 36) {
    const frameRects: MascotFrameRect[] = Array.from({ length: targetCount }, (_, i) => ({
      index: i,
      x: 0,
      y: 0,
      width: cellWidth,
      height: cellHeight,
      duration_ms: frameDurationMs,
    }));
    return { frameRects };
  }

  const cols = targetCount === 12 ? 4 : Math.ceil(Math.sqrt(targetCount));
  const rows = Math.ceil(targetCount / cols);
  const atlasWidth = cols * cellWidth;
  const atlasHeight = rows * cellHeight;
  const needsCrop = cropToContent && (cropX > 0 || cropY > 0 || cellWidth !== canvasWidth || cellHeight !== canvasHeight);

  const frameRects: MascotFrameRect[] = [];
  const compositeOperations: Array<{ input: Buffer; top: number; left: number }> = [];

  for (let i = 0; i < targetCount; i++) {
    const frameX = (i % cols) * cellWidth;
    const frameY = Math.floor(i / cols) * cellHeight;

    frameRects.push({
      index: i,
      x: frameX,
      y: frameY,
      width: cellWidth,
      height: cellHeight,
      duration_ms: frameDurationMs,
    });

    const rawBuffer = await fs.readFile(mattedFramePaths[i]);
    const processedBuffer = needsCrop
      ? await sharp(rawBuffer).extract({ left: cropX, top: cropY, width: cellWidth, height: cellHeight }).png().toBuffer()
      : rawBuffer;

    compositeOperations.push({ input: processedBuffer, left: frameX, top: frameY });
  }

  const atlasPath = path.join(attemptDir, "atlas.png");
  await sharp({
    create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(compositeOperations)
    .png()
    .toFile(atlasPath);

  const atlasChecksum = crypto
    .createHash("sha256")
    .update(await fs.readFile(atlasPath))
    .digest("hex");

  const contactSheetPath = path.join(attemptDir, "contact_sheet.png");
  await sharp({
    create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 24, g: 24, b: 27, alpha: 1 } },
  })
    .composite(compositeOperations)
    .png()
    .toFile(contactSheetPath);

  const atlasManifestInfo: MascotAnimationManifestAtlas = {
    file_path: "atlas.png",
    width: atlasWidth,
    height: atlasHeight,
    cols,
    rows,
  };

  return { atlasPath, contactSheetPath, atlasChecksum, atlasManifestInfo, frameRects };
}

/**
 * Renders representative preview images (frame 1, both PNG and WebP formats).
 */
export async function renderPreviewThumbnails(
  params: RenderPreviewThumbnailsParams,
): Promise<{ previewPath: string; previewWebpPath: string }> {
  const { attemptDir, firstFramePath, cropX, cropY, cellWidth, cellHeight, canvasWidth, canvasHeight, cropToContent } = params;

  const previewPath = path.join(attemptDir, "preview.png");
  const previewWebpPath = path.join(attemptDir, "preview.webp");
  const frame1Buffer = await fs.readFile(firstFramePath);

  const needsCrop = cropToContent && (cropX > 0 || cropY > 0 || cellWidth !== canvasWidth || cellHeight !== canvasHeight);
  const previewBuffer = needsCrop
    ? await sharp(frame1Buffer).extract({ left: cropX, top: cropY, width: cellWidth, height: cellHeight }).png().toBuffer()
    : frame1Buffer;

  await fs.writeFile(previewPath, previewBuffer);
  await sharp(previewBuffer).webp().toFile(previewWebpPath);

  return { previewPath, previewWebpPath };
}
