import path from "node:path";
import fs from "node:fs/promises";
import { VideoMediaError } from "./ffmpegErrors.js";
import { runFfmpegProcess } from "./ffmpegProcess.js";
import {
  DEFAULT_MEDIA_TIMEOUT_MS,
  type SpriteSheetOptions,
  type SpriteSheetResult,
  type ThumbnailOptions,
  type ThumbnailResult,
} from "./ffmpegTypes.js";

export interface MediaContext {
  ffmpegBinary?: string;
  timeoutMs?: number;
}

export async function generateThumbnail(options: ThumbnailOptions, context: MediaContext = {}): Promise<ThumbnailResult> {
  if (options.signal?.aborted) {
    throw new VideoMediaError("Thumbnail generation was cancelled", "ABORTED");
  }

  try {
    const stats = await fs.stat(options.sourceVideoPath);
    if (stats.size === 0) {
      throw new VideoMediaError(`Source video file is empty: ${options.sourceVideoPath}`, "FILE_EMPTY");
    }
  } catch (err: unknown) {
    if (err instanceof VideoMediaError) throw err;
    throw new VideoMediaError(`Cannot access source video: ${(err as Error).message}`, "SOURCE_FILE_NOT_FOUND");
  }

  try {
    await fs.mkdir(path.dirname(options.outputThumbnailPath), { recursive: true });
  } catch (err: unknown) {
    throw new VideoMediaError(`Cannot create output directory: ${(err as Error).message}`, "OUTPUT_DIR_INVALID");
  }

  const procTimeoutMs = options.timeoutMs ?? context.timeoutMs ?? DEFAULT_MEDIA_TIMEOUT_MS;
  const timestampSec = (options.timestampMs ?? 0) / 1000;

  const args = ["-y", "-ss", timestampSec.toFixed(3), "-i", options.sourceVideoPath, "-vframes", "1"];

  if (options.width && options.height) {
    args.push("-vf", `scale=${options.width}:${options.height}`);
  }
  args.push(options.outputThumbnailPath);

  await runFfmpegProcess({
    ffmpegBinary: context.ffmpegBinary,
    args,
    timeoutMs: procTimeoutMs,
    signal: options.signal,
    onAborted: () => new VideoMediaError("Thumbnail generation was cancelled", "ABORTED"),
    onTimeout: (ms) => new VideoMediaError(`Thumbnail generation timed out after ${ms}ms`, "TIMEOUT"),
    onCommandFailed: (msg) => new VideoMediaError(msg, "COMMAND_FAILED"),
  });

  try {
    const stats = await fs.stat(options.outputThumbnailPath);
    return {
      outputThumbnailPath: options.outputThumbnailPath,
      fileSizeBytes: stats.size,
      width: options.width ?? 0,
      height: options.height ?? 0,
    };
  } catch (err: unknown) {
    throw new VideoMediaError(`Failed to verify output thumbnail: ${(err as Error).message}`, "OUTPUT_FILE_MISSING");
  }
}

export async function generateSpriteSheet(options: SpriteSheetOptions, context: MediaContext = {}): Promise<SpriteSheetResult> {
  if (options.signal?.aborted) {
    throw new VideoMediaError("Sprite sheet generation was cancelled", "ABORTED");
  }

  try {
    await fs.mkdir(path.dirname(options.outputSheetPath), { recursive: true });
  } catch (err: unknown) {
    throw new VideoMediaError(`Cannot create output directory: ${(err as Error).message}`, "OUTPUT_DIR_INVALID");
  }

  const procTimeoutMs = options.timeoutMs ?? context.timeoutMs ?? DEFAULT_MEDIA_TIMEOUT_MS;

  const filters: string[] = [];
  if (options.frameWidth && options.frameHeight) {
    filters.push(`scale=${options.frameWidth}:${options.frameHeight}`);
  }
  filters.push(`tile=${options.columns}x${options.rows}`);

  const args = ["-y", "-i", options.inputFramesPattern, "-vf", filters.join(","), options.outputSheetPath];

  await runFfmpegProcess({
    ffmpegBinary: context.ffmpegBinary,
    args,
    timeoutMs: procTimeoutMs,
    signal: options.signal,
    onAborted: () => new VideoMediaError("Sprite sheet generation was cancelled", "ABORTED"),
    onTimeout: (ms) => new VideoMediaError(`Sprite sheet generation timed out after ${ms}ms`, "TIMEOUT"),
    onCommandFailed: (msg) => new VideoMediaError(msg, "COMMAND_FAILED"),
  });

  try {
    const stats = await fs.stat(options.outputSheetPath);
    return {
      outputSheetPath: options.outputSheetPath,
      fileSizeBytes: stats.size,
      columns: options.columns,
      rows: options.rows,
    };
  } catch (err: unknown) {
    throw new VideoMediaError(`Failed to verify sprite sheet output: ${(err as Error).message}`, "OUTPUT_FILE_MISSING");
  }
}
