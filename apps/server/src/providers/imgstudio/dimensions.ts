import { isSupportedImgStudioResolution, type ImgStudioResolution } from "@studio/shared";
import type { ImgStudioAspectRatio } from "./types.js";

export const IMGSTUDIO_SUPPORTED_ASPECT_RATIOS: readonly ImgStudioAspectRatio[] = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "2:3",
  "3:2",
] as const;

export const DEFAULT_IMGSTUDIO_ASPECT_RATIO: ImgStudioAspectRatio = "1:1";

/**
 * Resolves a normalized aspect ratio supported by the ImgStudio provider.
 * Falls back to the default ratio if the requested ratio is unsupported or omitted.
 */
export function resolveImgStudioAspectRatio(
  aspectRatio?: string,
  defaultRatio: ImgStudioAspectRatio = DEFAULT_IMGSTUDIO_ASPECT_RATIO,
): ImgStudioAspectRatio {
  if (!aspectRatio) {
    return defaultRatio;
  }
  const trimmed = aspectRatio.trim() as ImgStudioAspectRatio;
  if (IMGSTUDIO_SUPPORTED_ASPECT_RATIOS.includes(trimmed)) {
    return trimmed;
  }
  return defaultRatio;
}

/**
 * Resolves the generation resolution for a given ImgStudio model.
 * Respects max resolution limits defined in `@studio/shared` via `isSupportedImgStudioResolution`.
 * Defaults to '2K' unless the model only supports '1K'.
 */
export function resolveImgStudioResolution(
  modelId: string,
  requestedResolution?: string,
): ImgStudioResolution {
  const trimmed = requestedResolution?.trim().toUpperCase();
  if (trimmed && isSupportedImgStudioResolution(modelId, trimmed)) {
    return trimmed as ImgStudioResolution;
  }

  // If the model explicitly supports 2K, default to 2K.
  if (isSupportedImgStudioResolution(modelId, "2K")) {
    return "2K";
  }

  // If the model only supports 1K (e.g., Grok Image 2.0), fall back to 1K.
  if (isSupportedImgStudioResolution(modelId, "1K")) {
    return "1K";
  }

  // Default fallback for unknown or unlisted models
  return "2K";
}
