import type { Channel, Episode, MascotProfile, ThumbnailHistoryItem, ThumbnailManifest } from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import { planThumbnailWithAI } from "./thumbnailAiPlanner.js";
import { compileThumbnailPrompt } from "./thumbnailPromptCompiler.js";
import { resolveEpisodeTargetLanguage, type loadProductLocalizationArtifact } from "../bank/localization/productLocalization.js";
import {
  generateThumbnailVariant,
  getEpisodeThumbnailManifest,
  persistThumbnailManifest,
  pruneVersionHistory,
  type GenerateEpisodeThumbnailOptions,
} from "./thumbnailManifestManager.js";
import {
  applyLocalizedQuestionProjection,
  loadChannelMascot,
  loadChannelMascotVisualAnchor,
  loadEpisodeQuestions,
} from "./thumbnailLoaders.js";
import type { MascotVisualAnchor, QuizThumbnailPlan } from "./thumbnailTypes.js";
import { validateThumbnailHook } from "./thumbnailHookGuardrail.js";
import { resolveTargetThumbnailRatio } from "./thumbnailRatio.js";
import { queueThumbnailOperation } from "./thumbnailOperationQueue.js";
import { createThumbnailFreshnessGuard } from "./thumbnailFreshness.js";

export type { GenerateEpisodeThumbnailOptions } from "./thumbnailManifestManager.js";
export {
  getEpisodeThumbnailManifest,
  setActiveThumbnailVersion,
  deleteThumbnailVersion,
  pruneVersionHistory,
} from "./thumbnailManifestManager.js";
export { resolveTargetThumbnailRatio } from "./thumbnailRatio.js";
export { applyLocalizedQuestionProjection, loadChannelMascot, loadChannelMascotVisualAnchor } from "./thumbnailLoaders.js";
export type { MascotVisualAnchor } from "./thumbnailTypes.js";
export const isValidShortHookText = (text: string | null | undefined): boolean => validateThumbnailHook(text).valid;

async function createThumbnailPlan(params: {
  episode: Episode;
  channel: Channel;
  questions: Array<{ question: string; choices?: string[]; answer?: string }>;
  mascotProfile: MascotProfile | null;
  localization: Awaited<ReturnType<typeof loadProductLocalizationArtifact>>;
  targetLanguage?: string;
  options: GenerateEpisodeThumbnailOptions;
}): Promise<QuizThumbnailPlan> {
  const { episode, channel, questions, mascotProfile, localization, targetLanguage, options } = params;
  const isApplied = localization?.status === "applied";
  const localizedHook = isApplied ? localization.thumbnail_text : undefined;
  const manualHook = options.customHookText?.trim();
  const effectiveCustomHook = manualHook || (isValidShortHookText(localizedHook) ? localizedHook?.trim() : undefined);

  return planThumbnailWithAI({
    topicTitle: episode.topic?.title || "Quiz Episode",
    topicSummary: (isApplied ? localization.video_description : undefined) || episode.topic?.premise || episode.topic?.hook || "",
    questionCount: episode.quiz_config?.question_count || (questions.length > 0 ? questions.length : 10),
    questionFormat: episode.quiz_config?.quiz_format,
    questions,
    language: targetLanguage || localization?.target_language || channel.language || "English",
    visualStyle: episode.quiz_config?.resolved_visual_style || episode.quiz_config?.visual_style || "pixar_3d",
    colorTheme: mascotProfile?.color_theme,
    layoutOverride: options.layoutOverride,
    customHookText: effectiveCustomHook,
    badgeOverride: options.badgeOverride || "auto",
    mascotProfile,
    llmClient: options.antigravityClient ?? null,
  });
}

