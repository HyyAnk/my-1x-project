import { copyFile } from "node:fs/promises";
import type { QuizAssetPlan, QuizPreviewLayoutId } from "@studio/shared";
import sharp, { type Sharp } from "sharp";
import type { RenderImageFormat } from "./imageOptimizerFormat.js";
import {
  readCachedOptimization,
  resolveOptimizationPlan,
  writeOptimizationSidecar,
  type RenderImageOptimizationPlan,
} from "./imageOptimizerPlan.js";

export { getOptimalAssetDimensions } from "./imageOptimizerDimensions.js";

type QuizAssetPurpose = QuizAssetPlan["assets"][number]["purpose"];

export interface OptimizeRenderImageOptions {
  sourcePath: string;
  targetPath: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png" | "avif" | "original";
  purpose?: QuizAssetPurpose | "choice_thumbnail" | "hero";
  layout?: QuizPreviewLayoutId;
  sourceFingerprint?: string;
  fit?: "cover" | "contain" | "inside";
}

export interface OptimizeRenderImageResult {
  optimized: boolean;
  skippedExisting: boolean;
  originalWidth?: number;
  originalHeight?: number;
  targetWidth?: number;
  targetHeight?: number;
  renderIdentity?: string;
}

function encodeAs(pipeline: Sharp, format: RenderImageFormat, quality: number): Sharp {
  if (format === "webp") return pipeline.webp({ quality, effort: 4 });
  if (format === "png") return pipeline.png({ compressionLevel: 7, adaptiveFiltering: true });
  if (format === "avif") return pipeline.avif({ quality, effort: 3 });
  return pipeline.jpeg({ quality, mozjpeg: true });
}

async function copyWithoutOptimizing(plan: RenderImageOptimizationPlan): Promise<OptimizeRenderImageResult> {
  await copyFile(plan.sourcePath, plan.targetPath);
  await writeOptimizationSidecar(plan);
  return { optimized: false, skippedExisting: false, renderIdentity: plan.identity };
}

async function optimizeRasterImage(plan: RenderImageOptimizationPlan): Promise<OptimizeRenderImageResult> {
  const instance = sharp(plan.sourcePath, { failOn: "none" });
  const metadata = await instance.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const needsResize = width > plan.maxWidth || height > plan.maxHeight;
  const original = { originalWidth: width, originalHeight: height };

  // Already within bounds and no format conversion requested: copy directly.
  if (width > 0 && height > 0 && !needsResize && !plan.isFormatConversion) {
    await copyFile(plan.sourcePath, plan.targetPath);
    await writeOptimizationSidecar(plan, width, height);
    return {
      optimized: false,
      skippedExisting: false,
      ...original,
      targetWidth: width,
      targetHeight: height,
      renderIdentity: plan.identity,
    };
  }

  const resized = needsResize
    ? instance.resize({ width: plan.maxWidth, height: plan.maxHeight, fit: plan.fit, withoutEnlargement: true })
    : instance;
  const outputInfo = await encodeAs(resized, plan.format, plan.quality).toFile(plan.targetPath);
  await writeOptimizationSidecar(plan, outputInfo.width, outputInfo.height);
  return {
    optimized: true,
    skippedExisting: false,
    ...original,
    targetWidth: outputInfo.width,
    targetHeight: outputInfo.height,
    renderIdentity: plan.identity,
  };
}

/**
 * Pre-resizes high-resolution AI generated images (1536x1024 / 2K / 4K)
 * to match target canvas dimensions before Chromium renders frames.
 * Parameter-aware: invalidates optimized copies when target dimensions, fit, or source change.
 */
export async function optimizeRenderImage(options: OptimizeRenderImageOptions): Promise<OptimizeRenderImageResult> {
  const plan = await resolveOptimizationPlan(options);
  const cached = await readCachedOptimization(plan);
  if (cached) return cached;
  if (!plan.isRasterImage) return copyWithoutOptimizing(plan);
  try {
    return await optimizeRasterImage(plan);
  } catch {
    // Fall back to direct copy if Sharp encounters an unsupported format or corrupted header
    return copyWithoutOptimizing(plan);
  }
}
