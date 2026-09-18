import path from "node:path";
import fs from "node:fs/promises";
import { VideoEncodeError } from "./ffmpegErrors.js";
import { runFfmpegProcess } from "./ffmpegProcess.js";
import { type EncodeMp4Options, type EncodeMp4Result } from "./ffmpegTypes.js";

export interface Mp4EncoderContext {
  ffmpegBinary?: string;
  timeoutMs?: number;
}

export async function encodeMp4Video(options: EncodeMp4Options, context: Mp4EncoderContext = {}): Promise<EncodeMp4Result> {
  if (options.signal?.aborted) {
    throw new VideoEncodeError("MP4 encoding was cancelled", "ABORTED");
  }

  try {
    const stats = await fs.stat(options.inputPath);
    if (stats.size === 0) {
      throw new VideoEncodeError(`Input file is empty: ${options.inputPath}`, "FILE_EMPTY");
    }
  } catch (err: unknown) {
    if (err instanceof VideoEncodeError) throw err;
    throw new VideoEncodeError(`Cannot access input file: ${(err as Error).message}`, "INPUT_FILE_NOT_FOUND");
  }

  try {
    await fs.mkdir(path.dirname(options.outputMp4Path), { recursive: true });
  } catch (err: unknown) {
    throw new VideoEncodeError(`Cannot create output directory: ${(err as Error).message}`, "OUTPUT_DIR_INVALID");
  }

  const fps = options.fps ?? 24;
  const crf = options.crf ?? 23;
  const procTimeoutMs = options.timeoutMs ?? context.timeoutMs ?? 120_000;

  const args = ["-y", "-i", options.inputPath, "-r", String(fps)];

  const filterParts: string[] = [];
  if (options.width && options.height) {
    filterParts.push(`scale=${options.width}:${options.height}`);
  }
  filterParts.push("format=yuv420p");
  args.push("-vf", filterParts.join(","));

  args.push("-c:v", "libx264", "-crf", String(crf), "-preset", "medium", options.outputMp4Path);

  await runFfmpegProcess({
    ffmpegBinary: context.ffmpegBinary,
    args,
    timeoutMs: procTimeoutMs,
    signal: options.signal,
    onAborted: () => new VideoEncodeError("MP4 encoding was cancelled", "ABORTED"),
    onTimeout: (ms) => new VideoEncodeError(`MP4 encoding timed out after ${ms}ms`, "TIMEOUT"),
    onCommandFailed: (msg) => new VideoEncodeError(msg, "COMMAND_FAILED"),
  });

  try {
    const stats = await fs.stat(options.outputMp4Path);
    return {
      outputMp4Path: options.outputMp4Path,
      fileSizeBytes: stats.size,
      durationMs: 0,
      fps,
      codec: "h264",
    };
  } catch (err: unknown) {
    throw new VideoEncodeError(`Failed to verify encoded MP4 output: ${(err as Error).message}`, "OUTPUT_FILE_MISSING");
  }
}
