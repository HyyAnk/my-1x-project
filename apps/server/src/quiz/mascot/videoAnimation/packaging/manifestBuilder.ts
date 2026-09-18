import fs from "node:fs/promises";
import path from "node:path";
import {
  MascotAnimationManifestSchema,
  computeVideoProcessingFingerprint,
  DEFAULT_LOOP_POLICY_BY_STATE,
  FRAME_DURATION_MS,
  REQUIRED_FPS,
  type MascotAnimationManifest,
} from "@studio/shared";
import { AnimationPackagingError } from "./packagingErrors.js";
import type {
  CalculateFpsAndDurationParams,
  FpsAndDurationResult,
  BuildAnimationManifestParams,
  BuildAnimationManifestResult,
} from "./packagingTypes.js";

/**
 * Calculates FPS, total duration, and per-frame duration for animation packaging.
 */
export function calculateFpsAndDuration(params: CalculateFpsAndDurationParams): FpsAndDurationResult {
  const { targetCount, requestedFps, requestedDurationMs } = params;
  const fps = requestedFps ?? (targetCount <= 36 ? REQUIRED_FPS : 24);
  const durationMs = requestedDurationMs ?? Math.round((targetCount / fps) * 1000);
  const frameDurationMs = targetCount <= 36 && fps === REQUIRED_FPS ? FRAME_DURATION_MS : (1 / fps) * 1000;
  return { fps, durationMs, frameDurationMs };
}

/**
 * Resolves effective source video fingerprint, checking attempt metadata or recipe ID fallback.
 */
export async function resolveEffectiveSourceFingerprint(
  attemptDir: string,
  sourceVideoFingerprint?: string,
  recipeId?: string,
): Promise<string> {
  let effectiveSourceFingerprint = sourceVideoFingerprint;
  if (!effectiveSourceFingerprint) {
    try {
      const attemptJsonPath = path.join(attemptDir, "attempt.json");
      const parsed: unknown = JSON.parse(await fs.readFile(attemptJsonPath, "utf-8"));
      if (typeof parsed === "object" && parsed !== null && "source_video_fingerprint" in parsed) {
        const fingerprint = (parsed as { source_video_fingerprint?: unknown }).source_video_fingerprint;
        if (typeof fingerprint === "string" && fingerprint.trim().length > 0) {
          effectiveSourceFingerprint = fingerprint;
        }
      }
    } catch {
      // Fallback if attempt.json not yet written
    }
  }
  return effectiveSourceFingerprint || recipeId || "";
}

/**
 * Collates metadata, computes processing fingerprint, and validates manifest schema.
 */
export function buildAnimationManifest(params: BuildAnimationManifestParams): BuildAnimationManifestResult {
  const {
    state,
    recipeId,
    styleId,
    slotIndex,
    targetCount,
    fps,
    durationMs,
    atlasManifestInfo,
    frameRects,
    sequenceRegistration,
    effectiveSourceFingerprint,
    sourceVideoFingerprint,
    atlasChecksum,
  } = params;

  const loopPolicy = DEFAULT_LOOP_POLICY_BY_STATE[state];
  const processingFingerprint = computeVideoProcessingFingerprint({
    sourceVideoFingerprint: effectiveSourceFingerprint,
    frameCount: targetCount,
    playbackFps: fps,
    loopMode: loopPolicy,
    registration: sequenceRegistration,
    frames: frameRects,
    atlasChecksum,
    transparentVideoUrl: "video_transparent.webm",
    alphaCodec: "vp9_alpha",
  });

  const manifest: MascotAnimationManifest = {
    version: 1,
    state,
    recipe_id: recipeId,
    style_id: styleId,
    slot_index: slotIndex,
    frame_count: targetCount,
    fps,
    duration_ms: durationMs,
    loop: state === "thinking",
    loop_policy: loopPolicy,
    ...(atlasManifestInfo ? { atlas: atlasManifestInfo } : {}),
    frames: frameRects,
    registration: sequenceRegistration,
    fingerprint: processingFingerprint,
    source_fingerprint: sourceVideoFingerprint,
    processing_fingerprint: processingFingerprint,
    transparent_video_url: "video_transparent.webm",
    alpha_codec: "vp9_alpha",
  };

  try {
    MascotAnimationManifestSchema.parse(manifest);
  } catch (err: unknown) {
    throw new AnimationPackagingError(`Constructed manifest failed schema validation: ${(err as Error).message}`, "SCHEMA_VIOLATION");
  }

  return { manifest, processingFingerprint };
}

