import { cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import {
  getQuizGameplayArchetype,
  hashBankQuestionSource,
  makeId,
  nowIso,
  QuizV2Schema,
  type Channel,
  type DirectorPlan,
  type Episode,
  type EpisodeTopicCandidate,
  type QuizImageStyle,
  type QuizQuestion,
  type QuizV2,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../../repository/helpers.js";
import type { TaskManager } from "../../tasks.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { resolveBoundTopicSources } from "./bridge/boundSourceResolver.js";
import {
  assertConfirmationReplayOrConflict,
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
} from "../../repository/topicConfirmationReceipts.js";
import { localizeProductContent, normalizeTargetLanguage } from "./localization/productLocalization.js";
import {
  convertBankQuestionToQuizQuestion,
  convertBankQuestionToQuizQuestionLossless,
  buildSingleQuestionDirectorPlan,
  buildTopicDirectorPlan,
  resolveTargetLayoutForTopic,
  resolveEpisodeVisualStyles,
  triggerPipelineTask,
  buildEpisodeRecord,
  resolveRenderAspect,
  writeEpisodeMarkdownStubs,
  type ConvertBankQuestionOptions,
  type CreateEpisodeFromQuestionBankInput,
  type CreateEpisodeFromQuestionBankResult,
  type CreateEpisodeFromTopicWithBankInput,
  type CreateEpisodeFromTopicWithBankResult,
} from "./bridge/index.js";

export {
  convertBankQuestionToQuizQuestion,
  convertBankQuestionToQuizQuestionLossless,
  type ConvertBankQuestionOptions,
  type CreateEpisodeFromQuestionBankInput,
  type CreateEpisodeFromQuestionBankResult,
  type CreateEpisodeFromTopicWithBankInput,
  type CreateEpisodeFromTopicWithBankResult,
};

async function publishStagedEpisode(stagingDir: string, finalDir: string, replaceExisting = false): Promise<void> {
  if (replaceExisting) {
    await rm(finalDir, { recursive: true, force: true });
  }
  try {
    await rename(stagingDir, finalDir);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "EXDEV") {
      await cp(stagingDir, finalDir, { recursive: true });
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    } else {
      throw err;
    }
  }
}

export async function createEpisodeFromQuestionBank(deps: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateEpisodeFromQuestionBankInput;
  llmClient?: LLMClient | null;
}): Promise<CreateEpisodeFromQuestionBankResult> {
  const { repository, tasks, channelId, input } = deps;
  if (input.render_aspect_ratio && (input.render_aspect_ratio as string) !== "16:9") {
    throw new RepositoryError("Episode creation only supports 16:9 landscape", "UNSUPPORTED_ASPECT_RATIO");
  }
  const channel = await repository.getChannel(channelId);
  const bankQuestion = await repository.getQuestionBankQuestion(input.question_id, channelId);
  if (!bankQuestion) {
    throw new RepositoryError(`Question not found: ${input.question_id}`, "QUESTION_NOT_FOUND");
  }

  const isCooldown = Boolean(bankQuestion.channel_cooldown?.is_cooldown);
  if (isCooldown && !input.force) {
    const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
    throw new RepositoryError(
      `Question ${input.question_id} is in 30-day cooldown for channel ${channelId} (${days} days remaining). Set force=true to override.`,
      "QUESTION_IN_COOLDOWN",
    );
  }

  const targetLanguage = normalizeTargetLanguage(input.target_language || channel.language || "en");
  const baseQuizQuestion = convertBankQuestionToQuizQuestionLossless(bankQuestion);
  baseQuizQuestion.number = 1;

  const blueprint = getQuizGameplayArchetype(bankQuestion.archetype_id);
  const targetLayout = blueprint?.targetLayout ?? "full_stack_list";
  const renderAspect = resolveRenderAspect(input.render_aspect_ratio);
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, input.visual_style);

  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = await repository.uniqueSlug(`shorts-${bankQuestion.archetype_id}-${Date.now().toString(36)}`, parentDir);
  const episodeId = makeId("ep");
  const timestamp = nowIso();

  // Localize before creating any discoverable episode record on disk
  const explicitThumbnailText = input.custom_hook_text?.trim() || input.thumbnail_text?.trim() || undefined;
  const localizationArtifact = await localizeProductContent({
    targetLanguage,
    productId: episodeId,
    contentKind: "episode",
    sourceQuestionIds: [bankQuestion.id],
    sourceContentHashes: [hashBankQuestionSource(bankQuestion)],
    quizQuestions: [baseQuizQuestion],
    videoDescription: bankQuestion.explanation,
    thumbnailText: explicitThumbnailText,
    llmClient: deps.llmClient,
  });

  let quizQuestion = baseQuizQuestion;
  if (targetLanguage !== "en" && localizationArtifact.quiz_questions?.[0]) {
    const loc = localizationArtifact.quiz_questions[0];
    const choiceMap = new Map(loc.choices.map((c) => [c.id, c.text]));
    quizQuestion = {
      ...baseQuizQuestion,
      question: loc.question,
      explanation: loc.explanation || baseQuizQuestion.explanation,
      choices: baseQuizQuestion.choices.map((c) => ({
        ...c,
        text: choiceMap.get(c.id) || c.text,
      })),
    };
  }

  const title = `Shorts Quiz: ${bankQuestion.question.slice(0, 50)}`;
  const premise = bankQuestion.explanation;
  const hook = bankQuestion.question;

  const episode = buildEpisodeRecord({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    title,
    premise,
    hook,
    targetDurationMinutes: 3,
    targetWordCount: 50,
    questionCount: 3,
    quizFormat: quizQuestion.format,
    ageBand: bankQuestion.age_band,
    visualTheme: "candy_pop",
    requestedStyle,
    resolvedStyle,
    channel,
    renderAspect,
    archetype: bankQuestion.archetype_id,
    targetLayout,
    timestamp,
  });

  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: bankQuestion.age_band,
    language: targetLanguage,
    questions: [quizQuestion],
  });

  const directorPlan = buildSingleQuestionDirectorPlan({
    episodeId,
    quizQuestion,
    archetypeId: bankQuestion.archetype_id,
    channel,
    targetLayout,
  });

  const stagingDir = repository.resolvePath("channels", channel.slug, ".staging", episodeSlug);
  await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(path.join(stagingDir, "assets"), { recursive: true });
  await mkdir(path.join(stagingDir, "quiz"), { recursive: true });

  try {
    await repository.writeJsonAtomic(path.join(stagingDir, "episode.json"), episode);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "quiz-v2.json"), quiz);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "director-plan.json"), directorPlan);
    await repository.writeJsonAtomic(path.join(stagingDir, "localization.json"), localizationArtifact);
    await writeEpisodeMarkdownStubs(repository, stagingDir, { title, hook, premise });

    const finalEpisodeDir = path.join(parentDir, episodeSlug);
    await publishStagedEpisode(stagingDir, finalEpisodeDir);
  } catch (stageErr) {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw stageErr;
  }

  await repository.appendQuestionHistory(channelId, episode.episode_id, [quizQuestion]);
  const task = triggerPipelineTask(tasks, channelId, episode.episode_id, input.auto_start_pipeline !== false);
  await repository.updateChannel(channelId, { updated_at: timestamp });

  return { episode, task, cooldown_recorded: true, quiz, director_plan: directorPlan };
}

