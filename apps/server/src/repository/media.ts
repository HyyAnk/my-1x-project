import { access, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, SceneSchema, nowIso, type Episode } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function saveSceneAudio(this: RepositoryRuntime,channelId: string, episodeId: string, sceneNumber: number, audioAssetPath: string, durationSeconds: number): Promise<void> {
  const scenes = await this.readScenes(channelId, episodeId);
  const target = scenes.find((scene) => scene.scene_number === sceneNumber);
  if (!target) throw new RepositoryError("Audio target scene not found", "SCENE_NOT_FOUND");
  const next = scenes.map((scene) => scene.scene_number === sceneNumber ? SceneSchema.parse({
    ...scene,
    audio_asset_path: audioAssetPath,
    audio_generated_at: nowIso(),
    audio_duration_seconds: durationSeconds,
  }) : scene);
  await this.saveScenes(channelId, episodeId, next);
}

export async function getSceneAudioFile(this: RepositoryRuntime,channelId: string, episodeId: string, filename: string): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!/^scene-\d{2,}\.wav$/i.test(filename)) throw new RepositoryError("Unsupported audio file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
  try {
    await this.assertRealPathInside(assetsDirectory, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, path: `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Audio asset not found", "AUDIO_NOT_FOUND");
  }
}

export async function writeSceneAudio(this: RepositoryRuntime,channelId: string, episodeId: string, sceneNumber: number, content: Uint8Array): Promise<string> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(episodeDirectory, assetsDirectory);
  const filename = `scene-${String(sceneNumber).padStart(2, "0")}.wav`;
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
  await this.writeBinaryAtomic(absolutePath, content);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
}

export async function writeNarrationAudio(this: RepositoryRuntime,channelId: string, episodeId: string, content: Uint8Array, segmentNumber?: number): Promise<string> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(episodeDirectory, assetsDirectory);
  const filename = segmentNumber ? `narration-${String(segmentNumber).padStart(2, "0")}.wav` : "narration.wav";
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
  await this.writeBinaryAtomic(absolutePath, content);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
}

export async function writeQuizVoiceSegmentAudio(this: RepositoryRuntime,channelId: string, episodeId: string, segmentNumber: number, content: Uint8Array, version = ""): Promise<string> {
  if (!Number.isInteger(segmentNumber) || segmentNumber < 1 || segmentNumber > 999) throw new RepositoryError("Quiz voice segment number is invalid", "INVALID_SEGMENT");
  if (version && !/^[a-z0-9-]{1,40}$/.test(version)) throw new RepositoryError("Quiz voice segment version is invalid", "INVALID_SEGMENT");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const voiceDirectory = path.join(assetsDirectory, "quiz-voice");
  await mkdir(voiceDirectory, { recursive: true });
  await this.assertRealPathInside(episodeDirectory, voiceDirectory);
  const filename = `segment-${String(segmentNumber).padStart(3, "0")}${version ? `-${version}` : ""}.wav`;
  const absolutePath = path.join(voiceDirectory, filename);
  await this.writeBinaryAtomic(absolutePath, content);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/quiz-voice/${filename}`;
}

export async function writeQuizNarrationAudio(this: RepositoryRuntime,channelId: string, episodeId: string, content: Uint8Array): Promise<string> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(episodeDirectory, assetsDirectory);
  const filename = `quiz-narration-${Date.now()}.wav`;
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
  await this.writeBinaryAtomic(absolutePath, content);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`;
}

export async function getQuizVoiceSegmentAudioFile(this: RepositoryRuntime,channelId: string, episodeId: string, segmentNumber: number, version = ""): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!Number.isInteger(segmentNumber) || segmentNumber < 1 || segmentNumber > 999) throw new RepositoryError("Quiz voice segment number is invalid", "INVALID_SEGMENT");
  if (version && !/^[a-z0-9-]{1,40}$/.test(version)) throw new RepositoryError("Quiz voice segment version is invalid", "INVALID_SEGMENT");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const voiceDirectory = path.join(assetsDirectory, "quiz-voice");
  const filename = `segment-${String(segmentNumber).padStart(3, "0")}${version ? `-${version}` : ""}.wav`;
  const absolutePath = path.join(voiceDirectory, filename);
  try {
    await this.assertRealPathInside(assetsDirectory, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, path: `channels/${channel.slug}/episodes/${episode.slug}/assets/quiz-voice/${filename}`, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Quiz voice segment not found", "AUDIO_NOT_FOUND");
  }
}

export async function writeVideoArtifact(this: RepositoryRuntime,channelId: string, episodeId: string, content: Uint8Array, filename = "quiz-video.mp4"): Promise<string> {
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

export async function getEpisodeVideoFile(this: RepositoryRuntime,channelId: string, episodeId: string, filename = "quiz-video.mp4"): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!/^[a-z0-9][a-z0-9._-]*\.mp4$/i.test(filename)) throw new RepositoryError("Unsupported video file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const absolutePath = path.join(assetsDirectory, filename);
  try {
    await this.assertRealPathInside(assetsDirectory, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, path: `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Video asset not found", "VIDEO_NOT_FOUND");
  }
}

export async function writeRenderManifest(this: RepositoryRuntime,channelId: string, episodeId: string, content: string): Promise<string> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  const absolutePath = path.join(assetsDirectory, "render-manifest.json");
  await this.writeTextAtomic(absolutePath, content.endsWith("\n") ? content : `${content}\n`);
  return `channels/${channel.slug}/episodes/${episode.slug}/assets/render-manifest.json`;
}

export async function saveVideoMetadata(this: RepositoryRuntime,channelId: string, episodeId: string, assetPath: string, durationSeconds: number, renderManifestPath: string): Promise<Episode> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const next = EpisodeSchema.parse({
    ...episode,
    stage: "VIDEO_READY",
    video_asset_path: assetPath,
    video_generated_at: nowIso(),
    video_duration_seconds: durationSeconds,
    render_manifest_path: renderManifestPath,
    updated_at: nowIso(),
  });
  await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  return next;
}

export async function getEpisodeAudioFile(this: RepositoryRuntime,channelId: string, episodeId: string, filename: string): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!/^(?:scene-\d{2,}|narration(?:-\d{2,})?|quiz-narration-\d+)\.wav$/i.test(filename)) throw new RepositoryError("Unsupported audio file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
  try {
    await this.assertRealPathInside(assetsDirectory, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, path: `channels/${channel.slug}/episodes/${episode.slug}/assets/${filename}`, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Audio asset not found", "AUDIO_NOT_FOUND");
  }
}

export async function saveNarrationMetadata(this: RepositoryRuntime,channelId: string, episodeId: string, assetPath: string, durationSeconds: number, segmentCount: number, narrationWordCount: number): Promise<Episode> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const measuredPace = narrationWordCount / Math.max(0.1, durationSeconds);
  const calibratedWordTarget = Math.round(episode.target_duration_minutes * 60 * measuredPace * 0.95);
  const next = EpisodeSchema.parse({
    ...episode,
    stage: episode.stage === "SCENE_READY" ? "READY_FOR_GENERATION" : "NARRATION_READY",
    narration_asset_path: assetPath,
    narration_generated_at: nowIso(),
    narration_duration_seconds: durationSeconds,
    narration_segment_count: segmentCount,
    measured_narration_words_per_second: measuredPace,
    target_word_count: calibratedWordTarget,
    updated_at: nowIso(),
  });
  await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  return next;
}
