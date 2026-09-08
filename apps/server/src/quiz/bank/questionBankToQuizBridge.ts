import path from "node:path";
import { getQuizGameplayArchetype, type DirectorPlan, type QuizQuestion } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import type { TaskManager } from "../../tasks.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { resolveBoundTopicSources } from "./bridge/boundSourceResolver.js";
import { ensureTopicQuestionsWithJitFallback } from "./questionJitSeeder.js";
import {
  assertConfirmationReplayOrConflict,
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
} from "../../repository/topicConfirmationReceipts.js";
import { localizeProductContent, normalizeTargetLanguage, saveProductLocalizationArtifact } from "./localization/productLocalization.js";
import {
  convertBankQuestionToQuizQuestion,
  resolveBankQuestionTranslation,
  transcreateAndConvertTopicQuestions,
  buildSingleQuestionDirectorPlan,
  buildTopicDirectorPlan,
  resolveTargetLayoutForTopic,
  bootstrapSingleQuestionEpisode,
  bootstrapTopicEpisode,
  resolveEpisodeVisualStyles,
  triggerPipelineTask,
  type ConvertBankQuestionOptions,
  type CreateEpisodeFromQuestionBankInput,
  type CreateEpisodeFromQuestionBankResult,
  type CreateEpisodeFromTopicWithBankInput,
  type CreateEpisodeFromTopicWithBankResult,
} from "./bridge/index.js";

export {
  convertBankQuestionToQuizQuestion,
  type ConvertBankQuestionOptions,
  type CreateEpisodeFromQuestionBankInput,
  type CreateEpisodeFromQuestionBankResult,
  type CreateEpisodeFromTopicWithBankInput,
  type CreateEpisodeFromTopicWithBankResult,
};

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

  const blueprint = getQuizGameplayArchetype(bankQuestion.archetype_id);
  const targetLayout = blueprint?.targetLayout ?? "full_stack_list";
  const renderAspect = input.render_aspect_ratio ?? "16:9";
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, input.visual_style);

  const targetLanguage = input.target_language || channel.language || "en";
  const activeTranslation = await resolveBankQuestionTranslation(bankQuestion, targetLanguage, channel, repository, deps.llmClient);
  const quizQuestion = convertBankQuestionToQuizQuestion(bankQuestion, { language: targetLanguage, translation: activeTranslation });

  const { episode, quiz, timestamp } = await bootstrapSingleQuestionEpisode({
    repository,
    channel,
    channelId,
    bankQuestion,
    quizQuestion,
    targetLanguage,
    targetLayout,
    requestedStyle,
    resolvedStyle,
    renderAspect,
    localizedHook: activeTranslation?.question || bankQuestion.question,
    localizedPremise: activeTranslation?.explanation || bankQuestion.explanation,
  });

  const directorPlan = buildSingleQuestionDirectorPlan({
    episodeId: episode.episode_id,
    quizQuestion,
    archetypeId: bankQuestion.archetype_id,
    channel,
    targetLayout,
  });
  await repository.writeDirectorPlan(channelId, episode.episode_id, directorPlan);
  await repository.appendQuestionHistory(channelId, episode.episode_id, [quizQuestion]);

  const task = triggerPipelineTask(tasks, channelId, episode.episode_id, input.auto_start_pipeline !== false);
  await repository.updateChannel(channelId, { updated_at: timestamp });

  return { episode, task, cooldown_recorded: true, quiz, director_plan: directorPlan };
}

export const createEpisodeFromBankQuestions = createEpisodeFromQuestionBank;