export const createEpisodeFromBankQuestions = createEpisodeFromQuestionBank;

/** In-memory mutex map ensuring concurrent confirmations for the same topic serialize cleanly. */
const topicConfirmationLocks = new Map<string, Promise<unknown>>();

export async function createEpisodeFromTopicWithBank(deps: {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateEpisodeFromTopicWithBankInput;
  llmClient?: LLMClient | null;
}): Promise<CreateEpisodeFromTopicWithBankResult> {
  const { channelId, input } = deps;
  const lockKey = `${channelId}:${input.topic_id}`;

  while (topicConfirmationLocks.has(lockKey)) {
    try {
      await topicConfirmationLocks.get(lockKey);
    } catch {
      // Prior attempt errors do not block subsequent serial attempts.
    }
  }

  let releaseLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  topicConfirmationLocks.set(lockKey, lockPromise);

  try {
    return await executeEpisodeConfirmation(deps);
  } finally {
    topicConfirmationLocks.delete(lockKey);
    releaseLock();
  }
}

async function handleExistingConfirmationReceipt(
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

  // Reconcile question history if missing
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

async function findAndValidateTopicCandidate(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
): Promise<EpisodeTopicCandidate> {
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  if (topic.content_kind === "short_reel") {
    throw new RepositoryError("Cannot create episode from short-reel topic candidate", "INVALID_TOPIC_KIND");
  }

  if (!topic.source_bindings || topic.source_bindings.length === 0) {
    throw new RepositoryError(
      "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
      "UNBOUND_LEGACY_TOPIC",
    );
  }

  return topic;
}

function applyLocalizedQuestionOverrides(
  baseQuizQuestions: QuizQuestion[],
  localizationArtifact: Awaited<ReturnType<typeof localizeProductContent>>,
  targetLanguage: string,
): QuizQuestion[] {
  if (targetLanguage === "en" || !localizationArtifact.quiz_questions) {
    return baseQuizQuestions;
  }

  const locMap = new Map(localizationArtifact.quiz_questions.map((l) => [l.question_id, l]));
  return baseQuizQuestions.map((q) => {
    const loc = locMap.get(q.id);
    if (!loc) return q;
    const choiceMap = new Map(loc.choices.map((c) => [c.id, c.text]));
    return {
      ...q,
      question: loc.question,
      explanation: loc.explanation || q.explanation,
      choices: q.choices.map((c) => ({
        ...c,
        text: choiceMap.get(c.id) || c.text,
      })),
    };
  });
}

function buildConfiguredEpisode(params: {
  episodeId: string;
  channel: Channel;
  episodeSlug: string;
  topic: EpisodeTopicCandidate;
  finalQuizQuestions: QuizQuestion[];
  renderAspect: "16:9";
  targetLanguage: string;
  timestamp: string;
  inputVisualStyle?: QuizImageStyle | "mixed";
}): {
  episode: Episode;
  quiz: QuizV2;
  directorPlan: DirectorPlan;
} {
  const { episodeId, channel, episodeSlug, topic, finalQuizQuestions, renderAspect, targetLanguage, timestamp, inputVisualStyle } = params;
  const targetLayout = resolveTargetLayoutForTopic(topic, renderAspect);
  const blueprint = topic.archetype ? getQuizGameplayArchetype(topic.archetype) : undefined;
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, inputVisualStyle ?? topic.visual_style);
  const targetDurationMinutes = estimateQuizTargetDurationMinutes(finalQuizQuestions.length);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);
  const ageBand = topic.age_band || "family";

  const defaultFormat = blueprint?.defaultFormat ?? finalQuizQuestions[0]?.format ?? topic.quiz_format ?? "multiple_choice";
  const visualTheme = topic.quiz_format === "image_guess" || topic.archetype === "mystery_reveal" ? "jungle_jamboree" : "candy_pop";

  const episode = buildEpisodeRecord({
    episodeId,
    channelId: channel.channel_id,
    channelSlug: channel.slug,
    episodeSlug,
    title: topic.title,
    premise: topic.premise,
    hook: topic.hook,
    targetDurationMinutes,
    targetWordCount,
    questionCount: finalQuizQuestions.length,
    quizFormat: defaultFormat,
    ageBand,
    visualTheme,
    requestedStyle,
    resolvedStyle,
    channel,
    renderAspect,
    archetype: topic.archetype,
    targetLayout,
    timestamp,
  });

  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: ageBand,
    language: targetLanguage,
    questions: finalQuizQuestions,
  });

  const directorPlan = buildTopicDirectorPlan(quiz, topic, channel, targetLayout, renderAspect);

  return { episode, quiz, directorPlan };
}

