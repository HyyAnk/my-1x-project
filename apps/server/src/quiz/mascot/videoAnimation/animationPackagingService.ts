import fs from "node:fs/promises";
import path from "node:path";
import type { AnimationStorageAdapter } from "./adapters/animationStorageAdapter.js";
import { createFrameRegistrationService, type FrameRegistrationService } from "./frameRegistrationService.js";
import { createFfmpegAdapter, type FfmpegAdapter } from "./adapters/ffmpegAdapter.js";
import {
  type AnimationPackagingServiceOptions,
  type PackageAttemptAnimationParams,
  type PackageAnimationResult,
  type AnimationPackagingService,
  verifyAndCollectMattedFrames,
  calculateContentCrop,
  stitchAtlasGrid,
  renderPreviewThumbnails,
  calculateFpsAndDuration,
  resolveEffectiveSourceFingerprint,
  buildAnimationManifest,
  loadAndValidateAttemptManifest,
} from "./packaging/index.js";

export * from "./packaging/index.js";

/**
 * Creates AnimationPackagingService coordinating registration, WebM encoding, atlas stitching, and manifest building.
 */
export function createAnimationPackagingService(
  storageAdapter: AnimationStorageAdapter,
  optionsOrRegService?: AnimationPackagingServiceOptions | FrameRegistrationService,
  maybeFfmpegAdapter?: FfmpegAdapter,
): AnimationPackagingService {
  let regService: FrameRegistrationService;
  let ffmpegAdapter: FfmpegAdapter;

  if (optionsOrRegService && "computeAttemptRegistration" in optionsOrRegService) {
    regService = optionsOrRegService;
    ffmpegAdapter = maybeFfmpegAdapter ?? createFfmpegAdapter();
  } else {
    const opts = (optionsOrRegService as AnimationPackagingServiceOptions) || {};
    regService = opts.registrationService ?? createFrameRegistrationService(storageAdapter);
    ffmpegAdapter = opts.ffmpegAdapter ?? maybeFfmpegAdapter ?? createFfmpegAdapter();
  }

  async function packageAttemptAnimation(params: PackageAttemptAnimationParams): Promise<PackageAnimationResult> {
    params.signal?.throwIfAborted();
    const {
      mascotId,
      styleId,
      state,
      slotIndex,
      attemptId,
      sourceVideoFingerprint,
      recipeId = `${mascotId}_${styleId}_${state}_${slotIndex}`,
      cropToContent = true,
      fps: requestedFps,
      durationMs: requestedDurationMs,
      frameCount: requestedFrameCount,
    } = params;

    const attemptDir = storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);
    const mattedFramesDir = storageAdapter.getAttemptFramesDir(mascotId, styleId, state, slotIndex, attemptId, "matted");

    const { mattedFramePaths, targetCount } = await verifyAndCollectMattedFrames(mattedFramesDir, requestedFrameCount);

    const reg = await regService.computeAttemptRegistration({
      signal: params.signal,
      mascotId,
      styleId,
      state,
      slotIndex,
      attemptId,
      subDir: "matted",
      frameCount: targetCount,
    });

    const cropBounds = calculateContentCrop({
      cropToContent,
      commonBounds: reg.commonBounds,
      commonPivot: reg.commonPivot,
      canvas: reg.canvas,
      fallbackRegistration: reg.registration,
    });

    const { fps, durationMs, frameDurationMs } = calculateFpsAndDuration({
      targetCount,
      requestedFps,
      requestedDurationMs,
    });

    const outputWebmPath = path.join(attemptDir, "video_transparent.webm");
    await ffmpegAdapter.encodeFramesToTransparentWebm({
      signal: params.signal,
      framesDir: mattedFramesDir,
      outputWebmPath,
      fps,
      framePattern: "frame_%03d.png",
      timeoutMs: Math.max(300_000, targetCount * 2000),
    });

    const atlasResult = await stitchAtlasGrid({
      signal: params.signal,
      attemptDir,
      mattedFramePaths,
      targetCount,
      cellWidth: cropBounds.cellWidth,
      cellHeight: cropBounds.cellHeight,
      canvasWidth: reg.canvas.width,
      canvasHeight: reg.canvas.height,
      cropX: cropBounds.cropX,
      cropY: cropBounds.cropY,
      cropToContent,
      frameDurationMs,
    });

    const { previewPath } = await renderPreviewThumbnails({
      signal: params.signal,
      attemptDir,
      firstFramePath: mattedFramePaths[0],
      cropX: cropBounds.cropX,
      cropY: cropBounds.cropY,
      cellWidth: cropBounds.cellWidth,
      cellHeight: cropBounds.cellHeight,
      canvasWidth: reg.canvas.width,
      canvasHeight: reg.canvas.height,
      cropToContent,
    });

    const effectiveSourceFingerprint = await resolveEffectiveSourceFingerprint(attemptDir, sourceVideoFingerprint, recipeId);

    const { manifest, processingFingerprint } = buildAnimationManifest({
      state,
      recipeId,
      styleId,
      slotIndex,
      targetCount,
      fps,
      durationMs,
      atlasManifestInfo: atlasResult.atlasManifestInfo,
      frameRects: atlasResult.frameRects,
      sequenceRegistration: cropBounds.sequenceRegistration,
      effectiveSourceFingerprint,
      sourceVideoFingerprint,
      atlasChecksum: atlasResult.atlasChecksum,
    });

    const manifestPath = path.join(attemptDir, "manifest.json");
    params.signal?.throwIfAborted();
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    return {
      manifest,
      manifestPath,
      atlasPath: atlasResult.atlasPath,
      contactSheetPath: atlasResult.contactSheetPath,
      transparentVideoPath: outputWebmPath,
      previewPath,
      mattedFramePaths,
      processingFingerprint,
      atlasChecksum: atlasResult.atlasChecksum,
    };
  }

  return { packageAttemptAnimation, loadAndValidateAttemptManifest };
}
