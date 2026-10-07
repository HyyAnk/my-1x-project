import { copyFile, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  getQuizImageSlotGeometry,
  getQuizPreviewLayoutCapability,
  recommendImageSizing,
  isResolvedQuizLayoutId,
  type ResolvedQuizLayoutId,
  QUIZ_DEFAULT_ASSET_METRICS,
  QUIZ_DEFAULT_CHOICE_ASSET_METRICS,
  type QuizAssetPlan,
  type QuizLayoutAssetMetrics,
  type QuizPreviewLayoutId,
} from "@studio/shared";
import sharp from "sharp";
import { createRenderImageIdentity } from "./renderImageIdentity.js";

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

/**
 * Calculates optimal target dimensions based on asset purpose and visual layout,
 * delegating to layout-driven canonical sizing recommendations when layout is known.
 */
export function getOptimalAssetDimensions(
  purpose?: OptimizeRenderImageOptions["purpose"],
  layout?: QuizPreviewLayoutId,
): QuizLayoutAssetMetrics {
  if (purpose === "bridge_topic_item") {
    return { maxWidth: 640, maxHeight: 640, aspectRatio: "1:1" };
  }

  const isChoice = purpose === "choice_thumbnail" || purpose === "answer_option";

  if (layout && layout !== "baseline" && isResolvedQuizLayoutId(layout)) {
    const layoutId: ResolvedQuizLayoutId = layout;
    const purposeKind = isChoice ? "answer_option" : "hero_question_image";
    const geom = getQuizImageSlotGeometry({
      layoutId,
      purpose: purposeKind,
      presentation: "visual",
      choiceCount: 3,
      canvasAspectRatio: "16:9",
    });
    if (geom) {
      const rec = recommendImageSizing(geom);
      if (rec.ok) {
        return {
          maxWidth: rec.value.recommended.width,
          maxHeight: rec.value.recommended.height,
          aspectRatio: rec.value.aspectRatio,
        };
      }
    }
  }

  // Documented compatibility defaults when layout context is missing
  if (!layout) {
    return isChoice ? QUIZ_DEFAULT_CHOICE_ASSET_METRICS : QUIZ_DEFAULT_ASSET_METRICS;
  }

  const capability = getQuizPreviewLayoutCapability(layout);
  if (isChoice) {
    return capability?.metrics?.assets?.choice ?? QUIZ_DEFAULT_CHOICE_ASSET_METRICS;
  }

  return capability?.metrics?.assets?.question ?? capability?.metrics?.assets?.choice ?? QUIZ_DEFAULT_ASSET_METRICS;
}

/**
 * Pre-resizes high-resolution AI generated images (1536x1024 / 2K / 4K)
 * to match target canvas dimensions before Chromium renders frames.
 * Parameter-aware: invalidates optimized copies when target dimensions, fit, or source change.
 */