async function stageAndPublishEpisodeFiles(params: {
  repository: RepositoryService;
  channelSlug: string;
  parentDir: string;
  episodeSlug: string;
  episode: Episode;
  quiz: QuizV2;
  directorPlan: DirectorPlan;
  localizationArtifact: Awaited<ReturnType<typeof localizeProductContent>>;
  sourcesContent: string;
  topic: EpisodeTopicCandidate;
  isPreparingReceipt: boolean;
}): Promise<void> {
  const {
    repository,
    channelSlug,
    parentDir,
    episodeSlug,
    episode,
    quiz,
    directorPlan,
    localizationArtifact,
    sourcesContent,
    topic,
    isPreparingReceipt,
  } = params;

  const stagingDir = repository.resolvePath("channels", channelSlug, ".staging", episodeSlug);
  await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(path.join(stagingDir, "assets"), { recursive: true });
  await mkdir(path.join(stagingDir, "quiz"), { recursive: true });

  try {
    await repository.writeJsonAtomic(path.join(stagingDir, "episode.json"), episode);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "quiz-v2.json"), quiz);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "director-plan.json"), directorPlan);
    await repository.writeJsonAtomic(path.join(stagingDir, "localization.json"), localizationArtifact);
    await repository.writeTextAtomic(path.join(stagingDir, "sources.md"), sourcesContent);
    await writeEpisodeMarkdownStubs(repository, stagingDir, {
      title: topic.title,
      hook: topic.hook,
      premise: topic.premise,
      isTopic: true,
    });

    const finalEpisodeDir = path.join(parentDir, episodeSlug);
    await publishStagedEpisode(stagingDir, finalEpisodeDir, isPreparingReceipt);
  } catch (stageErr) {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw stageErr;
  }
}

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

  // 1. Append question history FIRST
  await repository.appendQuestionHistory(channelId, episode.episode_id, finalQuizQuestions, 30);

  // 2. Mark topic selected
  await repository.markTopicSelected(channelId, topicId, finalQuizQuestions.length);

  // 3. Update channel
  await repository.updateChannel(channelId, { updated_at: timestamp });

  // 4. Update topic database
  await repository.writeJsonAtomic(
    path.join(repository.resolvePath("channels", channelSlug), "topic_database.json"),
    (await repository.listTopics(channelId)).map(({ title, premise }) => ({ title, premise })),
  );

  // 5. Durably save completed receipt ONLY AFTER all required effects succeeded!
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

