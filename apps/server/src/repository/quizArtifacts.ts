import { access, mkdir, readFile, readdir, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import {
  DirectorPlanSchema,
  EpisodeSchema,
  QuizAssessmentSchema,
  QuizAssetPlanSchema,
  QuizAssetResolutionSchema,
  QuizTimelineSchema,
  QuizV2Schema,
  QuestionHistoryCheckResultSchema,
  QuestionHistoryEntrySchema,
  BgmHistoryEntrySchema,
  VoicePlanSchema,
  nowIso,
  type DirectorPlan,
  type QuizAssessment,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizQuestion,
  type QuizTimeline,
  type QuizV2,
  type QuestionHistoryCheckResult,
  type QuestionHistoryEntry,
  type BgmHistoryEntry,
  type VoicePlan,
} from "@studio/shared";
import { invalidateQuizArtifacts as quizInvalidationStages } from "../quiz/pipeline/invalidation.js";
import { pruneQuestionHistory, normalizeQuestionText } from "../quiz/qa/questionHistory.js";
import { RepositoryError } from "./errors.js";
import { isJpeg, isValidImageBuffer, isWebp } from "./helpers.js";
import type { BundleImageMeta } from "./types.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function readQuiz(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizV2 | null> {
  return this.readQuizArtifact(channelId, episodeId, "quiz-v2.json", QuizV2Schema);
}

export async function writeQuiz(this: RepositoryRuntime, channelId: string, episodeId: string, quiz: QuizV2): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "quiz-v2.json", QuizV2Schema.parse(quiz));
}

export async function readDirectorPlan(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<DirectorPlan | null> {
  return this.readQuizArtifact(channelId, episodeId, "director-plan.json", DirectorPlanSchema);
}

export async function writeDirectorPlan(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  plan: DirectorPlan,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "director-plan.json", DirectorPlanSchema.parse(plan));
}

export async function readAssetPlan(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizAssetPlan | null> {
  return this.readQuizArtifact(channelId, episodeId, "asset-plan.json", QuizAssetPlanSchema);
}

export async function writeAssetPlan(this: RepositoryRuntime, channelId: string, episodeId: string, plan: QuizAssetPlan): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "asset-plan.json", QuizAssetPlanSchema.parse(plan));
}

export async function readQuizAssetResolution(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
): Promise<QuizAssetResolution | null> {
  return this.readQuizArtifact(channelId, episodeId, "asset-resolution.json", QuizAssetResolutionSchema);
}

export async function writeQuizAssetResolution(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  resolution: QuizAssetResolution,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "asset-resolution.json", QuizAssetResolutionSchema.parse(resolution));
}

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

export async function readQuizTimeline(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizTimeline | null> {
  return this.readQuizArtifact(channelId, episodeId, "timeline.json", QuizTimelineSchema);
}

export async function writeQuizTimeline(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  timeline: QuizTimeline,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "timeline.json", QuizTimelineSchema.parse(timeline));
}

export async function readQuizAssessment(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<QuizAssessment | null> {
  return this.readQuizArtifact(channelId, episodeId, "qa.json", QuizAssessmentSchema);
}

export async function writeQuizAssessment(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  assessment: QuizAssessment,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "qa.json", QuizAssessmentSchema.parse(assessment));
}

export async function readVoicePlan(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<VoicePlan | null> {
  return this.readQuizArtifact(channelId, episodeId, "voice-plan.json", VoicePlanSchema);
}

export async function writeVoicePlan(this: RepositoryRuntime, channelId: string, episodeId: string, plan: VoicePlan): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "voice-plan.json", VoicePlanSchema.parse(plan));
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

      // Check documentary scenes
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

export async function readHistoryCheck(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
): Promise<QuestionHistoryCheckResult | null> {
  return this.readQuizArtifact(channelId, episodeId, "history-check.json", QuestionHistoryCheckResultSchema);
}

export async function writeHistoryCheck(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  result: QuestionHistoryCheckResult,
): Promise<string> {
  return this.writeQuizArtifact(channelId, episodeId, "history-check.json", QuestionHistoryCheckResultSchema.parse(result));
}

