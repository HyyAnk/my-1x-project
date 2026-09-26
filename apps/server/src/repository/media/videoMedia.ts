import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, nowIso, type Episode } from "@studio/shared";
import { RepositoryError } from "../errors.js";
import type { RepositoryRuntime } from "../runtime.js";

export async function writeVideoArtifact(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  content: Uint8Array,
  filename = "quiz-video.mp4",
): Promise<string> {
  if (!/^[a-z0-9][a-z0-9._-]*\.mp4$/i.test(filename)) throw new RepositoryError("Unsupported video file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(this.resolvePath("channels", channel.slug, "episodes", episode.slug), assetsDirectory);
  const absolutePath = path.join(assetsDirectory, filename);
  await this.writeBinaryAtomic(absolutePath, content);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
}

export async function getEpisodeVideoFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename = "quiz-video.mp4",
): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!/^[a-z0-9][a-z0-9._-]*\.mp4$/i.test(filename)) throw new RepositoryError("Unsupported video file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const absolutePath = path.join(assetsDirectory, filename);
  try {
    await this.assertRealPathInside(assetsDirectory, absolutePath);
    const metadata = await stat(absolutePath);
    return {
      absolutePath,
      path: `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`,
      size: metadata.size,
      modified_at: metadata.mtime.toISOString(),
    };
  } catch {
    throw new RepositoryError("Video asset not found", "VIDEO_NOT_FOUND");
  }
}

export async function writeRenderManifest(this: RepositoryRuntime, channelId: string, episodeId: string, content: string): Promise<string> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  const absolutePath = path.join(assetsDirectory, "render-manifest.json");
  await this.writeTextAtomic(absolutePath, content.endsWith("\n") ? content : `${content}\n`);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/render-manifest.json`;
}

export async function saveVideoMetadata(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  assetPath: string,
  durationSeconds: number,
  renderManifestPath: string,
): Promise<Episode> {
  return this.queueEpisodeArtifactMutation(channelId, episodeId, async () => {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    const next = EpisodeSchema.parse({
      ...episode,
      stage: "VIDEO_READY",
      video_asset_path: assetPath,
      video_generated_at: nowIso(),
      video_duration_seconds: durationSeconds,
      render_manifest_path: renderManifestPath,
      render_stale: false,
      updated_at: nowIso(),
    });
    await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
    this.entityIdResolver.setEpisodeSlug(channelId, next.episode_id, next.slug);
    return next;
  });
}
