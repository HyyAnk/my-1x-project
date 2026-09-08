import { execFile } from "node:child_process";
import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  IntroOutroStyleSchema,
  nowIso,
  type IntroOutroClipMeta,
  type IntroOutroStyle,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

const execFileAsync = promisify(execFile);

type FfprobeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  duration?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ side_data_type?: string; rotation?: number }>;
};

type FfprobeOutput = {
  format?: { duration?: string };
  streams?: FfprobeStream[];
};

export async function probeAndValidate1080pVideo(
  filePath: string,
): Promise<{ duration_seconds: number; width: number; height: number; fps: number; has_audio: boolean }> {
  let probe: FfprobeOutput;
  try {
    const result = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath],
      { timeout: 30_000, windowsHide: true },
    );
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
    await execFileAsync(
      "ffmpeg",
      ["-y", "-ss", seekTime, "-i", videoPath, "-vframes", "1", "-q:v", "2", targetThumbPath],
      { timeout: 30_000, windowsHide: true },
    );
  } catch {
    // Non-fatal if thumbnail extraction fails
  }
}

function getChannelStylesDir(repository: RepositoryRuntime, channelSlug: string): string {
  return repository.resolvePath("channels", channelSlug, "intro_outro_styles");
}

function getStyleDir(repository: RepositoryRuntime, channelSlug: string, styleId: string): string {
  return path.join(getChannelStylesDir(repository, channelSlug), styleId);
}

export async function listChannelIntroOutroStyles(this: RepositoryRuntime, channelId: string): Promise<IntroOutroStyle[]> {
  const channel = await this.getChannel(channelId);
  const stylesDir = getChannelStylesDir(this, channel.slug);
  try {
    const entries = await readdir(stylesDir, { withFileTypes: true });
    const styles: IntroOutroStyle[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metaPath = path.join(stylesDir, entry.name, "meta.json");
      try {
        const raw = await readFile(metaPath, "utf8");
        const parsed = IntroOutroStyleSchema.parse(JSON.parse(raw));
        styles.push(parsed);
      } catch {
        // Skip unreadable or corrupted style folders
      }
    }
    return styles.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function getChannelIntroOutroStyle(
  this: RepositoryRuntime,
  channelId: string,
  styleId: string,
): Promise<IntroOutroStyle | null> {
  const channel = await this.getChannel(channelId);
  const metaPath = path.join(getStyleDir(this, channel.slug, styleId), "meta.json");
  try {
    const raw = await readFile(metaPath, "utf8");
    return IntroOutroStyleSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveChannelIntroOutroStyle(
  this: RepositoryRuntime,
  channelId: string,
  style: IntroOutroStyle,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const styleDir = getStyleDir(this, channel.slug, style.style_id);
  await mkdir(styleDir, { recursive: true });
  const metaPath = path.join(styleDir, "meta.json");
  await this.writeJsonAtomic(metaPath, style);
}

export async function deleteChannelIntroOutroStyle(
  this: RepositoryRuntime,
  channelId: string,
  styleId: string,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const styleDir = getStyleDir(this, channel.slug, styleId);
  await rm(styleDir, { recursive: true, force: true });
}

export async function processAndStoreStyleClip(
  this: RepositoryRuntime,
  channelId: string,
  styleId: string,
  kind: "intro" | "outro",
  sourceBufferOrPath: Buffer | string,
  originalFilename: string,
): Promise<IntroOutroClipMeta> {
  const channel = await this.getChannel(channelId);
  const styleDir = getStyleDir(this, channel.slug, styleId);
  await mkdir(styleDir, { recursive: true });

  const clipFilename = `${kind}.mp4`;
  const targetVideoPath = path.join(styleDir, clipFilename);
  const thumbFilename = `${kind}_thumb.jpg`;
  const targetThumbPath = path.join(styleDir, thumbFilename);

  let tempPath: string | null = null;
  let videoPathForProbe: string;

  if (typeof sourceBufferOrPath === "string") {
    // If it's a file path
    videoPathForProbe = sourceBufferOrPath;
  } else {
    // Write buffer directly to target
    await writeFile(targetVideoPath, sourceBufferOrPath);
    videoPathForProbe = targetVideoPath;
  }

  try {
    const probe = await probeAndValidate1080pVideo(videoPathForProbe);

    if (typeof sourceBufferOrPath === "string" && sourceBufferOrPath !== targetVideoPath) {
      // Stream copy to target if source was an external path
      await copyFile(sourceBufferOrPath, targetVideoPath);
    }

    await extractVideoThumbnail(targetVideoPath, targetThumbPath, probe.duration_seconds);

    let hasThumb = false;
    try {
      await access(targetThumbPath);
      hasThumb = true;
    } catch {
      hasThumb = false;
    }

    return {
      filename: clipFilename,
      duration_seconds: probe.duration_seconds,
      width: 1920,
      height: 1080,
      fps: probe.fps,
      has_audio: probe.has_audio,
      thumbnail_filename: hasThumb ? thumbFilename : undefined,
    };
  } catch (error) {
    // If validation fails, clean up the written file
    await rm(targetVideoPath, { force: true });
    await rm(targetThumbPath, { force: true });
    throw error;
  } finally {
    if (tempPath) {
      await rm(tempPath, { force: true });
    }
  }
}

export async function getIntroOutroClipPath(
  this: RepositoryRuntime,
  channelId: string,
  styleId: string,
  kind: "intro" | "outro",
): Promise<string> {
  const channel = await this.getChannel(channelId);
  const clipPath = path.join(getStyleDir(this, channel.slug, styleId), `${kind}.mp4`);
  await access(clipPath);
  return clipPath;
}

export async function getIntroOutroThumbPath(
  this: RepositoryRuntime,
  channelId: string,
  styleId: string,
  kind: "intro" | "outro",
): Promise<string | null> {
  const channel = await this.getChannel(channelId);
  const thumbPath = path.join(getStyleDir(this, channel.slug, styleId), `${kind}_thumb.jpg`);
  try {
    await access(thumbPath);
    return thumbPath;
  } catch {
    return null;
  }
}
