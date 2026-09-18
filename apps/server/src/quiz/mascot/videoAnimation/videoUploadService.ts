import path from "node:path";
import { computeVideoSourceFingerprint, type AnimationState } from "@studio/shared";
import { type AnimationStorageAdapter, AnimationStorageSecurityError } from "./adapters/animationStorageAdapter.js";
import { type FfmpegAdapter, type VideoMetadata, VideoProbeError } from "./adapters/ffmpegAdapter.js";

export class VideoUploadValidationError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "VideoUploadValidationError";
    this.code = code;
    this.details = details;
  }
}

export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"] as const;

export const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MIN_VIDEO_DURATION_MS = 1000; // 1 second
export const MAX_VIDEO_DURATION_MS = 15000; // 15 seconds
export const MIN_CANVAS_WIDTH = 640;
export const MIN_CANVAS_HEIGHT = 360;
export const MAX_CANVAS_WIDTH = 3840;
export const MAX_CANVAS_HEIGHT = 2160;

export interface UploadSourceVideoInput {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  attemptId: string | number;
  filename: string;
  buffer: Buffer;
  mimeType?: string;
}

export interface ValidatedVideoUploadResult {
  attemptId: string;
  attemptDir: string;
  sourceVideoPath: string;
  sourceVideoUrl: string;
  sourceVideoFingerprint: string;
  videoSha256: string;
  fileSizeBytes: number;
  metadata: VideoMetadata;
}

export interface VideoUploadService {
  validateAndStageSourceVideo: (input: UploadSourceVideoInput) => Promise<ValidatedVideoUploadResult>;
}

