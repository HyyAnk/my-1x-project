import { readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { createRenderImageIdentity } from "./renderImageIdentity.js";
import type { OptimizeRenderImageOptions, OptimizeRenderImageResult } from "./imageOptimizer.js";
import { getOptimalAssetDimensions } from "./imageOptimizerDimensions.js";
import {
  isRasterFormatConversion,
  isRasterImageExtension,
  resolveEffectiveTargetFormat,
  resolveRequestedFormat,
  type RenderImageFormat,
} from "./imageOptimizerFormat.js";

export type RenderImageFit = NonNullable<OptimizeRenderImageOptions["fit"]>;

export type RenderImageOptimizationPlan = {
  sourcePath: string;
  targetPath: string;
  sidecarPath: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  fit: RenderImageFit;
  sourceFingerprint: string;
  format: RenderImageFormat;
  isRasterImage: boolean;
  isFormatConversion: boolean;
  identity: string;
};

type RenderImageSidecar = { identity?: string; targetWidth?: number; targetHeight?: number };

async function resolveSourceFingerprint(sourcePath: string, provided: string | undefined): Promise<string> {
  if (provided) return provided;
  try {
    const sourceBytes = await readFile(sourcePath);
    return createHash("sha256").update(sourceBytes).digest("hex");
  } catch {
    return path.basename(sourcePath);
  }
}

/** Resolves bounds, output format and the parameter-aware identity used to invalidate optimized copies. */
export async function resolveOptimizationPlan(options: OptimizeRenderImageOptions): Promise<RenderImageOptimizationPlan> {
  const { sourcePath, targetPath, quality = 90, fit = "inside" } = options;
  const defaultDims = getOptimalAssetDimensions(options.purpose, options.layout);
  const maxWidth = options.maxWidth ?? defaultDims.maxWidth;
  const maxHeight = options.maxHeight ?? defaultDims.maxHeight;
  const sourceFingerprint = await resolveSourceFingerprint(sourcePath, options.sourceFingerprint);

  const sourceExt = path.extname(sourcePath).toLowerCase();
  const targetExt = path.extname(targetPath).toLowerCase();
  const isRasterImage = isRasterImageExtension(sourceExt);
  const format = resolveEffectiveTargetFormat(resolveRequestedFormat(options.format, targetExt), sourceExt);
  const identity = createRenderImageIdentity({
    sourceFingerprint,
    targetBounds: { width: maxWidth, height: maxHeight },
    fit,
    quality,
    format,
    optimizerVersion: 2,
  });
  return {
    sourcePath,
    targetPath,
    sidecarPath: `${targetPath}.identity.json`,
    maxWidth,
    maxHeight,
    quality,
    fit,
    sourceFingerprint,
    format,
    isRasterImage,
    isFormatConversion: isRasterFormatConversion({ isRasterImage, format, sourceExt, targetExt }),
    identity,
  };
}

/** Returns the cached result when the target is fresh and was produced with identical parameters. */
export async function readCachedOptimization(plan: RenderImageOptimizationPlan): Promise<OptimizeRenderImageResult | undefined> {
  try {
    const [sourceStat, targetStat, sidecarRaw] = await Promise.all([
      stat(plan.sourcePath),
      stat(plan.targetPath),
      readFile(plan.sidecarPath, "utf-8"),
    ]);
    if (targetStat.size <= 0 || targetStat.mtimeMs < sourceStat.mtimeMs) return undefined;
    const sidecar = JSON.parse(sidecarRaw) as RenderImageSidecar;
    if (sidecar.identity !== plan.identity) return undefined;
    return {
      optimized: true,
      skippedExisting: true,
      targetWidth: sidecar.targetWidth,
      targetHeight: sidecar.targetHeight,
      renderIdentity: plan.identity,
    };
  } catch {
    // Target or sidecar doesn't exist yet, proceed with optimization
    return undefined;
  }
}

export async function writeOptimizationSidecar(
  plan: RenderImageOptimizationPlan,
  targetWidth?: number,
  targetHeight?: number,
): Promise<void> {
  try {
    await writeFile(
      plan.sidecarPath,
      JSON.stringify({
        identity: plan.identity,
        sourceFingerprint: plan.sourceFingerprint,
        targetWidth,
        targetHeight,
        maxWidth: plan.maxWidth,
        maxHeight: plan.maxHeight,
        fit: plan.fit,
        quality: plan.quality,
        format: plan.format,
        optimizedAt: new Date().toISOString(),
      }),
      "utf-8",
    );
  } catch {
    // Non-blocking sidecar write failure
  }
}
