import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { EpisodeSchema, SceneSchema, nowIso } from "@studio/shared";
import { RepositoryError } from "../errors.js";
import type { QuizProductId, QuizProductRecord, RepositoryRuntime } from "../runtime.js";
import { findIdenticalNarration, narrationContentFilename } from "./narrationReuse.js";

export async function saveSceneAudio(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  sceneNumber: number,
  audioAssetPath: string,
  durationSeconds: number,
): Promise<void> {
  const scenes = await this.readScenes(channelId, episodeId);
  const target = scenes.find((scene) => scene.scene_number === sceneNumber);
  if (!target) throw new RepositoryError("Audio target scene not found", "SCENE_NOT_FOUND");
  const next = scenes.map((scene) =>
    scene.scene_number === sceneNumber
      ? SceneSchema.parse({
          ...scene,
          audio_asset_path: audioAssetPath,
          audio_generated_at: nowIso(),
          audio_duration_seconds: durationSeconds,
        })
      : scene,
  );
  await this.saveScenes(channelId, episodeId, next);
}

export async function getSceneAudioFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: string,
): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!/^scene-\d{2,}\.wav$/i.test(filename)) throw new RepositoryError("Unsupported audio file", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", filename);
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
    throw new RepositoryError("Audio asset not found", "AUDIO_NOT_FOUND");
  }
}

export async function writeSceneAudio(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  sceneNumber: number,
  content: Uint8Array,
): Promise<string> {
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

export async function writeNarrationAudio(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  content: Uint8Array,
  segmentNumber?: number,
): Promise<string> {
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

function quizVoiceSegmentFilename(segmentNumber: number, version: string): string {
  if (!Number.isInteger(segmentNumber) || segmentNumber < 1 || segmentNumber > 999)
    throw new RepositoryError("Quiz voice segment number is invalid", "INVALID_SEGMENT");
  if (version && !/^[a-z0-9-]{1,40}$/.test(version)) throw new RepositoryError("Quiz voice segment version is invalid", "INVALID_SEGMENT");
  return `segment-${String(segmentNumber).padStart(3, "0")}${version ? `-${version}` : ""}.wav`;
}

export async function writeQuizVoiceSegmentAudio(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  segmentNumber: number,
  content: Uint8Array,
  version = "",
): Promise<string> {
  const filename = quizVoiceSegmentFilename(segmentNumber, version);
  const location = await this.locateQuizProduct(channelId, product);
  const voiceDirectory = path.join(location.directory, "assets", "quiz-voice");
  await mkdir(voiceDirectory, { recursive: true });
  await this.assertRealPathInside(location.directory, voiceDirectory);
  await this.writeBinaryAtomic(path.join(voiceDirectory, filename), content);
  return `${location.relativeDirectory}/assets/quiz-voice/${filename}`;
}

export async function writeQuizNarrationAudio(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  content: Uint8Array,
): Promise<string> {
  const location = await this.locateQuizProduct(channelId, product);
  const assetsDirectory = path.join(location.directory, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await this.assertRealPathInside(location.directory, assetsDirectory);
  const existing = await findIdenticalNarration(assetsDirectory, content);
  if (existing) return `${location.relativeDirectory}/assets/${existing}`;
  const filename = narrationContentFilename(content);
  await this.writeBinaryAtomic(path.join(assetsDirectory, filename), content);
  return `${location.relativeDirectory}/assets/${filename}`;
}

async function describeProductAudioFile(
  runtime: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  relativeSegments: string[],
): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  const location = await runtime.locateQuizProduct(channelId, product);
  const assetsDirectory = path.join(location.directory, "assets");
  const absolutePath = path.join(assetsDirectory, ...relativeSegments);
  await runtime.assertRealPathInside(assetsDirectory, absolutePath);
  const metadata = await stat(absolutePath);
  return {
    absolutePath,
    path: `${location.relativeDirectory}/assets/${relativeSegments.join("/")}`,
    size: metadata.size,
    modified_at: metadata.mtime.toISOString(),
  };
}

export async function getQuizVoiceSegmentAudioFile(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  segmentNumber: number,
  version = "",
): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  const filename = quizVoiceSegmentFilename(segmentNumber, version);
  try {
    return await describeProductAudioFile(this, channelId, product, ["quiz-voice", filename]);
  } catch {
    throw new RepositoryError("Quiz voice segment not found", "AUDIO_NOT_FOUND");
  }
}

export async function getEpisodeAudioFile(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  filename: string,
): Promise<{ absolutePath: string; path: string; size: number; modified_at: string }> {
  if (!/^(?:scene-\d{2,}|narration(?:-\d{2,})?|quiz-narration-\d+)\.wav$/i.test(filename))
    throw new RepositoryError("Unsupported audio file", "FILE_NOT_ALLOWED");
  try {
    return await describeProductAudioFile(this, channelId, product, [filename]);
  } catch {
    throw new RepositoryError("Audio asset not found", "AUDIO_NOT_FOUND");
  }
}

export async function saveNarrationMetadata(
  this: RepositoryRuntime,
  channelId: string,
  product: QuizProductId,
  assetPath: string,
  durationSeconds: number,
  segmentCount: number,
  narrationWordCount: number,
): Promise<QuizProductRecord> {
  const location = await this.locateQuizProduct(channelId, product);
  const { record } = location;
  const measuredPace = narrationWordCount / Math.max(0.1, durationSeconds);
  const mediaPatch = {
    stage: record.stage === "SCENE_READY" ? ("READY_FOR_GENERATION" as const) : ("NARRATION_READY" as const),
    narration_asset_path: assetPath,
    narration_generated_at: nowIso(),
    narration_duration_seconds: durationSeconds,
    narration_segment_count: segmentCount,
    measured_narration_words_per_second: measuredPace,
  };
  if (!("episode_id" in record)) return this.writeQuizProductRecordPatch(location, mediaPatch);
  // Episodes also recalibrate their script word target from the measured pace.
  const calibratedWordTarget = Math.round(record.target_duration_minutes * 60 * measuredPace * 0.95);
  const next = EpisodeSchema.parse({ ...record, ...mediaPatch, target_word_count: calibratedWordTarget, updated_at: nowIso() });
  await this.writeJsonAtomic(path.join(location.directory, "episode.json"), next);
  this.entityIdResolver.setEpisodeSlug(channelId, next.episode_id, next.slug);
  return next;
}
