import {
  type Channel,
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
import { loadProductLocalizationArtifact, resolveEpisodeTargetLanguage } from "../bank/localization/productLocalization.js";
import {
  generateThumbnailVariant,
  getEpisodeThumbnailManifest,
  persistThumbnailManifest,
  pruneVersionHistory,
  type GenerateEpisodeThumbnailOptions,
} from "./thumbnailManifestManager.js";
import type { QuizThumbnailPlan } from "./thumbnailTypes.js";
import { validateThumbnailHook } from "./thumbnailHookGuardrail.js";

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

  return "16:9";
}

async function loadChannelMascot(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  mascotId?: string | null,
  logger?: StudioLogger,
): Promise<MascotProfile | null> {
  if (!mascotId) return null;
  try {
    return await repository.getMascot(mascotId);
  } catch {
    logger?.warn(`Assigned mascot ${mascotId} not found, proceeding with default persona`, {
      profileId: channelId,
      workerId: episodeId,
    });
    return null;
  }
}

async function loadEpisodeQuestions(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
): Promise<Array<{ question: string; choices?: string[]; answer?: string }>> {
  try {
    const scenes = (await repository.readScenes(channelId, episodeId)) as unknown[];
    const result: Array<{ question: string; choices?: string[]; answer?: string }> = [];

    for (const s of scenes) {
      if (!s || typeof s !== "object" || !("quiz" in s)) continue;
      const quiz = (s as { quiz?: unknown }).quiz;
      if (!quiz || typeof quiz !== "object" || !("question" in quiz)) continue;
      const q = quiz as { question?: unknown; choices?: unknown; answer?: unknown };
      if (typeof q.question === "string" && q.question.trim().length > 0) {
        result.push({
          question: q.question,
          choices: Array.isArray(q.choices) ? q.choices.filter((c): c is string => typeof c === "string") : undefined,
          answer: typeof q.answer === "string" ? q.answer : undefined,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function applyLocalizedQuestionProjection(
  questions: Array<{ question: string; choices?: string[]; answer?: string }>,
  localization: Awaited<ReturnType<typeof loadProductLocalizationArtifact>>,
): Array<{ question: string; choices?: string[]; answer?: string }> {
  if (!localization || localization.status !== "applied" || localization.quiz_questions.length === 0) return questions;
  const localized = localization.quiz_questions;
  return questions.map((question, index) => {
    const translated = localized[index];
    if (!translated) return question;
    const answer = question.answer;
    const answerIndex = question.choices?.findIndex((choice) => choice === answer) ?? -1;
    return {
      question: translated.question,
      choices: translated.choices.map((choice) => choice.text),
      answer: answerIndex >= 0 ? translated.choices[answerIndex]?.text || answer : answer,
    };
  });
}

interface VariantGenerationState {
  assetPath: string | null;
  activeId: string | undefined;
}

async function processVariantGeneration(params: {
  ratio: "16:9" | "9:16";
  prompt: string | null;
  shouldGenerate: boolean;
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  plan: QuizThumbnailPlan;
  options: GenerateEpisodeThumbnailOptions;
  logger: StudioLogger;
  nowTimestamp: number;
  currentAssetPath: string | null;
  currentActiveId: string | undefined;
  history: ThumbnailHistoryItem[];
}): Promise<VariantGenerationState> {
  if (!params.shouldGenerate || !params.prompt) {
    return { assetPath: params.currentAssetPath, activeId: params.currentActiveId };
  }
  const result = await generateThumbnailVariant({
    repository: params.repository,
    channel: params.channel,
    episode: params.episode,
    ratio: params.ratio,
    prompt: params.prompt,
    plan: params.plan,
    options: params.options,
    logger: params.logger,
    nowTimestamp: params.nowTimestamp,
  });
  for (let i = 0; i < params.history.length; i++) {
    const item = params.history[i];
    if (item && item.aspect_ratio === params.ratio) {
      params.history[i] = { ...item, is_active: false };
    }
  }
  params.history.unshift(result.historyItem);
  return { assetPath: result.assetPath, activeId: result.versionId };
}

function resolvePlanTopicSummary(episode: Episode, localizedSummary?: string): string {
  if (localizedSummary) return localizedSummary;
  if (episode.topic?.premise) return episode.topic.premise;
  if (episode.topic?.hook) return episode.topic.hook;
  return "";
}

function resolvePlanQuestionCount(episode: Episode, questionCount: number): number {
  if (episode.quiz_config?.question_count) {
    return episode.quiz_config.question_count;
  }
  return questionCount > 0 ? questionCount : 10;
}

/**
 * Checks whether a candidate hook text is concise enough to serve as a punchy thumbnail hook banner.
 * Delegates directly to validateThumbnailHook to maintain a single source of truth.
 */
export function isValidShortHookText(text: string | null | undefined): boolean {
  return validateThumbnailHook(text).valid;
}

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
  const localizedSummary = localization?.status === "applied" ? localization.video_description : undefined;
  const localizedHook = localization?.status === "applied" ? localization.thumbnail_text : undefined;

  // options.customHookText is treated as a true user manual override.
  // localizedHook from product artifacts is only used if it is a valid, punchy short hook (<= 6 words, <= 36 chars);
  // otherwise, leave undefined so the AI Planner can generate parsed.hook_text or fallback to archetype templates.
  const manualHook = options.customHookText?.trim();
  const effectiveCustomHook = manualHook || (isValidShortHookText(localizedHook) ? localizedHook?.trim() : undefined);

  return planThumbnailWithAI({
    topicTitle: episode.topic?.title || "Quiz Episode",
    topicSummary: resolvePlanTopicSummary(episode, localizedSummary),
    questionCount: resolvePlanQuestionCount(episode, questions.length),
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

async function generateThumbnailVariants(params: {
  targetRatio: ThumbnailAspectRatio | "both";
  plan: QuizThumbnailPlan;
  mascotProfile: MascotProfile | null;
  repository: RepositoryService;
  channel: Channel;
  episode: Episode;
  options: GenerateEpisodeThumbnailOptions;
  logger: StudioLogger;
  existingManifest: ThumbnailManifest | null;
}): Promise<{
  gen169: VariantGenerationState;
  gen916: VariantGenerationState;
  prompt169: string | null;
  prompt916: string | null;
  history: ThumbnailHistoryItem[];
}> {
  const { targetRatio, plan, mascotProfile, repository, channel, episode, options, logger, existingManifest } = params;
  const shouldGenerate169 = targetRatio === "16:9" || targetRatio === "both";
  const shouldGenerate916 = targetRatio === "9:16" || targetRatio === "both";

  const prompt169 = shouldGenerate169 ? compileThumbnailPrompt(plan, "16:9", mascotProfile) : null;
  const prompt916 = shouldGenerate916 ? compileThumbnailPrompt(plan, "9:16", mascotProfile) : null;

  const history: ThumbnailHistoryItem[] = existingManifest?.history ? [...existingManifest.history] : [];
  const nowTimestamp = Date.now();

  const gen169 = await processVariantGeneration({
    ratio: "16:9",
    prompt: prompt169,
    shouldGenerate: shouldGenerate169,
    repository,
    channel,
    episode,
    plan,
    options,
    logger,
    nowTimestamp,
    currentAssetPath: episode.thumbnail_asset_path_16_9,
    currentActiveId: existingManifest?.active_16_9_id,
    history,
  });

  const gen916 = await processVariantGeneration({
    ratio: "9:16",
    prompt: prompt916,
    shouldGenerate: shouldGenerate916,
    repository,
    channel,
    episode,
    plan,
    options,
    logger,
    nowTimestamp,
    currentAssetPath: episode.thumbnail_asset_path_9_16,
    currentActiveId: existingManifest?.active_9_16_id,
    history,
  });

  return { gen169, gen916, prompt169, prompt916, history };
}

/**
 * End-to-end service for planning, compiling, generating, and persisting Episode Thumbnails with full version history.
 */
export async function generateEpisodeThumbnail(
  repository: RepositoryService,
  options: GenerateEpisodeThumbnailOptions,
): Promise<ThumbnailManifest> {
  const { channelId, episodeId } = options;
  const logger = new StudioLogger(repository.rootDirectory);

  const episode = await repository.getEpisode(channelId, episodeId);
  const channel = await repository.getChannel(channelId);
  const targetRatio = resolveTargetThumbnailRatio(episode, options.aspectRatio);
  const { targetLanguage, localization } = await resolveEpisodeTargetLanguage(repository, channelId, episode);

  const mascotProfile = await loadChannelMascot(repository, channelId, episodeId, channel.mascot_id, logger);
  const sourceQuestions = await loadEpisodeQuestions(repository, channelId, episodeId);
  const questions = applyLocalizedQuestionProjection(sourceQuestions, localization);

  const plan = await createThumbnailPlan({
    episode,
    channel,
    questions,
    mascotProfile,
    localization,
    targetLanguage,
    options,
  });

  const existingManifest = await getEpisodeThumbnailManifest(repository, channelId, episodeId);
  const { gen169, gen916, prompt169, prompt916, history } = await generateThumbnailVariants({
    targetRatio,
    plan,
    mascotProfile,
    repository,
    channel,
    episode,
    options,
    logger,
    existingManifest,
  });

  const prunedHistory = pruneVersionHistory(history);

  return persistThumbnailManifest({
    repository,
    channel,
    episode,
    plan,
    history: prunedHistory,
    existingManifest,
    assetPath169: gen169.assetPath,
    assetPath916: gen916.assetPath,
    prompt169,
    prompt916,
    active169Id: gen169.activeId,
    active916Id: gen916.activeId,
  });
}
