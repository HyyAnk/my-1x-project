import {
  getQuizGameplayArchetype,
  QuizV2Schema,
  type Channel,
  type DirectorPlan,
  type Episode,
  type EpisodeTopicCandidate,
  type QuizImageStyle,
  type QuizQuestion,
  type QuizV2,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../../../repository/helpers.js";
import type { TopicConfirmationOptions } from "../../../repository/topicConfirmationReceipts.js";
import { localizeProductContent, normalizeTargetLanguage } from "../localization/productLocalization.js";
import { buildTopicDirectorPlan, resolveTargetLayoutForTopic } from "./bankDirectorPlanFactory.js";
import { buildEpisodeRecord, resolveEpisodeVisualStyles } from "./bootstrapperHelpers.js";
import type { CreateEpisodeFromTopicWithBankInput } from "./bankEpisodeBootstrapper.js";

/** Validates that a topic candidate exists, is an episode candidate, and has bound sources. */
export async function findAndValidateTopicCandidate(
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

/** Builds effective normalized confirmation options from user input and candidate defaults. */
export function buildConfirmationOptions(
  input: CreateEpisodeFromTopicWithBankInput,
  topic: EpisodeTopicCandidate,
  channelLanguage?: string,
): { targetLanguage: string; incomingOptions: TopicConfirmationOptions } {
  const targetLanguage = normalizeTargetLanguage(input.target_language || channelLanguage || "en");
  const questionCount = input.question_count ?? topic.question_count ?? 8;
  const visualStyle = input.visual_style ?? topic.visual_style ?? "mixed";
  return {
    targetLanguage,
    incomingOptions: {
      question_count: questionCount,
      visual_style: visualStyle,
      render_aspect_ratio: "16:9",
      target_language: targetLanguage,
      ...(input.custom_hook_text ? { custom_hook_text: input.custom_hook_text.trim() } : {}),
      ...(input.thumbnail_text ? { thumbnail_text: input.thumbnail_text.trim() } : {}),
    },
  };
}

/** Applies localized translations to base quiz questions if target language is not English. */
export function applyLocalizedQuestionOverrides(
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

export interface BuildConfiguredEpisodeParams {
  episodeId: string;
  channel: Channel;
  episodeSlug: string;
  topic: EpisodeTopicCandidate;
  finalQuizQuestions: QuizQuestion[];
  renderAspect: "16:9";
  targetLanguage: string;
  timestamp: string;
  inputVisualStyle?: QuizImageStyle | "mixed";
}

/** Builds the configured episode record, quiz schema, and director plan. */
export function buildConfiguredEpisode(params: BuildConfiguredEpisodeParams): {
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

/** Formats the sources markdown list from bound question IDs and hashes. */
export function buildSourcesMarkdown(questionIds: string[], sourceContentHashes: string[]): string {
  return [
    "# Question Bank Sources",
    "",
    ...questionIds.map((id, idx) => `- **${id}**: hash=${sourceContentHashes[idx]}`),
    "",
  ].join("\n");
}
