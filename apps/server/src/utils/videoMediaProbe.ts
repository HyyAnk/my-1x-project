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

export type VideoFrameRequirement = { width: number; height: number; label: string };

const LANDSCAPE_1080P: VideoFrameRequirement = { width: 1920, height: 1080, label: "1080p (1920x1080)" };

export async function probeAndValidate1080pVideo(filePath: string): Promise<Video1080pProbeResult> {
  return probeAndValidateVideoFrame(filePath, LANDSCAPE_1080P);
}

async function readFfprobe(filePath: string): Promise<FfprobeOutput> {
  try {
    const result = await execFileAsync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath], {
      timeout: 30_000,
      windowsHide: true,
    });
    return JSON.parse(result.stdout) as FfprobeOutput;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ffprobe execution failed";
    throw new RepositoryError(`Failed to probe video file: ${msg}`, "PROBE_FAILED");
  }
}

function assertFrameSize(videoStream: FfprobeStream, requirement: VideoFrameRequirement): void {
  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;
  if (width !== requirement.width || height !== requirement.height) {
    throw new RepositoryError(
      `Video must be exactly ${requirement.label}. Detected: ${width}x${height}. Please resize before uploading.`,
      "INVALID_RESOLUTION",
    );
  }
  const rotateTag = videoStream.tags?.rotate;
  const rotateNum = rotateTag ? Number.parseInt(rotateTag, 10) : 0;
  const sideRotate = videoStream.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? 0;
  const totalRotation = Math.abs(rotateNum || sideRotate) % 360;
  if (totalRotation === 90 || totalRotation === 270) {
    throw new RepositoryError(
      `Video has rotation metadata (${totalRotation}°). Re-encode it as ${requirement.label} without rotation before uploading.`,
      "INVALID_RESOLUTION",
    );
  }
}

function readDurationSeconds(videoStream: FfprobeStream, probe: FfprobeOutput): number {
  let durationSeconds = videoStream.duration ? Number.parseFloat(videoStream.duration) : 0;
  if ((!durationSeconds || Number.isNaN(durationSeconds)) && probe.format?.duration) {
    durationSeconds = Number.parseFloat(probe.format.duration);
  }
  if (!durationSeconds || Number.isNaN(durationSeconds) || durationSeconds < 0.5) {
    throw new RepositoryError("Video duration must be at least 0.5 seconds", "INVALID_DURATION");
  }
  return durationSeconds;
}

/** Parses FPS from r_frame_rate, e.g. "24/1", "30000/1001" or "29.97". */
function readFps(videoStream: FfprobeStream): number {
  if (!videoStream.r_frame_rate) return 30;
  const parts = videoStream.r_frame_rate.split("/");
  if (parts.length === 2) {
    const num = Number.parseFloat(parts[0]);
    const den = Number.parseFloat(parts[1]);
    return den > 0 ? Math.round((num / den) * 100) / 100 : 30;
  }
  const parsed = Number.parseFloat(videoStream.r_frame_rate);
  return parsed > 0 ? parsed : 30;
}

/** Probes a video and requires an exact frame size with no rotation and at least 0.5 seconds. */
export async function probeAndValidateVideoFrame(filePath: string, requirement: VideoFrameRequirement): Promise<Video1080pProbeResult> {
  const probe = await readFfprobe(filePath);
  const videoStream = probe.streams?.find((s) => s.codec_type === "video");
  if (!videoStream) {
    throw new RepositoryError("Uploaded file contains no video stream", "NO_VIDEO_STREAM");
  }
  assertFrameSize(videoStream, requirement);
  const durationSeconds = readDurationSeconds(videoStream, probe);
  return {
    duration_seconds: Math.round(durationSeconds * 1000) / 1000,
    width: requirement.width,
    height: requirement.height,
    fps: readFps(videoStream),
    has_audio: Boolean(probe.streams?.some((s) => s.codec_type === "audio")),
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