export async function optimizeRenderImage(options: OptimizeRenderImageOptions): Promise<OptimizeRenderImageResult> {
  const { sourcePath, targetPath, quality = 90, purpose, layout, fit = "inside" } = options;

  const defaultDims = getOptimalAssetDimensions(purpose, layout);
  const maxWidth = options.maxWidth ?? defaultDims.maxWidth;
  const maxHeight = options.maxHeight ?? defaultDims.maxHeight;

  let sourceFingerprint = options.sourceFingerprint;
  if (!sourceFingerprint) {
    try {
      const sourceBytes = await readFile(sourcePath);
      sourceFingerprint = createHash("sha256").update(sourceBytes).digest("hex");
    } catch {
      sourceFingerprint = path.basename(sourcePath);
    }
  }

  const sourceExt = path.extname(sourcePath).toLowerCase();
  const targetExt = path.extname(targetPath).toLowerCase();
  const isRasterImage = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff"].includes(sourceExt);

  const resolvedFormat: "webp" | "jpeg" | "png" | "avif" | "original" =
    options.format ??
    (targetExt === ".webp"
      ? "webp"
      : targetExt === ".jpg" || targetExt === ".jpeg"
        ? "jpeg"
        : targetExt === ".avif"
          ? "avif"
          : targetExt === ".png"
            ? "png"
            : "original");

  const effectiveTargetFormat =
    resolvedFormat === "original"
      ? (sourceExt === ".png" ? "png" : sourceExt === ".webp" ? "webp" : sourceExt === ".avif" ? "avif" : "jpeg")
      : resolvedFormat;

  const isFormatConversion =
    isRasterImage &&
    ((effectiveTargetFormat === "webp" && sourceExt !== ".webp") ||
      (effectiveTargetFormat === "jpeg" && sourceExt !== ".jpg" && sourceExt !== ".jpeg") ||
      (effectiveTargetFormat === "png" && sourceExt !== ".png") ||
      (effectiveTargetFormat === "avif" && sourceExt !== ".avif") ||
      (targetExt !== "" && targetExt !== sourceExt));

  const identity = createRenderImageIdentity({
    sourceFingerprint,
    targetBounds: { width: maxWidth, height: maxHeight },
    fit,
    quality,
    format: effectiveTargetFormat,
    optimizerVersion: 2,
  });

  const sidecarPath = `${targetPath}.identity.json`;

  // Check if target already exists with identical optimization parameters and is fresh
  try {
    const [sourceStat, targetStat, sidecarRaw] = await Promise.all([stat(sourcePath), stat(targetPath), readFile(sidecarPath, "utf-8")]);
    if (targetStat.size > 0 && targetStat.mtimeMs >= sourceStat.mtimeMs) {
      const sidecar = JSON.parse(sidecarRaw) as {
        identity?: string;
        targetWidth?: number;
        targetHeight?: number;
      };
      if (sidecar.identity === identity) {
        return {
          optimized: true,
          skippedExisting: true,
          targetWidth: sidecar.targetWidth,
          targetHeight: sidecar.targetHeight,
          renderIdentity: identity,
        };
      }
    }
  } catch {
    // Target or sidecar doesn't exist yet, proceed with optimization
  }

  const writeSidecar = async (targetWidth?: number, targetHeight?: number) => {
    try {
      await writeFile(
        sidecarPath,
        JSON.stringify({
          identity,
          sourceFingerprint,
          targetWidth,
          targetHeight,
          maxWidth,
          maxHeight,
          fit,
          quality,
          format: effectiveTargetFormat,
          optimizedAt: new Date().toISOString(),
        }),
        "utf-8",
      );
    } catch {
      // Non-blocking sidecar write failure
    }
  };

  if (!isRasterImage) {
    await copyFile(sourcePath, targetPath);
    await writeSidecar();
    return { optimized: false, skippedExisting: false, renderIdentity: identity };
  }

  try {
    const instance = sharp(sourcePath, { failOn: "none" });
    const metadata = await instance.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const needsResize = width > maxWidth || height > maxHeight;

    // If the image is already smaller than or equal to max bounds and no format conversion is requested, copy directly
    if (width > 0 && height > 0 && !needsResize && !isFormatConversion) {
      await copyFile(sourcePath, targetPath);
      await writeSidecar(width, height);
      return {
        optimized: false,
        skippedExisting: false,
        originalWidth: width,
        originalHeight: height,
        targetWidth: width,
        targetHeight: height,
        renderIdentity: identity,
      };
    }

    let pipeline = instance;
    if (needsResize) {
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit,
        withoutEnlargement: true,
      });
    }

    if (effectiveTargetFormat === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (effectiveTargetFormat === "png") {
      pipeline = pipeline.png({ compressionLevel: 7, adaptiveFiltering: true });
    } else if (effectiveTargetFormat === "avif") {
      pipeline = pipeline.avif({ quality, effort: 3 });
    } else {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    const outputInfo = await pipeline.toFile(targetPath);
    await writeSidecar(outputInfo.width, outputInfo.height);

    return {
      optimized: true,
      skippedExisting: false,
      originalWidth: width,
      originalHeight: height,
      targetWidth: outputInfo.width,
      targetHeight: outputInfo.height,
      renderIdentity: identity,
    };
  } catch {
    // Fall back to direct copy if Sharp encounters an unsupported format or corrupted header
    await copyFile(sourcePath, targetPath);
    await writeSidecar();
    return { optimized: false, skippedExisting: false, renderIdentity: identity };
  }
}
