import { getQuizGameplayArchetype } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import type { TaskManager } from "../../tasks.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { ensureTopicQuestionsWithJitFallback } from "./questionJitSeeder.js";
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
  const channel = await repository.getChannel(channelId);
  const bankQuestion = await repository.getQuestionBankQuestion(input.question_id, channelId);
  if (!bankQuestion) {
    throw new RepositoryError(`Question not found: ${input.question_id}`, "QUESTION_NOT_FOUND");
  }

  const isCooldown = Boolean(bankQuestion.channel_cooldown?.is_cooldown || (bankQuestion as any).is_in_cooldown);
  if (isCooldown && !input.force) {
    const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
    throw new RepositoryError(
      `Question ${input.question_id} is in 30-day cooldown for channel ${channelId} (${days} days remaining). Set force=true to override.`,
      "QUESTION_IN_COOLDOWN",
    );
  }

  const blueprint = getQuizGameplayArchetype(bankQuestion.archetype_id);
  const targetLayout = blueprint?.targetLayout ?? "full_stack_list";
  const renderAspect = input.render_aspect_ratio ?? "9:16";
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, input.visual_style);

  const targetLanguage = input.target_language || channel.language || "en";
  const activeTranslation = await resolveBankQuestionTranslation(bankQuestion, targetLanguage, channel, repository, deps.llmClient);
  const quizQuestion = convertBankQuestionToQuizQuestion(bankQuestion, { language: targetLanguage, translation: activeTranslation });

  const { episode, quiz, timestamp } = await bootstrapSingleQuestionEpisode({
    repository, channel, channelId, bankQuestion, quizQuestion, targetLanguage, targetLayout, requestedStyle, resolvedStyle, renderAspect,
    localizedHook: activeTranslation?.question || bankQuestion.question,
    localizedPremise: activeTranslation?.explanation || bankQuestion.explanation,
  });

  const directorPlan = buildSingleQuestionDirectorPlan({ episodeId: episode.episode_id, quizQuestion, archetypeId: bankQuestion.archetype_id, channel, targetLayout });
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
  const channel = await repository.getChannel(channelId);
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === input.topic_id);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }

  const questionCount = input.question_count ?? topic.question_count ?? 3;
  const targetLanguage = input.target_language || channel.language || "en";

  const jitResult = await ensureTopicQuestionsWithJitFallback({
    repository, channelId, topic, questionCount, targetLanguage, llmClient: deps.llmClient, forceIncludeCooldown: input.force ?? false,
  });
  const selectedQuestions = jitResult.questions;

  const quizQuestions = await transcreateAndConvertTopicQuestions(selectedQuestions, targetLanguage, channel, repository, deps.llmClient);
  const renderAspect = input.render_aspect_ratio ?? (topic.title.toLowerCase().includes("shorts") || Boolean(topic.archetype) ? "9:16" : "16:9");
  const targetLayout = resolveTargetLayoutForTopic(topic, renderAspect);
  const blueprint = topic.archetype ? getQuizGameplayArchetype(topic.archetype as any) : undefined;
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, input.visual_style ?? topic.visual_style);

  const { episode, quiz, timestamp } = await bootstrapTopicEpisode({
    repository, channel, channelId, topic, quizQuestions, targetLanguage, targetLayout, requestedStyle, resolvedStyle, renderAspect,
    blueprintDefaultFormat: blueprint?.defaultFormat,
    selectedAgeBand: selectedQuestions[0]?.age_band,
  });

  const directorPlan = buildTopicDirectorPlan(quiz, topic, channel, targetLayout, renderAspect);
  await repository.writeDirectorPlan(channelId, episode.episode_id, directorPlan);

  const questionIds = selectedQuestions.map((q) => q.id);
  if (typeof (repository as any).recordQuestionUsage === "function") {
    await (repository as any).recordQuestionUsage(channelId, episode.episode_id, questionIds);
  }
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
