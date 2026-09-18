import path from "node:path";
import fs from "node:fs/promises";
import { VideoEncodeError } from "./ffmpegErrors.js";
import { runFfmpegProcess } from "./ffmpegProcess.js";
import {
  DEFAULT_ENCODE_WEBM_TIMEOUT_MS,
  type EncodeTransparentWebmOptions,
  type EncodeTransparentWebmResult,
  type FixtureEncodeWebmHandler,
} from "./ffmpegTypes.js";

export { encodeMp4Video, type Mp4EncoderContext } from "./ffmpegMp4Encoder.js";

export interface EncoderContext {
  ffmpegBinary?: string;
  timeoutMs?: number;
  fixtureEncodeWebmHandler?: FixtureEncodeWebmHandler | null;
}

export async function encodeTransparentWebm(
  encodeOptions: EncodeTransparentWebmOptions,
  context: EncoderContext = {},
): Promise<EncodeTransparentWebmResult> {
  if (context.fixtureEncodeWebmHandler) {
    if (encodeOptions.signal?.aborted) {
      throw new VideoEncodeError("WebM encoding was cancelled", "ABORTED");
    }
    return context.fixtureEncodeWebmHandler(encodeOptions);
  }

  if (encodeOptions.signal?.aborted) {
    throw new VideoEncodeError("WebM encoding was cancelled", "ABORTED");
  }

  // Verify frames directory exists
  try {
    const stats = await fs.stat(encodeOptions.framesDir);
    if (!stats.isDirectory()) {
      throw new VideoEncodeError(`Frames directory not found: ${encodeOptions.framesDir}`, "FRAMES_DIR_NOT_FOUND");
    }
  } catch (err: unknown) {
    if (err instanceof VideoEncodeError) throw err;
    throw new VideoEncodeError(`Frames directory not found: ${encodeOptions.framesDir}`, "FRAMES_DIR_NOT_FOUND");
  }

  const framePattern = encodeOptions.framePattern ?? "frame_%03d.png";
  let frameCount: number;
  try {
    const entries = await fs.readdir(encodeOptions.framesDir);
    const frameRegex = /^frame_\d+\.png$/i;
    const matched = entries.filter((f) => frameRegex.test(f));
    frameCount = matched.length;
    if (frameCount === 0) {
      const anyPng = entries.filter((f) => f.toLowerCase().endsWith(".png"));
      frameCount = anyPng.length;
      if (frameCount === 0) {
        throw new VideoEncodeError(`No frame images found in directory: ${encodeOptions.framesDir}`, "NO_FRAMES_FOUND");
      }
    }
  } catch (err: unknown) {
    if (err instanceof VideoEncodeError) throw err;
    throw new VideoEncodeError(`Cannot inspect frames directory: ${(err as Error).message}`, "FRAMES_DIR_NOT_FOUND");
  }

  try {
    await fs.mkdir(path.dirname(encodeOptions.outputWebmPath), { recursive: true });
  } catch (err: unknown) {
    throw new VideoEncodeError(`Cannot create output directory: ${(err as Error).message}`, "OUTPUT_DIR_INVALID");
  }

  const fps = encodeOptions.fps;
  if (!fps || !Number.isFinite(fps) || fps <= 0) {
    throw new VideoEncodeError(`Invalid FPS for encoding: ${fps}`, "INVALID_FPS");
  }

  const procTimeoutMs = encodeOptions.timeoutMs ?? context.timeoutMs ?? Math.max(DEFAULT_ENCODE_WEBM_TIMEOUT_MS, frameCount * 2000);
  const inputPattern = path.join(encodeOptions.framesDir, framePattern);

  const args = ["-y", "-framerate", String(fps), "-i", inputPattern];

  if (encodeOptions.width && encodeOptions.height) {
    args.push("-vf", `scale=${encodeOptions.width}:${encodeOptions.height}`);
  }

  args.push(
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuva420p",
    "-b:v",
    "0",
    "-crf",
    "28",
    "-deadline",
    "good",
    "-cpu-used",
    "4",
    "-row-mt",
    "1",
    "-threads",
    "0",
    "-auto-alt-ref",
    "0",
    encodeOptions.outputWebmPath,
  );

  await runFfmpegProcess({
    ffmpegBinary: context.ffmpegBinary,
    args,
    timeoutMs: procTimeoutMs,
    signal: encodeOptions.signal,
    onAborted: () => new VideoEncodeError("WebM encoding was cancelled", "ABORTED"),
    onTimeout: (ms) => new VideoEncodeError(`WebM encoding timed out after ${ms}ms`, "TIMEOUT"),
    onCommandFailed: (msg) => new VideoEncodeError(msg, "COMMAND_FAILED"),
  });

  try {
    const stats = await fs.stat(encodeOptions.outputWebmPath);
    const durationMs = Math.round(frameCount * (1000 / fps));
    return {
      outputWebmPath: encodeOptions.outputWebmPath,
      fileSizeBytes: stats.size,
      durationMs,
      fps,
      codec: "vp9_alpha",
    };
  } catch (err: unknown) {
    throw new VideoEncodeError(`Failed to verify encoded WebM output: ${(err as Error).message}`, "OUTPUT_FILE_MISSING");
  }
}
