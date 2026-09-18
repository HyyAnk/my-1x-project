import fs from "node:fs/promises";
import path from "node:path";
import { REQUIRED_FPS, type AnimationState } from "@studio/shared";
import type { AnimationStorageAdapter } from "./adapters/animationStorageAdapter.js";
import { type FfmpegAdapter, type ExtractedFrame, type VideoMetadata, VideoExtractError } from "./adapters/ffmpegAdapter.js";

export class FrameExtractionError extends Error {
  public readonly code: string;

  constructor(message: string, code = "FRAME_EXTRACTION_FAILED") {
    super(message);
    this.name = "FrameExtractionError";
    this.code = code;
  }
}

export interface ExtractAttemptFramesParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  attemptId: string | number;
  filename?: string;
  targetFps?: number;
  targetFrameCount?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface FrameExtractionResult {
  frames: ExtractedFrame[];
  frameCount: number;
  fps: number;
  durationMs: number;
  outputDir: string;
  sourceMetadata: VideoMetadata;
}

export interface FrameExtractionServiceOptions {
  configuredTargetFps?: number;
}

export interface FrameExtractionService {
  extractAttemptFrames: (params: ExtractAttemptFramesParams) => Promise<FrameExtractionResult>;
}

export function createFrameExtractionService(
  storageAdapter: AnimationStorageAdapter,
  ffmpegAdapter: FfmpegAdapter,
  serviceOptions?: FrameExtractionServiceOptions,
): FrameExtractionService {
  async function extractAttemptFrames(params: ExtractAttemptFramesParams): Promise<FrameExtractionResult> {
    const {
      mascotId,
      styleId,
      state,
      slotIndex,
      attemptId,
      filename = "source.mp4",
      targetFps: paramTargetFps,
      targetFrameCount: paramTargetFrameCount,
      signal,
      timeoutMs,
    } = params;

    // 1. Resolve source video path
    let sourceVideoPath = storageAdapter.getAttemptSourceVideoPath(mascotId, styleId, state, slotIndex, attemptId, filename);

    try {
      await fs.stat(sourceVideoPath);
    } catch {
      // If default filename not found, search attempt directory for staged video
      const attemptDir = storageAdapter.getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);
      try {
        const files = await fs.readdir(attemptDir);
        const candidate = files.find((f) => {
          const lower = f.toLowerCase();
          return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm");
        });
        if (candidate) {
          sourceVideoPath = path.join(attemptDir, candidate);
        }
      } catch {
        // Ignore directory read error; will fail on stat below
      }
    }

    try {
      const stats = await fs.stat(sourceVideoPath);
      if (stats.size === 0) {
        throw new FrameExtractionError(`Source video file is empty: ${sourceVideoPath}`, "FILE_EMPTY");
      }
    } catch (err: unknown) {
      if (err instanceof FrameExtractionError) throw err;
      throw new FrameExtractionError(`Source video file does not exist at expected path: ${sourceVideoPath}`, "SOURCE_FILE_NOT_FOUND");
    }

    // 2. Resolve destination frames directory
    const outputDir = storageAdapter.getAttemptFramesDir(mascotId, styleId, state, slotIndex, attemptId, "source");
    await fs.mkdir(outputDir, { recursive: true });

    // 3. Probe source metadata
    let sourceMetadata: VideoMetadata;
    try {
      sourceMetadata = await ffmpegAdapter.probeVideoMetadata(sourceVideoPath);
    } catch (err: unknown) {
      throw new FrameExtractionError(`Failed to probe source video: ${(err as Error).message}`, "CORRUPTED_VIDEO_FILE");
    }

    // Determine target FPS: explicit param > service options > source probed FPS > fallback REQUIRED_FPS
    const targetFps = paramTargetFps ?? serviceOptions?.configuredTargetFps ?? (sourceMetadata.fps > 0 ? sourceMetadata.fps : REQUIRED_FPS);

    // Determine target frame count: explicit param > computed from duration & targetFps
    const targetFrameCount = paramTargetFrameCount ?? Math.max(1, Math.round((sourceMetadata.durationMs / 1000) * targetFps));

    // 4. Extract sequential frames via adapter
    let extractionResult;
    try {
      extractionResult = await ffmpegAdapter.extractFrames({
        sourceVideoPath,
        outputDir,
        fps: targetFps,
        frameCount: targetFrameCount,
        signal,
        timeoutMs,
      });
    } catch (err: unknown) {
      if (err instanceof VideoExtractError) {
        throw new FrameExtractionError(err.message, err.code);
      }
      throw new FrameExtractionError(`Unexpected error during frame extraction: ${(err as Error).message}`, "COMMAND_FAILED");
    }

    // 5. Strict sequential frame validation
    const { frames } = extractionResult;
    if (frames.length !== targetFrameCount) {
      throw new FrameExtractionError(
        `Frame extraction produced ${frames.length} frames, but exactly ${targetFrameCount} are required.`,
        "INSUFFICIENT_FRAMES",
      );
    }

    for (let i = 0; i < targetFrameCount; i++) {
      const expectedIndex = i + 1;
      const frame = frames[i];
      if (!frame || frame.frameIndex !== expectedIndex) {
        throw new FrameExtractionError(
          `Discontinuous frame sequence detected at position ${i} (expected index ${expectedIndex}, got ${frame?.frameIndex}).`,
          "DISCONTINUOUS_FRAMES",
        );
      }
    }

    const calculatedDurationMs = Math.round(frames.length * (1000 / targetFps));

    return {
      frames,
      frameCount: frames.length,
      fps: targetFps,
      durationMs: calculatedDurationMs,
      outputDir,
      sourceMetadata,
    };
  }

  return {
    extractAttemptFrames,
  };
}