export function createVideoUploadService(storageAdapter: AnimationStorageAdapter, ffmpegAdapter: FfmpegAdapter): VideoUploadService {
  async function validateAndStageSourceVideo(input: UploadSourceVideoInput): Promise<ValidatedVideoUploadResult> {
    const { mascotId, styleId, state, slotIndex, attemptId, filename, buffer, mimeType } = input;

    // 1. Validate payload size
    if (!buffer || buffer.length === 0) {
      throw new VideoUploadValidationError("Uploaded video file is empty (0 bytes)", "FILE_EMPTY");
    }
    if (buffer.length > MAX_VIDEO_FILE_SIZE_BYTES) {
      throw new VideoUploadValidationError(
        `Uploaded video file size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of ${MAX_VIDEO_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
        "FILE_TOO_LARGE",
        { sizeBytes: buffer.length, maxSizeBytes: MAX_VIDEO_FILE_SIZE_BYTES },
      );
    }

    // 2. Validate filename and extension
    if (!filename || typeof filename !== "string") {
      throw new VideoUploadValidationError("Filename is required", "INVALID_FILE_EXTENSION");
    }
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])) {
      throw new VideoUploadValidationError(
        `Unsupported video file extension: "${ext}". Permitted extensions: ${ALLOWED_VIDEO_EXTENSIONS.join(", ")}`,
        "INVALID_FILE_EXTENSION",
        { extension: ext, allowed: ALLOWED_VIDEO_EXTENSIONS },
      );
    }

    // 3. Validate MIME type if provided
    if (mimeType) {
      const normalizedMime = mimeType.toLowerCase().trim();
      if (!ALLOWED_VIDEO_MIME_TYPES.includes(normalizedMime as (typeof ALLOWED_VIDEO_MIME_TYPES)[number])) {
        throw new VideoUploadValidationError(
          `Unsupported video MIME type: "${mimeType}". Permitted types: ${ALLOWED_VIDEO_MIME_TYPES.join(", ")}`,
          "INVALID_MIME_TYPE",
          { mimeType, allowed: ALLOWED_VIDEO_MIME_TYPES },
        );
      }
    }

    // 4. Safe attempt staging
    let stored;
    try {
      stored = await storageAdapter.saveAttemptSourceVideo(mascotId, styleId, state, slotIndex, attemptId, filename, buffer);
    } catch (err: unknown) {
      if (err instanceof AnimationStorageSecurityError) {
        throw new VideoUploadValidationError(err.message, err.code);
      }
      throw err;
    }

    // 5. Probe video metadata with FFmpeg
    let metadata: VideoMetadata;
    try {
      metadata = await ffmpegAdapter.probeVideoMetadata(stored.filePath);
    } catch (err: unknown) {
      if (err instanceof VideoProbeError) {
        throw new VideoUploadValidationError(err.message, err.code);
      }
      throw new VideoUploadValidationError(`Failed to inspect video: ${(err as Error).message}`, "CORRUPTED_VIDEO_FILE");
    }

    // 6. Validate video duration
    if (metadata.durationMs < MIN_VIDEO_DURATION_MS) {
      throw new VideoUploadValidationError(
        `Video duration (${(metadata.durationMs / 1000).toFixed(2)}s) is shorter than minimum allowed (${MIN_VIDEO_DURATION_MS / 1000}s)`,
        "INVALID_DURATION",
        { durationMs: metadata.durationMs, minDurationMs: MIN_VIDEO_DURATION_MS },
      );
    }
    if (metadata.durationMs > MAX_VIDEO_DURATION_MS) {
      throw new VideoUploadValidationError(
        `Video duration (${(metadata.durationMs / 1000).toFixed(2)}s) exceeds maximum allowed (${MAX_VIDEO_DURATION_MS / 1000}s)`,
        "INVALID_DURATION",
        { durationMs: metadata.durationMs, maxDurationMs: MAX_VIDEO_DURATION_MS },
      );
    }

    // 7. Validate video dimensions & 16:9 aspect ratio
    const { width, height } = metadata;
    if (width < MIN_CANVAS_WIDTH || height < MIN_CANVAS_HEIGHT) {
      throw new VideoUploadValidationError(
        `Video dimensions (${width}x${height}) are below minimum permitted resolution (${MIN_CANVAS_WIDTH}x${MIN_CANVAS_HEIGHT})`,
        "INVALID_DIMENSIONS",
        { width, height, minWidth: MIN_CANVAS_WIDTH, minHeight: MIN_CANVAS_HEIGHT },
      );
    }
    if (width > MAX_CANVAS_WIDTH || height > MAX_CANVAS_HEIGHT) {
      throw new VideoUploadValidationError(
        `Video dimensions (${width}x${height}) exceed maximum permitted resolution (${MAX_CANVAS_WIDTH}x${MAX_CANVAS_HEIGHT})`,
        "INVALID_DIMENSIONS",
        { width, height, maxWidth: MAX_CANVAS_WIDTH, maxHeight: MAX_CANVAS_HEIGHT },
      );
    }

    const aspectRatio = width / height;
    // Expected 16/9 = 1.7777... Accept tolerance 1.70 to 1.85
    if (aspectRatio < 1.7 || aspectRatio > 1.85) {
      throw new VideoUploadValidationError(
        `Video aspect ratio (${aspectRatio.toFixed(3)}) is not 16:9 widescreen (${width}x${height})`,
        "INVALID_DIMENSIONS",
        { width, height, aspectRatio: Number(aspectRatio.toFixed(3)), targetAspectRatio: 1.778 },
      );
    }

    // 8. Compute deterministic source video fingerprint
    const sourceVideoFingerprint = computeVideoSourceFingerprint({
      videoSha256: stored.sha256,
      durationMs: metadata.durationMs,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      fileSizeBytes: stored.byteLength,
    });

    const attemptDir = storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);

    return {
      attemptId: String(attemptId),
      attemptDir,
      sourceVideoPath: stored.filePath,
      sourceVideoUrl: stored.fileUrl,
      sourceVideoFingerprint,
      videoSha256: stored.sha256,
      fileSizeBytes: stored.byteLength,
      metadata,
    };
  }

  return {
    validateAndStageSourceVideo,
  };
}
