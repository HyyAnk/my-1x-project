import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { IntroOutroStyleSchema, type IntroOutroClipMeta, type IntroOutroStyle } from "@studio/shared";
import type { RepositoryRuntime } from "./runtime.js";
import { extractVideoThumbnail, probeAndValidate1080pVideo, type Video1080pProbeResult } from "../utils/videoMediaProbe.js";

export { extractVideoThumbnail, probeAndValidate1080pVideo, type Video1080pProbeResult };

function getChannelStylesDir(repository: RepositoryRuntime, channelSlug: string): string {
  return repository.resolvePath("channels", channelSlug, "intro_outro_styles");
}

function getStyleDir(repository: RepositoryRuntime, channelSlug: string, styleId: string): string {
  return path.join(getChannelStylesDir(repository, channelSlug), styleId);
}

async function computeFileSha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return hash.digest("hex");
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

export async function saveChannelIntroOutroStyle(this: RepositoryRuntime, channelId: string, style: IntroOutroStyle): Promise<void> {
  const channel = await this.getChannel(channelId);
  const styleDir = getStyleDir(this, channel.slug, style.style_id);
  await mkdir(styleDir, { recursive: true });
  const metaPath = path.join(styleDir, "meta.json");
  await this.writeJsonAtomic(metaPath, style);
}

export async function deleteChannelIntroOutroStyle(this: RepositoryRuntime, channelId: string, styleId: string): Promise<void> {
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
  _originalFilename: string,
): Promise<IntroOutroClipMeta> {
  const channel = await this.getChannel(channelId);
  const styleDir = getStyleDir(this, channel.slug, styleId);
  await mkdir(styleDir, { recursive: true });

  const clipFilename = `${kind}.mp4`;
  const targetVideoPath = path.join(styleDir, clipFilename);
  const thumbFilename = `${kind}_thumb.jpg`;
  const targetThumbPath = path.join(styleDir, thumbFilename);

  const tempPath: string | null = null;
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
    const sha256 = await computeFileSha256(targetVideoPath);

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
      sha256,
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
