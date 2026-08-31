import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../errors.js";
import { isJpeg, isValidImageBuffer, isWebp } from "../helpers.js";
import type { BundleImageMeta } from "../types.js";
import type { RepositoryRuntime } from "../runtime.js";

export async function writeQuizImageAsset(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  assetId: string,
  fingerprint: string,
  content: Uint8Array,
  meta?: BundleImageMeta,
): Promise<string> {
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/i.test(assetId)) throw new RepositoryError("Quiz asset ID is invalid", "INVALID_ASSET");
  if (!/^[a-f0-9]{64}$/i.test(fingerprint)) throw new RepositoryError("Quiz asset fingerprint is invalid", "INVALID_ASSET");
  if (!isValidImageBuffer(content)) throw new RepositoryError("Quiz image output is not a valid image file", "INVALID_IMAGE");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "quiz-images");
  await mkdir(directory, { recursive: true });
  const extension = isJpeg(content) ? ".jpg" : isWebp(content) ? ".webp" : ".png";
  const filename = `${assetId}-${fingerprint.slice(0, 12)}${extension}`;
  const absolutePath = path.join(directory, filename);
  await this.writeBinaryAtomic(absolutePath, content);
  if (meta) {
    const metaPath = path.join(directory, `${assetId}-${fingerprint.slice(0, 12)}.meta.json`);
    await this.writeJsonAtomic(metaPath, meta);
  }
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/quiz-images/${filename}`;
}

export async function resolveQuizAssetPath(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  assetPath: string,
): Promise<string> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const expected = `channels/${channel.slug}/episodes/${episode.slug}/assets/quiz-images/`;
  if (!assetPath.replaceAll("\\", "/").startsWith(expected))
    throw new RepositoryError("Quiz asset path is outside this episode", "UNSAFE_PATH");
  const filename = path.basename(assetPath);
  if (!/^[a-z0-9][a-z0-9_-]{0,119}-[a-f0-9]{12}\.(png|jpe?g|webp)$/i.test(filename))
    throw new RepositoryError("Quiz asset filename is invalid", "UNSAFE_PATH");
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "quiz-images", filename);
  await access(absolutePath);
  return absolutePath;
}

export async function getRenderedVoiceMetrics(this: RepositoryRuntime): Promise<{
  rendered_characters: number;
  rendered_duration_seconds: number;
  rendered_segments_count: number;
  rendered_episodes_count: number;
}> {
  const channels = await this.listChannels(true);
  let totalCharacters = 0;
  let totalDurationSeconds = 0;
  let totalSegments = 0;
  let totalRenderedEpisodes = 0;

  for (const channel of channels) {
    const episodes = await this.listEpisodes(channel.channel_id).catch(() => []);
    for (const episode of episodes) {
      let episodeHasRenderedVoice = false;

      // Check Quiz voice plan
      const voicePlan = await this.readVoicePlan(channel.channel_id, episode.episode_id).catch(() => null);
      if (voicePlan && voicePlan.segments?.length) {
        for (const segment of voicePlan.segments) {
          if (segment.duration_seconds && segment.duration_seconds > 0) {
            totalCharacters += (segment.text || "").length;
            totalDurationSeconds += segment.duration_seconds;
            totalSegments += 1;
            episodeHasRenderedVoice = true;
          }
        }
      }

      // Check legacy scenes
      const scenes = await this.readScenes(channel.channel_id, episode.episode_id).catch(() => []);
      if (scenes && scenes.length) {
        for (const scene of scenes) {
          if (scene.audio_asset_path && scene.audio_duration_seconds && scene.audio_duration_seconds > 0) {
            totalCharacters += (scene.dialogue || "").length;
            totalDurationSeconds += scene.audio_duration_seconds;
            totalSegments += 1;
            episodeHasRenderedVoice = true;
          }
        }
      }

      if (episodeHasRenderedVoice) {
        totalRenderedEpisodes += 1;
      }
    }
  }

  return {
    rendered_characters: totalCharacters,
    rendered_duration_seconds: totalDurationSeconds,
    rendered_segments_count: totalSegments,
    rendered_episodes_count: totalRenderedEpisodes,
  };
}