async function processVariantGeneration(
  ratio: "16:9" | "9:16",
  prompt: string | null,
  shouldGenerate: boolean,
  currentAssetPath: string | null,
  currentActiveId: string | undefined,
  history: ThumbnailHistoryItem[],
  ctx: {
    repository: RepositoryService;
    channel: Channel;
    episode: Episode;
    plan: QuizThumbnailPlan;
    options: GenerateEpisodeThumbnailOptions;
    logger: StudioLogger;
    nowTimestamp: number;
    visualAnchor?: MascotVisualAnchor | null;
    assertCurrent: () => Promise<void>;
  },
): Promise<{ assetPath: string | null; activeId: string | undefined }> {
  if (!shouldGenerate || !prompt) return { assetPath: currentAssetPath, activeId: currentActiveId };
  const result = await generateThumbnailVariant({
    repository: ctx.repository,
    channel: ctx.channel,
    episode: ctx.episode,
    ratio,
    prompt,
    plan: ctx.plan,
    options: ctx.options,
    logger: ctx.logger,
    nowTimestamp: ctx.nowTimestamp,
    visualAnchor: ctx.visualAnchor,
    assertCurrent: ctx.assertCurrent,
  });
  for (let i = 0; i < history.length; i++) {
    const item = history[i];
    if (item && item.aspect_ratio === ratio) history[i] = { ...item, is_active: false };
  }
  history.unshift(result.historyItem);
  return { assetPath: result.assetPath, activeId: result.versionId };
}

/**
 * End-to-end service for planning, compiling, generating, and persisting Episode Thumbnails with full version history.
 */
export async function generateEpisodeThumbnail(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest> {
  return queueThumbnailOperation(repository, options.channelId, options.episodeId, () => generateThumbnail(repository, options));
}

async function generateThumbnail(repository: RepositoryService, options: GenerateEpisodeThumbnailOptions): Promise<ThumbnailManifest> {
  const { channelId, episodeId } = options;
  options.signal?.throwIfAborted();
  const assertCurrent = await createThumbnailFreshnessGuard(repository, channelId, episodeId);
  const logger = new StudioLogger(repository.rootDirectory);
  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const targetRatio = resolveTargetThumbnailRatio(episode, options.aspectRatio);
  const { targetLanguage, localization } = await resolveEpisodeTargetLanguage(repository, channelId, episode);

  const mascotProfile = await loadChannelMascot(repository, channelId, episodeId, channel.mascot_id, logger);
  const visualAnchor = await loadChannelMascotVisualAnchor(repository, channelId, episodeId, channel.mascot_id, logger);
  const sourceQuestions = await loadEpisodeQuestions(repository, channelId, episodeId);
  const questions = applyLocalizedQuestionProjection(sourceQuestions, localization);
  const plan = await createThumbnailPlan({ episode, channel, questions, mascotProfile, localization, targetLanguage, options });
  options.signal?.throwIfAborted();

  const existingManifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  const should169 = targetRatio === "16:9" || targetRatio === "both";
  const should916 = targetRatio === "9:16" || targetRatio === "both";
  const prompt169 = should169 ? compileThumbnailPrompt(plan, "16:9", mascotProfile, visualAnchor) : null;
  const prompt916 = should916 ? compileThumbnailPrompt(plan, "9:16", mascotProfile, visualAnchor) : null;
  const history: ThumbnailHistoryItem[] = existingManifest?.history ? [...existingManifest.history] : [];
  const ctx = { repository, channel, episode, plan, options, logger, nowTimestamp: Date.now(), visualAnchor, assertCurrent };

  const gen169 = await processVariantGeneration(
    "16:9",
    prompt169,
    should169,
    episode.thumbnail_asset_path_16_9,
    existingManifest?.active_16_9_id,
    history,
    ctx,
  );
  const gen916 = await processVariantGeneration(
    "9:16",
    prompt916,
    should916,
    episode.thumbnail_asset_path_9_16,
    existingManifest?.active_9_16_id,
    history,
    ctx,
  );

  options.signal?.throwIfAborted();
  await assertCurrent();
  return persistThumbnailManifest({
    repository,
    channel,
    episode,
    plan,
    history: pruneVersionHistory(history),
    existingManifest,
    assetPath169: gen169.assetPath,
    assetPath916: gen916.assetPath,
    prompt169,
    prompt916,
    active169Id: gen169.activeId,
    active916Id: gen916.activeId,
  });
}

export const generateEpisodeThumbnails = generateEpisodeThumbnail;
