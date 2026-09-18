import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { VideoProbeError } from "./ffmpegErrors.js";
import { DEFAULT_FFPROBE_TIMEOUT_MS, type VideoMetadata } from "./ffmpegTypes.js";

const execFileAsync = promisify(execFile);

export function parseFps(rateStr?: string): number {
  if (!rateStr || typeof rateStr !== "string") return 24;
  const parts = rateStr.split("/");
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (den > 0 && Number.isFinite(num)) {
      return Number((num / den).toFixed(3));
    }
  }
  const parsed = parseFloat(rateStr);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(3)) : 24;
}

export interface ProbeVideoOptions {
  ffprobeBinary?: string;
  timeoutMs?: number;
  fixtureMetadata?: VideoMetadata | null;
}

interface FFProbeStream {
  width?: number | string;
  height?: number | string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
  codec_name?: string;
}

interface FFProbeFormat {
  duration?: string;
  size?: string;
  format_name?: string;
}

interface FFProbeOutput {
  streams?: FFProbeStream[];
  format?: FFProbeFormat;
}

function parseFFProbeMetadata(stdout: string): VideoMetadata {
  try {
    const parsed = JSON.parse(stdout) as FFProbeOutput;
    const stream = parsed.streams?.[0];
    const format = parsed.format;

    if (!stream) {
      throw new VideoProbeError("No video streams found in file", "INVALID_MIME_TYPE");
    }

    const width = parseInt(String(stream.width ?? "0"), 10);
    const height = parseInt(String(stream.height ?? "0"), 10);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new VideoProbeError(`Invalid stream dimensions: ${width}x${height}`, "INVALID_DIMENSIONS");
    }

    const durationSec = parseFloat(stream.duration || format?.duration || "0");
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new VideoProbeError("Cannot determine valid video duration", "INVALID_DURATION");
    }
    const durationMs = Math.round(durationSec * 1000);

    const fps = parseFps(stream.r_frame_rate || stream.avg_frame_rate);
    const codec = String(stream.codec_name || "unknown");
    const formatName = String(format?.format_name || "unknown");
    const fileSizeBytes = parseInt(format?.size || "0", 10);
    const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));

    return {
      width,
      height,
      durationMs,
      fps,
      codec,
      format: formatName,
      fileSizeBytes,
      frameCount,
    };
  } catch (err: unknown) {
    if (err instanceof VideoProbeError) throw err;
    throw new VideoProbeError(
      `Failed to parse video metadata: ${err instanceof Error ? err.message : String(err)}`,
      "CORRUPTED_VIDEO_FILE",
    );
  }
}

export async function probeVideo(filePath: string, options: ProbeVideoOptions = {}): Promise<VideoMetadata> {
  if (options.fixtureMetadata) {
    const meta = { ...options.fixtureMetadata };
    if (meta.frameCount === undefined && Number.isFinite(meta.durationMs) && Number.isFinite(meta.fps) && meta.fps > 0) {
      meta.frameCount = Math.round((meta.durationMs / 1000) * meta.fps);
    }
    return meta;
  }

  // Verify file exists
  try {
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new VideoProbeError(`File is empty (0 bytes): ${filePath}`, "FILE_EMPTY");
    }
  } catch (err: unknown) {
    if (err instanceof VideoProbeError) throw err;
    throw new VideoProbeError(`Cannot access file: ${(err as Error).message}`, "FILE_NOT_FOUND");
  }

  const ffprobeBinary = options.ffprobeBinary ?? "ffprobe";
  const args = [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate,avg_frame_rate,duration,codec_name:format=duration,size,format_name",
    "-of",
    "json",
    filePath,
  ];

  const probeTimeoutMs = options.timeoutMs ?? DEFAULT_FFPROBE_TIMEOUT_MS;
  let stdout: string;
  try {
    const result = await execFileAsync(ffprobeBinary, args, { timeout: probeTimeoutMs });
    stdout = result.stdout;
  } catch (err: unknown) {
    throw new VideoProbeError(`Failed to probe video with ffprobe: ${(err as Error).message}`, "CORRUPTED_VIDEO_FILE");
  }

  return parseFFProbeMetadata(stdout);
}