/**
 * Loads and strictly validates an existing attempt manifest from a file or directory path.
 */
export async function loadAndValidateAttemptManifest(manifestPathOrDir: string): Promise<MascotAnimationManifest> {
  let manifestFilePath = manifestPathOrDir;
  try {
    const stat = await fs.stat(manifestPathOrDir);
    if (stat.isDirectory()) {
      manifestFilePath = path.join(manifestPathOrDir, "manifest.json");
    }
  } catch (err: unknown) {
    throw new AnimationPackagingError(`Cannot access path: ${(err as Error).message}`, "PATH_NOT_FOUND");
  }

  let manifestRaw: string;
  try {
    manifestRaw = await fs.readFile(manifestFilePath, "utf8");
  } catch (err: unknown) {
    throw new AnimationPackagingError(`Cannot read manifest file: ${(err as Error).message}`, "READ_FAILED");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(manifestRaw);
  } catch (err: unknown) {
    throw new AnimationPackagingError(`Malformed JSON in manifest: ${(err as Error).message}`, "INVALID_JSON");
  }

  let manifest: MascotAnimationManifest;
  try {
    manifest = MascotAnimationManifestSchema.parse(parsedJson);
  } catch (err: unknown) {
    throw new AnimationPackagingError(`Manifest schema error: ${(err as Error).message}`, "SCHEMA_VIOLATION");
  }

  const manifestDir = path.dirname(manifestFilePath);

  if (manifest.atlas) {
    const atlasFilePath = path.join(manifestDir, manifest.atlas.file_path || "atlas.png");
    try {
      const atlasStat = await fs.stat(atlasFilePath);
      if (atlasStat.size === 0) {
        throw new AnimationPackagingError(`Atlas file is empty: ${atlasFilePath}`, "ATLAS_EMPTY");
      }
    } catch (err: unknown) {
      if (err instanceof AnimationPackagingError) throw err;
      throw new AnimationPackagingError(`Atlas file missing: ${atlasFilePath}`, "ATLAS_MISSING");
    }

    const { width: aW, height: aH } = manifest.atlas;
    if (manifest.frames) {
      for (let i = 0; i < manifest.frames.length; i++) {
        const f = manifest.frames[i];
        if (f.x < 0 || f.y < 0 || f.x + f.width > aW || f.y + f.height > aH) {
          throw new AnimationPackagingError(
            `Frame ${i} rectangle [${f.x}, ${f.y}, ${f.width}x${f.height}] exceeds atlas bounds (${aW}x${aH})`,
            "OUT_OF_BOUNDS_FRAME",
          );
        }
      }
    }
  }

  if (manifest.transparent_video_url) {
    const videoFileName =
      manifest.transparent_video_url.startsWith("http") || manifest.transparent_video_url.startsWith("/")
        ? path.basename(manifest.transparent_video_url)
        : manifest.transparent_video_url;
    const videoFilePath = path.join(manifestDir, videoFileName);
    try {
      const videoStat = await fs.stat(videoFilePath);
      if (videoStat.size === 0) {
        throw new AnimationPackagingError(`Transparent video file is empty: ${videoFilePath}`, "VIDEO_EMPTY");
      }
    } catch (err: unknown) {
      if (err instanceof AnimationPackagingError) throw err;
      throw new AnimationPackagingError(`Transparent video file missing: ${videoFilePath}`, "VIDEO_MISSING");
    }
  }

  if (!manifest.atlas && !manifest.transparent_video_url) {
    throw new AnimationPackagingError("Manifest must specify either atlas or transparent_video_url", "SCHEMA_VIOLATION");
  }

  return manifest;
}
