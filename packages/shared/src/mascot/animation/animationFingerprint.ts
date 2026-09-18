import { canonicalJsonStringify, sha256Hex } from "../../utils/contentHash.js";
import { REQUIRED_FPS, REQUIRED_FRAME_COUNT, type AnimationState } from "./animationConstants.js";
import type {
  AnimationContentFingerprintInput,
  AnimationFingerprintInput,
  VideoProcessingFingerprintInput,
  VideoSourceFingerprintInput,
} from "./animationTypes.js";

/**
 * Computes a deterministic SHA-256 source fingerprint for an animation generation attempt.
 * Guarantees that identical inputs produce identical hash IDs.
 */
export function computeAnimationSourceFingerprint(input: AnimationFingerprintInput): string {
  const canonicalPayload = {
    style_anchor: input.styleAnchorIdOrUrl.trim(),
    recipe_id: input.recipeId.trim(),
    prompt: input.prompt.trim(),
    frame_count: input.frameCount ?? REQUIRED_FRAME_COUNT,
    fps: input.fps ?? REQUIRED_FPS,
    provider_revision: input.providerRevision ?? "default",
    tool_version: input.toolVersion ?? "1.0.0",
    additional_params: input.additionalParams ?? {},
  };

  return sha256Hex(canonicalJsonStringify(canonicalPayload));
}

/**
 * Computes a deterministic SHA-256 content fingerprint for the generated animation artifact.
 * Seals the atlas checksum, frame rectangles, registration data, and recipe binding.
 */
export function computeAnimationContentFingerprint(input: AnimationContentFingerprintInput): string {
  const canonicalPayload = {
    recipe_id: (input.recipeId ?? "unknown").trim(),
    atlas_checksum: (input.atlasChecksumOrUrl ?? "").trim(),
    frames: input.frames.map((f) => ({
      index: f.index,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      duration_ms: f.duration_ms,
    })),
    registration: {
      source_width: input.registration.source_width,
      source_height: input.registration.source_height,
      content_bounds: {
        x: input.registration.content_bounds.x,
        y: input.registration.content_bounds.y,
        width: input.registration.content_bounds.width,
        height: input.registration.content_bounds.height,
      },
      pivot: {
        x: input.registration.pivot.x,
        y: input.registration.pivot.y,
      },
      offset_x: input.registration.offset_x,
      offset_y: input.registration.offset_y,
    },
    source_fingerprint: (input.sourceFingerprint ?? "").trim(),
  };

  return sha256Hex(canonicalJsonStringify(canonicalPayload));
}

/**
 * Computes a deterministic idempotency key for job scheduling and concurrency locking.
 */
export function computeAnimationJobIdempotencyKey(
  mascotId: string,
  styleId: string,
  state: AnimationState,
  slotIndex: number,
  fingerprint: string,
): string {
  const payload = {
    mascot_id: mascotId.trim(),
    style_id: styleId.trim(),
    state,
    slot_index: slotIndex,
    fingerprint: fingerprint.trim(),
  };

  return sha256Hex(canonicalJsonStringify(payload));
}

/**
 * Computes a deterministic SHA-256 fingerprint for an uploaded source video file.
 * Canonicalizes video hash, duration, canvas dimensions, and FPS.
 */
export function computeVideoSourceFingerprint(input: VideoSourceFingerprintInput): string {
  const canonicalPayload = {
    video_sha256: input.videoSha256.trim(),
    duration_ms: Math.round(input.durationMs),
    width: input.width,
    height: input.height,
    fps: input.fps !== undefined ? Number(input.fps.toFixed(3)) : undefined,
    file_size_bytes: input.fileSizeBytes,
  };

  return sha256Hex(canonicalJsonStringify(canonicalPayload));
}

/**
 * Computes a deterministic SHA-256 processing fingerprint for an animation revision.
 * Canonicalizes source video fingerprint, frame count, playback FPS, loop mode,
 * registration data, frame rectangles, and atlas checksum.
 */
export function computeVideoProcessingFingerprint(input: VideoProcessingFingerprintInput): string {
  const canonicalPayload: Record<string, unknown> = {
    source_video_fingerprint: input.sourceVideoFingerprint.trim(),
    frame_count: input.frameCount,
    playback_fps: input.playbackFps,
    loop_mode: input.loopMode,
    registration: {
      source_width: input.registration.source_width,
      source_height: input.registration.source_height,
      content_bounds: {
        x: input.registration.content_bounds.x,
        y: input.registration.content_bounds.y,
        width: input.registration.content_bounds.width,
        height: input.registration.content_bounds.height,
      },
      pivot: {
        x: input.registration.pivot.x,
        y: input.registration.pivot.y,
      },
      offset_x: input.registration.offset_x,
      offset_y: input.registration.offset_y,
    },
    frames: (input.frames ?? []).map((f) => ({
      index: f.index,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      duration_ms: f.duration_ms,
    })),
    atlas_checksum: (input.atlasChecksum ?? "").trim(),
  };

  if (input.transparentVideoUrl) {
    canonicalPayload.transparent_video_url = input.transparentVideoUrl.trim();
  }
  if (input.alphaCodec) {
    canonicalPayload.alpha_codec = input.alphaCodec.trim();
  }

  return sha256Hex(canonicalJsonStringify(canonicalPayload));
}
