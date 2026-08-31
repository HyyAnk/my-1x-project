import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  getQuizPreviewLayoutCapability,
  QUIZ_DEFAULT_ASSET_METRICS,
  QUIZ_DEFAULT_CHOICE_ASSET_METRICS,
  type QuizAssetPlan,
  type QuizLayoutAssetMetrics,
  type QuizPreviewLayoutId,
} from "@studio/shared";
import sharp from "sharp";

type QuizAssetPurpose = QuizAssetPlan["assets"][number]["purpose"];

export interface OptimizeRenderImageOptions {
  sourcePath: string;
  targetPath: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  purpose?: QuizAssetPurpose | "choice_thumbnail" | "hero";
  layout?: QuizPreviewLayoutId;
}

export interface OptimizeRenderImageResult {
  optimized: boolean;
  skippedExisting: boolean;
  originalWidth?: number;
  originalHeight?: number;
  targetWidth?: number;
  targetHeight?: number;
}

/**
 * Calculates optimal target dimensions based on asset purpose and visual layout,
 * applying a 1.25x - 1.5x sharpness multiplier for crisp high-DPI rendering.
 */
export function getOptimalAssetDimensions(
  purpose?: OptimizeRenderImageOptions["purpose"],
  layout?: QuizPreviewLayoutId,
): QuizLayoutAssetMetrics {
  if (purpose === "choice_thumbnail" || purpose === "answer_option") return QUIZ_DEFAULT_CHOICE_ASSET_METRICS;
  if (!layout) return QUIZ_DEFAULT_ASSET_METRICS;

  const capability = getQuizPreviewLayoutCapability(layout);
  const choiceAsset = capability.metrics.assets.choice;
  if (choiceAsset && capability.media.supported.includes("choice")) {
    return choiceAsset;
  }
  const questionAsset = capability.metrics.assets.question;
  if (questionAsset) {
    return questionAsset;
  }
  return QUIZ_DEFAULT_ASSET_METRICS;
}

/**
 * Pre-resizes high-resolution AI generated images (1536x1024 / 2K / 4K)
 * to match target canvas dimensions before Chromium renders frames.
 * This prevents Chromium from repeatedly downsampling large bitmaps on every single frame.
 */
export async function optimizeRenderImage(options: OptimizeRenderImageOptions): Promise<OptimizeRenderImageResult> {
  const { sourcePath, targetPath, quality = 90, purpose, layout } = options;

  const defaultDims = getOptimalAssetDimensions(purpose, layout);
  const maxWidth = options.maxWidth ?? defaultDims.maxWidth;
  const maxHeight = options.maxHeight ?? defaultDims.maxHeight;

  // Check if target already exists and is fresher than source
  try {
    const [sourceStat, targetStat] = await Promise.all([stat(sourcePath), stat(targetPath)]);
    if (targetStat.size > 0 && targetStat.mtimeMs >= sourceStat.mtimeMs) {
      return { optimized: true, skippedExisting: true };
    }
  } catch {
    // Target doesn't exist yet, proceed with optimization
  }

  const ext = path.extname(sourcePath).toLowerCase();
  const isRasterImage = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff"].includes(ext);

  if (!isRasterImage) {
    await copyFile(sourcePath, targetPath);
    return { optimized: false, skippedExisting: false };
  }

  try {
    const instance = sharp(sourcePath, { failOn: "none" });
    const metadata = await instance.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    // If the image is already smaller than or equal to max bounds, copy directly
    if (width > 0 && height > 0 && width <= maxWidth && height <= maxHeight) {
      await copyFile(sourcePath, targetPath);
      return {
        optimized: false,
        skippedExisting: false,
        originalWidth: width,
        originalHeight: height,
        targetWidth: width,
        targetHeight: height,
      };
    }

    let pipeline = instance.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (ext === ".png") {
      pipeline = pipeline.png({ compressionLevel: 7, adaptiveFiltering: true });
    } else if (ext === ".webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (ext === ".avif") {
      pipeline = pipeline.avif({ quality, effort: 3 });
    } else {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    await pipeline.toFile(targetPath);

    return {
      optimized: true,
      skippedExisting: false,
      originalWidth: width,
      originalHeight: height,
      targetWidth: Math.min(width, maxWidth),
      targetHeight: Math.min(height, maxHeight),
    };
  } catch {
    // Fall back to direct copy if Sharp encounters an unsupported format or corrupted header
    await copyFile(sourcePath, targetPath);
    return { optimized: false, skippedExisting: false };
  }
}
