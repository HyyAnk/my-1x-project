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

  const identity = createRenderImageIdentity({
    sourceFingerprint,
    targetBounds: { width: maxWidth, height: maxHeight },
    fit,
    quality,
    optimizerVersion: 1,
  });

  const sidecarPath = `${targetPath}.identity.json`;

  // Check if target already exists with identical optimization parameters and is fresh
  try {
    const [sourceStat, targetStat, sidecarRaw] = await Promise.all([
      stat(sourcePath),
      stat(targetPath),
      readFile(sidecarPath, "utf-8"),
    ]);
    if (targetStat.size > 0 && targetStat.mtimeMs >= sourceStat.mtimeMs) {
      const sidecar = JSON.parse(sidecarRaw);
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

  const ext = path.extname(sourcePath).toLowerCase();
  const isRasterImage = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff"].includes(ext);

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

    // If the image is already smaller than or equal to max bounds, copy directly
    if (width > 0 && height > 0 && width <= maxWidth && height <= maxHeight) {
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
