import path from "node:path";
import {
  makeId,
  nowIso,
  type Episode,
  type QuizQuestion,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import type { TaskManager } from "../../../tasks.js";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import {
  assertConfirmationReplayOrConflict,
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
} from "../../../repository/topicConfirmationReceipts.js";
import { localizeProductContent } from "../localization/productLocalization.js";
import { resolveBoundTopicSources } from "./boundSourceResolver.js";
import { convertBankQuestionToQuizQuestionLossless } from "./bankQuestionConverter.js";
import {
  resolveRenderAspect,
  triggerPipelineTask,
} from "./bootstrapperHelpers.js";
import { withTopicConfirmationLock } from "./topicConfirmationLock.js";
import { stageAndPublishTopicEpisodeFiles } from "./episodeStagingPublisher.js";
import {
  findAndValidateTopicCandidate,
  buildConfirmationOptions,
  applyLocalizedQuestionOverrides,
  buildConfiguredEpisode,
  buildSourcesMarkdown,
} from "./topicEpisodeConfig.js";
import type {
  CreateEpisodeFromTopicWithBankInput,
  CreateEpisodeFromTopicWithBankResult,
} from "./bankEpisodeBootstrapper.js";

/**
 * Handles replay of previously completed confirmation receipts, verifying integrity and reconciling state.
 */
export async function handleExistingConfirmationReceipt(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
  incomingOptions: TopicConfirmationOptions,
  _targetLanguage: string,
): Promise<CreateEpisodeFromTopicWithBankResult | null> {
  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, topicId);
  if (!existingReceipt) {
    return null;
  }

  assertConfirmationReplayOrConflict(existingReceipt, incomingOptions, "episode");
  if (existingReceipt.status !== "completed") {
    return null;
  }

  const existingEpisode = await repository.getEpisode(channelId, existingReceipt.product_id);
  const existingQuiz = await repository.readQuiz(channelId, existingEpisode.episode_id);
  const existingDirectorPlan = await repository.readDirectorPlan(channelId, existingEpisode.episode_id);

  if (!existingQuiz || !Array.isArray(existingQuiz.questions) || existingQuiz.questions.length === 0) {
    throw new RepositoryError("CONFIRMATION_PRODUCT_CORRUPT: Completed episode quiz is missing or empty.", "CONFIRMATION_PRODUCT_CORRUPT");
  }
  const beats =
    (existingDirectorPlan as { beats?: unknown[]; scenes?: unknown[] })?.beats ?? (existingDirectorPlan as { scenes?: unknown[] })?.scenes;
  if (!existingDirectorPlan || !Array.isArray(beats) || beats.length === 0) {
    throw new RepositoryError(
      "CONFIRMATION_PRODUCT_CORRUPT: Completed episode director plan is missing or empty.",
      "CONFIRMATION_PRODUCT_CORRUPT",
    );
  }

  const existingHistory = await repository.readQuestionHistory(channelId);
  const hasHistory = existingHistory.some((entry) => entry.episode_id === existingEpisode.episode_id);
  if (!hasHistory && existingQuiz.questions.length > 0) {
    await repository.appendQuestionHistory(channelId, existingEpisode.episode_id, existingQuiz.questions, 30);
  }

  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (topic && !topic.selected) {
    await repository.markTopicSelected(channelId, topicId, existingReceipt.source_question_ids.length);
  }

  return {
    episode: existingEpisode,
    task: null,
    quiz: existingQuiz,
    director_plan: existingDirectorPlan,
    curated_source: "bank_only",
    question_ids: existingReceipt.source_question_ids,
    cooldown_recorded: true,
  };
}

/** Records post-staging completion effects: history, topic selection, channel update, and durable receipt. */
async function recordConfirmationCompletion(params: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  channelSlug: string;
  episode: Episode;
  topicId: string;
  finalQuizQuestions: QuizQuestion[];
  incomingOptions: TopicConfirmationOptions;
  boundResult: { questionIds: string[]; sourceContentHashes: string[] };
  effectiveRequestId: string;
  timestamp: string;
  autoStartPipeline?: boolean;
}): Promise<CreateEpisodeFromTopicWithBankResult["task"]> {
  const {
    repository,
    tasks,
    channelId,
    channelSlug,
    episode,
    topicId,
    finalQuizQuestions,
    incomingOptions,
    boundResult,
    effectiveRequestId,
    timestamp,
    autoStartPipeline,
  } = params;

  await repository.appendQuestionHistory(channelId, episode.episode_id, finalQuizQuestions, 30);
  await repository.markTopicSelected(channelId, topicId, finalQuizQuestions.length);
  await repository.updateChannel(channelId, { updated_at: timestamp });

  await repository.writeJsonAtomic(
    path.join(repository.resolvePath("channels", channelSlug), "topic_database.json"),
    (await repository.listTopics(channelId)).map(({ title, premise }) => ({ title, premise })),
  );

  await saveTopicConfirmationReceipt(repository, channelId, {
    receipt_id: `rec-${episode.episode_id}`,
    channel_id: channelId,
    topic_id: topicId,
    content_kind: "episode",
    product_id: episode.episode_id,
    product_slug: episode.slug,
    confirmed_at: timestamp,
    request_id: effectiveRequestId,
    options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
    options: incomingOptions,
    source_question_ids: boundResult.questionIds,
    source_content_hashes: boundResult.sourceContentHashes,
    status: "completed",
  });

  return triggerPipelineTask(tasks, channelId, episode.episode_id, autoStartPipeline !== false);
}

