import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RepositoryError } from "../repository/errors.js";

const execFileAsync = promisify(execFile);

export type FfprobeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  duration?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ side_data_type?: string; rotation?: number }>;
};

export type FfprobeOutput = {
  format?: { duration?: string };
  streams?: FfprobeStream[];
};

export type Video1080pProbeResult = {
  duration_seconds: number;
  width: number;
  height: number;
  fps: number;
  has_audio: boolean;
};

export async function probeAndValidate1080pVideo(filePath: string): Promise<Video1080pProbeResult> {
  let probe: FfprobeOutput;
  try {
    const result = await execFileAsync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath], {
      timeout: 30_000,
      windowsHide: true,
    });
    probe = JSON.parse(result.stdout) as FfprobeOutput;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ffprobe execution failed";
    throw new RepositoryError(`Failed to probe video file: ${msg}`, "PROBE_FAILED");
  }

  const videoStream = probe.streams?.find((s) => s.codec_type === "video");
  if (!videoStream) {
    throw new RepositoryError("Uploaded file contains no video stream", "NO_VIDEO_STREAM");
  }

  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;

  if (width !== 1920 || height !== 1080) {
    throw new RepositoryError(
      `Video must be exactly 1080p (1920x1080). Detected: ${width}x${height}. Please upscale before uploading.`,
      "INVALID_RESOLUTION",
    );
  }

  const rotateTag = videoStream.tags?.rotate;
  const rotateNum = rotateTag ? Number.parseInt(rotateTag, 10) : 0;
  const sideRotate = videoStream.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? 0;
  const totalRotation = Math.abs(rotateNum || sideRotate) % 360;
  if (totalRotation === 90 || totalRotation === 270) {
    throw new RepositoryError(
      `Video has vertical orientation rotation metadata (${totalRotation}°). Please upscale or rotate to landscape 1080p (1920x1080) before uploading.`,
      "INVALID_RESOLUTION",
    );
  }

  let durationSeconds = 0;
  if (videoStream.duration) {
    durationSeconds = Number.parseFloat(videoStream.duration);
  }
  if ((!durationSeconds || Number.isNaN(durationSeconds)) && probe.format?.duration) {
    durationSeconds = Number.parseFloat(probe.format.duration);
  }
  if (!durationSeconds || Number.isNaN(durationSeconds) || durationSeconds < 0.5) {
    throw new RepositoryError("Video duration must be at least 0.5 seconds", "INVALID_DURATION");
  }

  // Parse FPS from r_frame_rate e.g. "24/1" or "30/1" or "29.97"
  let fps = 30;
  if (videoStream.r_frame_rate) {
    const parts = videoStream.r_frame_rate.split("/");
    if (parts.length === 2) {
      const num = Number.parseFloat(parts[0]);
      const den = Number.parseFloat(parts[1]);
      if (den > 0) fps = Math.round((num / den) * 100) / 100;
    } else {
      const parsed = Number.parseFloat(videoStream.r_frame_rate);
      if (parsed > 0) fps = parsed;
    }
  }

  const hasAudio = Boolean(probe.streams?.some((s) => s.codec_type === "audio"));

  return {
    duration_seconds: Math.round(durationSeconds * 1000) / 1000,
    width,
    height,
    fps,
    has_audio: hasAudio,
  };
}

export async function extractVideoThumbnail(videoPath: string, targetThumbPath: string, durationSeconds: number): Promise<void> {
  const seekTime = durationSeconds >= 1.0 ? "0.5" : "0.0";
  try {
    await execFileAsync("ffmpeg", ["-y", "-ss", seekTime, "-i", videoPath, "-vframes", "1", "-q:v", "2", targetThumbPath], {
      timeout: 30_000,
      windowsHide: true,
    });
  } catch {
    // Non-fatal if thumbnail extraction fails
  }
}
