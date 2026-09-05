import {
  type Episode,
  type MascotProfile,
  type ThumbnailAspectRatio,
  type ThumbnailHistoryItem,
  type ThumbnailManifest,
} from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import { planThumbnailWithAI } from "./thumbnailAiPlanner.js";
import { compileThumbnailPrompt } from "./thumbnailPromptCompiler.js";
import {
  generateThumbnailVariant,
  getEpisodeThumbnailManifest,
  persistThumbnailManifest,
  pruneVersionHistory,
  type GenerateEpisodeThumbnailOptions,
} from "./thumbnailManifestManager.js";

export type { GenerateEpisodeThumbnailOptions } from "./thumbnailManifestManager.js";
export {
  getEpisodeThumbnailManifest,
  setActiveThumbnailVersion,
  deleteThumbnailVersion,
  pruneVersionHistory,
} from "./thumbnailManifestManager.js";

/**
 * Resolves the effective thumbnail ratio based on episode video configuration and user preference.
 */
export function resolveTargetThumbnailRatio(
  episode: Episode,
  requestedRatio?: ThumbnailAspectRatio | "both" | "auto",
): ThumbnailAspectRatio | "both" {
  if (requestedRatio && requestedRatio !== "auto") {
    return requestedRatio;
  }

  const configMode = episode.quiz_config?.thumbnail_aspect_ratio || "auto";
  if (configMode === "16:9" || configMode === "9:16" || configMode === "both") {
    return configMode;
  }

  const isShortsVideo =
    episode.quiz_config?.render_aspect_ratio === "9:16" ||
    Boolean(episode.topic?.title && episode.topic.title.toLowerCase().includes("shorts"));

  return isShortsVideo ? "9:16" : "16:9";
}

/**
 * End-to-end service for planning, compiling, generating, and persisting Episode Thumbnails with full version history.
 */
export async function generateEpisodeThumbnail(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest> {
  const { channelId, episodeId, layoutOverride, customHookText, badgeOverride } = options;
  const logger = new StudioLogger(repository.rootDirectory);

  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const targetRatio = resolveTargetThumbnailRatio(episode, options.aspectRatio);

  let mascotProfile: MascotProfile | null = null;
  if (channel.mascot_id) {
    try {
      mascotProfile = await repository.getMascot(channel.mascot_id);
    } catch {
      logger.warn(`Assigned mascot ${channel.mascot_id} not found, proceeding with default persona`, {
        profileId: channelId,
        workerId: episodeId,
      });
    }
  }

  let scenes: Array<{ dialogue: string; quiz?: any }> = [];
  try {
    scenes = await repository.readScenes(channelId, episodeId);
  } catch {
    // Empty scenes fallback
  }

  const questions = scenes
    .filter((s) => s.quiz && s.quiz.question)
    .map((s) => ({
      question: s.quiz.question,
      choices: s.quiz.choices,
      answer: s.quiz.answer,
    }));

  const plan = await planThumbnailWithAI({
    topicTitle: episode.topic?.title || "Quiz Episode",
    topicSummary: episode.topic?.premise || episode.topic?.hook || "",
    questionCount: episode.quiz_config?.question_count || (questions.length > 0 ? questions.length : 10),
    questionFormat: episode.quiz_config?.quiz_format,
    questions,
    language: channel.language || "English",
    visualStyle: episode.quiz_config?.resolved_visual_style || episode.quiz_config?.visual_style || "pixar_3d",
    colorTheme: mascotProfile?.color_theme,
    layoutOverride,
    customHookText,
    badgeOverride: badgeOverride || "auto",
    mascotProfile,
    llmClient: options.antigravityClient ?? null,
  });

  const shouldGenerate169 = targetRatio === "16:9" || targetRatio === "both";
  const shouldGenerate916 = targetRatio === "9:16" || targetRatio === "both";

  const prompt169 = shouldGenerate169 ? compileThumbnailPrompt(plan, "16:9", mascotProfile) : null;
  const prompt916 = shouldGenerate916 ? compileThumbnailPrompt(plan, "9:16", mascotProfile) : null;

  const existingManifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  let history: ThumbnailHistoryItem[] = existingManifest?.history ? [...existingManifest.history] : [];

  let assetPath169: string | null = episode.thumbnail_asset_path_16_9;
  let assetPath916: string | null = episode.thumbnail_asset_path_9_16;
  let active169Id: string | undefined = existingManifest?.active_16_9_id;
  let active916Id: string | undefined = existingManifest?.active_9_16_id;

  const nowTimestamp = Date.now();

  if (shouldGenerate169 && prompt169) {
    const result169 = await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "16:9",
      prompt: prompt169,
      plan,
      options,
      logger,
      nowTimestamp,
    });
    assetPath169 = result169.assetPath;
    active169Id = result169.versionId;
    history = history.map((item) => (item.aspect_ratio === "16:9" ? { ...item, is_active: false } : item));
    history.unshift(result169.historyItem);
  }

  if (shouldGenerate916 && prompt916) {
    const result916 = await generateThumbnailVariant({
      repository,
      channel,
      episode,
      ratio: "9:16",
      prompt: prompt916,
      plan,
      options,
      logger,
      nowTimestamp,
    });
    assetPath916 = result916.assetPath;
    active916Id = result916.versionId;
    history = history.map((item) => (item.aspect_ratio === "9:16" ? { ...item, is_active: false } : item));
    history.unshift(result916.historyItem);
  }

  history = pruneVersionHistory(history);

  return persistThumbnailManifest({
    repository,
    channel,
    episode,
    plan,
    history,
    existingManifest,
    assetPath169,
    assetPath916,
    prompt169,
    prompt916,
    active169Id,
    active916Id,
  });
}