export async function readQuestionHistory(this: RepositoryRuntime, channelId: string): Promise<QuestionHistoryEntry[]> {
  const channel = await this.getChannel(channelId);
  const historyPath = this.resolvePath("channels", channel.slug, "question_history.json");
  try {
    const raw = JSON.parse(await readFile(historyPath, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => QuestionHistoryEntrySchema.parse(item));
  } catch {
    return [];
  }
}

export async function appendQuestionHistory(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  questions: QuizQuestion[],
  ttlDays = 30,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const episode = await this.getEpisode(channelId, episodeId).catch(() => null);
  const episodeTitle = episode?.topic?.title || episodeId;
  const historyPath = this.resolvePath("channels", channel.slug, "question_history.json");
  const existing = await this.readQuestionHistory(channelId);

  const filteredExisting = existing.filter((e) => e.episode_id !== episodeId);

  const newEntries: QuestionHistoryEntry[] = questions.map((q) => {
    const correctChoice = q.choices.find((c) => c.id === q.correct_choice_id)?.text || "";
    return {
      question_id: q.id,
      question_text: q.question,
      normalized_question: normalizeQuestionText(q.question),
      choices: q.choices.map((c) => c.text),
      correct_answer: correctChoice,
      episode_id: episodeId,
      episode_title: episodeTitle,
      channel_id: channelId,
      rendered_at: nowIso(),
    };
  });

  const combined = [...filteredExisting, ...newEntries];
  const pruned = pruneQuestionHistory(combined, ttlDays);
  await mkdir(path.dirname(historyPath), { recursive: true });
  await this.writeJsonAtomic(historyPath, pruned);
}

export async function readBgmHistory(this: RepositoryRuntime, channelId: string): Promise<BgmHistoryEntry[]> {
  const channel = await this.getChannel(channelId);
  const historyPath = this.resolvePath("channels", channel.slug, "bgm_history.json");
  try {
    const raw = JSON.parse(await readFile(historyPath, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => BgmHistoryEntrySchema.parse(item));
  } catch {
    return [];
  }
}

export async function appendBgmHistory(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  trackId: string,
  filename: string,
  ttlDays = 30,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const episode = await this.getEpisode(channelId, episodeId).catch(() => null);
  const episodeTitle = episode?.topic?.title || episodeId;
  const historyPath = this.resolvePath("channels", channel.slug, "bgm_history.json");
  const existing = await this.readBgmHistory(channelId);

  const filteredExisting = existing.filter((e) => e.episode_id !== episodeId);
  const newEntry: BgmHistoryEntry = {
    track_id: trackId,
    filename,
    episode_id: episodeId,
    episode_title: episodeTitle,
    channel_id: channelId,
    used_at: nowIso(),
  };

  const combined = [newEntry, ...filteredExisting];
  const cutOff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
  const pruned = combined.filter((entry) => {
    const entryTime = new Date(entry.used_at).getTime();
    return !Number.isNaN(entryTime) && entryTime >= cutOff;
  });

  await mkdir(path.dirname(historyPath), { recursive: true });
  await this.writeJsonAtomic(historyPath, pruned);
}

export async function invalidateQuizArtifacts(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  stages: string[],
): Promise<string[]> {
  const filenames: Record<
    string,
    "quiz-v2.json" | "director-plan.json" | "asset-plan.json" | "asset-resolution.json" | "voice-plan.json" | "timeline.json" | "qa.json"
  > = {
    quiz: "quiz-v2.json",
    director: "director-plan.json",
    assets: "asset-plan.json",
    asset_resolution: "asset-resolution.json",
    voice: "voice-plan.json",
    timeline: "timeline.json",
    qa: "qa.json",
  };
  const removed: string[] = [];
  const shouldInvalidateRender = stages.includes("render");
  const hasQuizV2Artifact = shouldInvalidateRender ? Boolean(await this.readQuiz(channelId, episodeId)) : false;
  for (const stage of stages) {
    const filename = filenames[stage];
    if (!filename) continue;
    const target = await this.quizArtifactTarget(channelId, episodeId, filename);
    await rm(target.absolutePath, { force: true });
    removed.push(target.relativePath);
  }
  if (shouldInvalidateRender && hasQuizV2Artifact) {
    const episode = await this.getEpisode(channelId, episodeId);
    const channel = await this.getChannel(channelId);
    const assetsDirectory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets");
    const videoFilename = episode.video_asset_path ? path.basename(episode.video_asset_path) : "quiz-video.mp4";
    if (/^[a-z0-9][a-z0-9._-]*\.mp4$/i.test(videoFilename)) await rm(path.join(assetsDirectory, videoFilename), { force: true });
    await rm(path.join(assetsDirectory, "render-manifest.json"), { force: true });
    const next = EpisodeSchema.parse({
      ...episode,
      stage: episode.stage === "VIDEO_READY" ? "SCENE_READY" : episode.stage,
      video_asset_path: null,
      video_generated_at: null,
      video_duration_seconds: null,
      render_manifest_path: null,
      updated_at: nowIso(),
    });
    await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  }
  return removed;
}