/**
 * Executes the core episode confirmation pipeline from a validated topic candidate.
 */
export async function executeEpisodeConfirmation(deps: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateEpisodeFromTopicWithBankInput;
  llmClient?: LLMClient | null;
}): Promise<CreateEpisodeFromTopicWithBankResult> {
  const { repository, tasks, channelId, input } = deps;
  if (input.render_aspect_ratio && (input.render_aspect_ratio as string) !== "16:9") {
    throw new RepositoryError("Episode creation only supports 16:9 landscape", "UNSUPPORTED_ASPECT_RATIO");
  }
  const channel = await repository.getChannel(channelId);

  const topic = await findAndValidateTopicCandidate(repository, channelId, input.topic_id);
  const { targetLanguage, incomingOptions } = buildConfirmationOptions(input, topic, channel.language);

  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, input.topic_id);
  if (existingReceipt) {
    const replayResult = await handleExistingConfirmationReceipt(repository, channelId, input.topic_id, incomingOptions, targetLanguage);
    if (replayResult) {
      return replayResult;
    }
  }

  const isPreparingRetry = existingReceipt?.status === "preparing";
  const boundResult = await resolveBoundTopicSources({
    repository,
    channelId,
    topicId: input.topic_id,
    requestedQuestionCount: incomingOptions.question_count,
    force: Boolean(input.force || isPreparingRetry),
  });

  const baseQuizQuestions: QuizQuestion[] = boundResult.questions.map((bankQ, idx) => {
    const q = convertBankQuestionToQuizQuestionLossless(bankQ);
    q.number = idx + 1;
    return q;
  });

  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = existingReceipt?.product_slug || (await repository.uniqueSlug(topic.title, parentDir));
  const episodeId = existingReceipt?.product_id || makeId("ep");
  const timestamp = nowIso();

  const explicitThumbnailText = input.custom_hook_text?.trim() || input.thumbnail_text?.trim() || undefined;
  const localizationArtifact = await localizeProductContent({
    targetLanguage,
    productId: episodeId,
    contentKind: "episode",
    sourceQuestionIds: boundResult.questionIds,
    sourceContentHashes: boundResult.sourceContentHashes,
    quizQuestions: baseQuizQuestions,
    videoDescription: topic.premise,
    thumbnailText: explicitThumbnailText,
    llmClient: deps.llmClient,
  });

  const finalQuizQuestions = applyLocalizedQuestionOverrides(baseQuizQuestions, localizationArtifact, targetLanguage);
  const renderAspect = resolveRenderAspect(input.render_aspect_ratio);

  const { episode, quiz, directorPlan } = buildConfiguredEpisode({
    episodeId,
    channel,
    episodeSlug,
    topic,
    finalQuizQuestions,
    renderAspect,
    targetLanguage,
    timestamp,
    inputVisualStyle: input.visual_style,
  });

  const effectiveRequestId = input.request_id || existingReceipt?.request_id || `req-confirm-${Date.now()}`;
  await saveTopicConfirmationReceipt(repository, channelId, {
    receipt_id: existingReceipt?.receipt_id || `rec-${episode.episode_id}`,
    channel_id: channelId,
    topic_id: topic.topic_id,
    content_kind: "episode",
    product_id: episode.episode_id,
    product_slug: episode.slug,
    confirmed_at: existingReceipt?.confirmed_at || timestamp,
    request_id: effectiveRequestId,
    options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
    options: incomingOptions,
    source_question_ids: boundResult.questionIds,
    source_content_hashes: boundResult.sourceContentHashes,
    status: "preparing",
  });

  const sourcesContent = buildSourcesMarkdown(boundResult.questionIds, boundResult.sourceContentHashes);

  await stageAndPublishTopicEpisodeFiles({
    repository,
    channelSlug: channel.slug,
    parentDir,
    episodeSlug,
    episode,
    quiz,
    directorPlan,
    localizationArtifact,
    sourcesContent,
    topic,
    isPreparingReceipt: existingReceipt?.status === "preparing",
  });

  const task = await recordConfirmationCompletion({
    repository,
    tasks,
    channelId,
    channelSlug: channel.slug,
    episode,
    topicId: topic.topic_id,
    finalQuizQuestions,
    incomingOptions,
    boundResult,
    effectiveRequestId,
    timestamp,
    autoStartPipeline: input.auto_start_pipeline,
  });

  return {
    episode,
    task,
    quiz,
    director_plan: directorPlan,
    curated_source: "bank_only",
    question_ids: boundResult.questionIds,
    cooldown_recorded: true,
  };
}

/**
 * Creates an episode from a topic candidate with bound Question Bank sources,
 * wrapped in a per-topic mutex lock to prevent race conditions.
 */
export async function createEpisodeFromTopicWithBank(deps: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateEpisodeFromTopicWithBankInput;
  llmClient?: LLMClient | null;
}): Promise<CreateEpisodeFromTopicWithBankResult> {
  return withTopicConfirmationLock(deps.channelId, deps.input.topic_id, () =>
    executeEpisodeConfirmation(deps),
  );
}

export const createEpisodeFromTopicCandidate = createEpisodeFromTopicWithBank;