async function executeEpisodeConfirmation(deps: {
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

  // 1. Retrieve topic candidate and establish effective options from candidate defaults upfront
  const topic = await findAndValidateTopicCandidate(repository, channelId, input.topic_id);
  const targetLanguage = normalizeTargetLanguage(input.target_language || channel.language || "en");
  const questionCount = input.question_count ?? topic.question_count ?? 8;
  const visualStyle = input.visual_style ?? topic.visual_style ?? "mixed";
  const incomingOptions: TopicConfirmationOptions = {
    question_count: questionCount,
    visual_style: visualStyle,
    render_aspect_ratio: "16:9",
    target_language: targetLanguage,
    ...(input.custom_hook_text ? { custom_hook_text: input.custom_hook_text.trim() } : {}),
    ...(input.thumbnail_text ? { thumbnail_text: input.thumbnail_text.trim() } : {}),
  };

  // 2. Check existing confirmation receipt for durable replay / conflict
  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, input.topic_id);
  if (existingReceipt) {
    const replayResult = await handleExistingConfirmationReceipt(repository, channelId, input.topic_id, incomingOptions, targetLanguage);
    if (replayResult) {
      return replayResult;
    }
  }

  // 3. Resolve bound topic sources authoritatively
  const isPreparingRetry = existingReceipt?.status === "preparing";
  const boundResult = await resolveBoundTopicSources({
    repository,
    channelId,
    topicId: input.topic_id,
    requestedQuestionCount: questionCount,
    force: Boolean(input.force || isPreparingRetry),
  });

  // 4. Losslessly convert Bank questions to base English QuizQuestions
  const baseQuizQuestions: QuizQuestion[] = boundResult.questions.map((bankQ, idx) => {
    const q = convertBankQuestionToQuizQuestionLossless(bankQ);
    q.number = idx + 1;
    return q;
  });

  // 5. Reserve deterministic identity in memory before any disk operations
  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = existingReceipt?.product_slug || (await repository.uniqueSlug(topic.title, parentDir));
  const episodeId = existingReceipt?.product_id || makeId("ep");
  const timestamp = nowIso();

  // 6. Product localization
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

  const sourcesContent = [
    "# Question Bank Sources",
    "",
    ...boundResult.questionIds.map((id, idx) => `- **${id}**: hash=${boundResult.sourceContentHashes[idx]}`),
    "",
  ].join("\n");

  // 7. Staging complete artifacts outside discoverable directories
  await stageAndPublishEpisodeFiles({
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

  // 8, 9, 10. Record history, mark topic selected, and trigger pipeline
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

export const createEpisodeFromTopicCandidate = createEpisodeFromTopicWithBank;
