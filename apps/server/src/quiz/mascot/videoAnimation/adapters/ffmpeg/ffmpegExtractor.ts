import path from "node:path";
import fs from "node:fs/promises";
import { VideoExtractError } from "./ffmpegErrors.js";
import { probeVideo } from "./ffmpegProbe.js";
import { runFfmpegProcess } from "./ffmpegProcess.js";
import {
  DEFAULT_EXTRACT_TIMEOUT_MS,
  type ExtractedFrame,
  type ExtractFramesOptions,
  type ExtractFramesResult,
  type FixtureExtractHandler,
  type VideoMetadata,
} from "./ffmpegTypes.js";

export interface ExtractFramesContext {
  ffmpegBinary?: string;
  ffprobeBinary?: string;
  timeoutMs?: number;
  fixtureExtractHandler?: FixtureExtractHandler | null;
  probeFn?: (filePath: string) => Promise<VideoMetadata>;
}

export async function extractFrames(
  extractOptions: ExtractFramesOptions,
  context: ExtractFramesContext = {},
): Promise<ExtractFramesResult> {
  if (context.fixtureExtractHandler) {
    if (extractOptions.signal?.aborted) {
      throw new VideoExtractError("Frame extraction was cancelled", "ABORTED");
    }
    return context.fixtureExtractHandler(extractOptions);
  }

  if (extractOptions.signal?.aborted) {
    throw new VideoExtractError("Frame extraction was cancelled", "ABORTED");
  }

  // Verify source video file exists
  try {
    const stats = await fs.stat(extractOptions.sourceVideoPath);
    if (stats.size === 0) {
      throw new VideoExtractError(`Source video file is empty: ${extractOptions.sourceVideoPath}`, "FILE_EMPTY");
    }
  } catch (err: unknown) {
    if (err instanceof VideoExtractError) throw err;
    throw new VideoExtractError(`Source video file not found: ${extractOptions.sourceVideoPath}`, "SOURCE_FILE_NOT_FOUND");
  }

  // Ensure output directory exists
  try {
    await fs.mkdir(extractOptions.outputDir, { recursive: true });
  } catch (err: unknown) {
    throw new VideoExtractError(`Cannot create output directory: ${(err as Error).message}`, "OUTPUT_DIR_INVALID");
  }

  let fps = extractOptions.fps;
  let frameCount = extractOptions.frameCount;

  if (!fps || !frameCount) {
    const probe =
      context.probeFn ??
      ((filePath: string) =>
        probeVideo(filePath, {
          ffprobeBinary: context.ffprobeBinary,
          timeoutMs: context.timeoutMs,
        }));
    const meta = await probe(extractOptions.sourceVideoPath);
    fps = fps ?? meta.fps;
    frameCount = frameCount ?? meta.frameCount ?? Math.round((meta.durationMs / 1000) * fps);
  }

  fps = Math.max(1, fps);
  frameCount = Math.max(1, frameCount);

  const procTimeoutMs = extractOptions.timeoutMs ?? context.timeoutMs ?? Math.max(DEFAULT_EXTRACT_TIMEOUT_MS, frameCount * 1000);
  const outputPattern = path.join(extractOptions.outputDir, "frame_%03d.png");

  const args = ["-y", "-i", extractOptions.sourceVideoPath, "-vf", `fps=${fps}`, "-vframes", String(frameCount), outputPattern];

  await runFfmpegProcess({
    ffmpegBinary: context.ffmpegBinary,
    args,
    timeoutMs: procTimeoutMs,
    signal: extractOptions.signal,
    onAborted: () => new VideoExtractError("Frame extraction was cancelled", "ABORTED"),
    onTimeout: (ms) => new VideoExtractError(`Frame extraction timed out after ${ms}ms`, "TIMEOUT"),
    onCommandFailed: (msg) => new VideoExtractError(msg, "COMMAND_FAILED"),
  });

  try {
    const entries = await fs.readdir(extractOptions.outputDir);
    const frameFileRegex = /^frame_(\d+)\.png$/i;
    const frameFiles = entries
      .filter((file) => frameFileRegex.test(file))
      .sort((a, b) => {
        const numA = parseInt(a.match(frameFileRegex)![1], 10);
        const numB = parseInt(b.match(frameFileRegex)![1], 10);
        return numA - numB;
      });

    const frames: ExtractedFrame[] = frameFiles.map((fileName, idx) => {
      const match = fileName.match(frameFileRegex);
      const frameIndex = match ? parseInt(match[1], 10) : idx + 1;
      return {
        frameIndex,
        fileName,
        filePath: path.join(extractOptions.outputDir, fileName),
        timestampMs: Math.round((frameIndex - 1) * (1000 / fps)),
      };
    });

    const durationMs = Math.round(frames.length * (1000 / fps));
    return {
      frames,
      frameCount: frames.length,
      fps,
      durationMs,
      outputDir: extractOptions.outputDir,
    };
  } catch (err: unknown) {
    throw new VideoExtractError(`Failed to read extracted frames: ${(err as Error).message}`, "OUTPUT_DIR_INVALID");
  }
}