export async function createEpisodeFromTopicWithBank(deps: {
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

  // 1. Check existing confirmation receipt for durable replay / conflict
  const targetLanguage = normalizeTargetLanguage(input.target_language || channel.language || "en");
  const questionCount = input.question_count ?? 3;
  const incomingOptions: TopicConfirmationOptions = {
    question_count: questionCount,
    ...(input.visual_style ? { visual_style: input.visual_style } : {}),
    render_aspect_ratio: "16:9",
    target_language: targetLanguage,
  };

  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, input.topic_id);
  if (existingReceipt) {
    assertConfirmationReplayOrConflict(existingReceipt, incomingOptions);
    const existingEpisode = await repository.getEpisode(channelId, existingReceipt.product_id);
    const existingQuiz = await repository.readQuiz(channelId, existingEpisode.episode_id);
    const existingDirectorPlan = await repository.readDirectorPlan(channelId, existingEpisode.episode_id);
    return {
      episode: existingEpisode,
      task: null,
      quiz: existingQuiz ?? {
        schema_version: 2,
        episode_id: existingEpisode.episode_id,
        age_band: "family",
        language: targetLanguage,
        questions: [],
      },
      director_plan: (existingDirectorPlan ?? {
        scenes: [],
      }) as DirectorPlan,
      curated_source: "bank_only",
      question_ids: existingReceipt.source_question_ids,
      cooldown_recorded: true,
    };
  }

  // 2. Retrieve topic candidate
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === input.topic_id);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  if (topic.content_kind === "short_reel") {
    throw new RepositoryError("Cannot create episode from short-reel topic candidate", "INVALID_TOPIC_KIND");
  }

  // If topic has bound sources, execute authoritative Stage 4 bound flow
  if (topic.source_bindings && topic.source_bindings.length > 0) {
    const boundResult = await resolveBoundTopicSources({
      repository,
      channelId,
      topicId: input.topic_id,
      requestedQuestionCount: questionCount,
      force: input.force,
    });
    const selectedQuestions = boundResult.questions;

    // 3. Losslessly convert Bank questions to base English QuizQuestions
    const baseQuizQuestions: QuizQuestion[] = selectedQuestions.map((bankQ, idx) => {
      const q = convertBankQuestionToQuizQuestion(bankQ);
      q.number = idx + 1;
      return q;
    });

    // 4. Bootstrap episode with base English questions first
    const renderAspect = input.render_aspect_ratio ?? "16:9";
    const targetLayout = resolveTargetLayoutForTopic(topic, renderAspect);
    const blueprint = topic.archetype ? getQuizGameplayArchetype(topic.archetype) : undefined;
    const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, input.visual_style ?? topic.visual_style);

    const { episode, quiz, episodeDirectory, timestamp } = await bootstrapTopicEpisode({
      repository,
      channel,
      channelId,
      topic,
      quizQuestions: baseQuizQuestions,
      targetLanguage,
      targetLayout,
      requestedStyle,
      resolvedStyle,
      renderAspect,
      blueprintDefaultFormat: blueprint?.defaultFormat,
      selectedAgeBand: selectedQuestions[0]?.age_band,
    });

    // 5. Product localization (localizes product-only fields, never writing back to bank)
    const localizationArtifact = await localizeProductContent({
      targetLanguage,
      productId: episode.episode_id,
      contentKind: "episode",
      sourceQuestionIds: boundResult.questionIds,
      sourceContentHashes: boundResult.sourceContentHashes,
      quizQuestions: baseQuizQuestions,
      videoDescription: topic.premise,
      thumbnailText: topic.title,
    });

    let finalQuizQuestions = baseQuizQuestions;
    if (targetLanguage !== "en" && localizationArtifact.quiz_questions) {
      const locMap = new Map(localizationArtifact.quiz_questions.map((l) => [l.question_id, l]));
      finalQuizQuestions = baseQuizQuestions.map((q) => {
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
      await repository.writeQuiz(channelId, episode.episode_id, {
        ...quiz,
        language: targetLanguage,
        questions: finalQuizQuestions,
      });
    }

    // 6. Write sources.md documenting exact bound source questions
    const sourcesContent = [
      "# Question Bank Sources",
      "",
      ...boundResult.questionIds.map((id, idx) => `- **${id}**: hash=${boundResult.sourceContentHashes[idx]}`),
      "",
    ].join("\n");
    await repository.writeTextAtomic(path.join(episodeDirectory, "sources.md"), sourcesContent);

    // 7. Save product localization artifact
    await saveProductLocalizationArtifact(repository, channelId, episode.slug, localizationArtifact);

    // 8. Build director plan & write to episode
    const directorPlan = buildTopicDirectorPlan(quiz, topic, channel, targetLayout, renderAspect);
    await repository.writeDirectorPlan(channelId, episode.episode_id, directorPlan);

    // 9. Save topic confirmation receipt
    const effectiveRequestId = input.request_id || `req-confirm-${Date.now()}`;
    await saveTopicConfirmationReceipt(repository, channelId, {
      receipt_id: `rec-${episode.episode_id}`,
      channel_id: channelId,
      topic_id: topic.topic_id,
      content_kind: "episode",
      product_id: episode.episode_id,
      product_slug: episode.slug,
      confirmed_at: timestamp,
      request_id: effectiveRequestId,
      options_fingerprint: computeConfirmationOptionsFingerprint(incomingOptions),
      options: incomingOptions,
      source_question_ids: boundResult.questionIds,
      source_content_hashes: boundResult.sourceContentHashes,
    });

    // 10. Record question history, mark topic selected, and trigger pipeline
    await repository.appendQuestionHistory(channelId, episode.episode_id, finalQuizQuestions, 30);
    await repository.markTopicSelected(channelId, topic.topic_id, finalQuizQuestions.length);
    await repository.updateChannel(channelId, { updated_at: timestamp });

    const task = triggerPipelineTask(tasks, channelId, episode.episode_id, input.auto_start_pipeline !== false);

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

  // Legacy fallback flow for unbound topic candidates
  const jitResult = await ensureTopicQuestionsWithJitFallback({
    repository,
    channelId,
    topic,
    questionCount,
    targetLanguage,
    llmClient: deps.llmClient,
    forceIncludeCooldown: input.force ?? false,
  });
  const selectedQuestions = jitResult.questions;

  const quizQuestions = await transcreateAndConvertTopicQuestions(selectedQuestions, targetLanguage, channel, repository, deps.llmClient);
  const renderAspect = input.render_aspect_ratio ?? "16:9";
  const targetLayout = resolveTargetLayoutForTopic(topic, renderAspect);
  const blueprint = topic.archetype ? getQuizGameplayArchetype(topic.archetype) : undefined;
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, input.visual_style ?? topic.visual_style);

  const { episode, quiz, timestamp } = await bootstrapTopicEpisode({
    repository,
    channel,
    channelId,
    topic,
    quizQuestions,
    targetLanguage,
    targetLayout,
    requestedStyle,
    resolvedStyle,
    renderAspect,
    blueprintDefaultFormat: blueprint?.defaultFormat,
    selectedAgeBand: selectedQuestions[0]?.age_band,
  });

  const directorPlan = buildTopicDirectorPlan(quiz, topic, channel, targetLayout, renderAspect);
  await repository.writeDirectorPlan(channelId, episode.episode_id, directorPlan);

  const questionIds = selectedQuestions.map((q) => q.id);
  await repository.appendQuestionHistory(channelId, episode.episode_id, quizQuestions, 30);
  await repository.markTopicSelected(channelId, topic.topic_id, quizQuestions.length);
  await repository.updateChannel(channelId, { updated_at: timestamp });

  const task = triggerPipelineTask(tasks, channelId, episode.episode_id, input.auto_start_pipeline !== false);

  return {
    episode,
    task,
    quiz,
    director_plan: directorPlan,
    curated_source: jitResult.source,
    question_ids: questionIds,
    cooldown_recorded: true,
  };
}

export const createEpisodeFromTopicCandidate = createEpisodeFromTopicWithBank;
