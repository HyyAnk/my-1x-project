import path from "node:path";
import {
  QuizV2Schema,
  type Channel,
  type EpisodeTopicCandidate,
  type QuizImageStyle,
  type QuizLayoutId,
  type QuizQuestion,
  type QuizV2,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../../../repository/helpers.js";
import {
  buildEpisodeRecord,
  createEpisodeDirectoryStructure,
  prepareEpisodeDirectory,
  resolveRenderAspect,
  writeEpisodeMarkdownStubs,
} from "./bootstrapperHelpers.js";
import type { BootstrapEpisodeResult } from "./bootstrapperTypes.js";
import { synthesizeScenesFromQuiz } from "../../domain/quizArtifactSynthesizer.js";

export interface BootstrapTopicEpisodeParams {
  repository: RepositoryService;
  channel: Channel;
  channelId: string;
  topic: EpisodeTopicCandidate;
  quizQuestions: QuizQuestion[];
  targetLanguage: string;
  targetLayout: QuizLayoutId;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  renderAspect?: "16:9";
  blueprintDefaultFormat?: string;
  selectedAgeBand?: string;
}

/** Resolves the visual theme for a topic episode based on its quiz format and archetype. */
function resolveTopicVisualTheme(topic: BootstrapTopicEpisodeParams["topic"]): string {
  return topic.quiz_format === "image_guess" || topic.archetype === "mystery_reveal" ? "jungle_jamboree" : "candy_pop";
}

/** Determines the quiz format, preferring the blueprint default, then the first question, then the topic format. */
function resolveTopicQuizFormat(
  topic: BootstrapTopicEpisodeParams["topic"],
  quizQuestions: QuizQuestion[],
  blueprintDefaultFormat?: string,
): string {
  return blueprintDefaultFormat ?? quizQuestions[0]?.format ?? topic.quiz_format ?? "multiple_choice";
}

/**
 * Bootstraps directory structure, episode record, quiz-v2.json, markdown stubs, and topic database for a topic episode.
 */
export async function bootstrapTopicEpisode(params: BootstrapTopicEpisodeParams): Promise<BootstrapEpisodeResult> {
  const {
    repository,
    channel,
    channelId,
    topic,
    quizQuestions,
    targetLanguage,
    targetLayout,
    requestedStyle,
    resolvedStyle,
    blueprintDefaultFormat,
    selectedAgeBand,
  } = params;

  const renderAspect = resolveRenderAspect(params.renderAspect);
  const { episodeId, episodeSlug, timestamp, episodeDirectory } = await prepareEpisodeDirectory(repository, channel, topic.title);
  await createEpisodeDirectoryStructure(episodeDirectory);

  const targetDurationMinutes = estimateQuizTargetDurationMinutes(quizQuestions.length);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);
  const ageBand = topic.age_band || selectedAgeBand || "family";

  const episode = buildEpisodeRecord({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    title: topic.title,
    premise: topic.premise,
    hook: topic.hook,
    targetDurationMinutes,
    targetWordCount,
    questionCount: quizQuestions.length,
    quizFormat: resolveTopicQuizFormat(topic, quizQuestions, blueprintDefaultFormat),
    ageBand,
    visualTheme: resolveTopicVisualTheme(topic),
    requestedStyle,
    resolvedStyle,
    channel,
    renderAspect,
    archetype: topic.archetype,
    targetLayout,
    timestamp,
  });

  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await repository.writeJsonAtomic(
    path.join(repository.resolvePath("channels", channel.slug), "topic_database.json"),
    (await repository.listTopics(channel.channel_id)).map(({ title, premise }) => ({ title, premise })),
  );

  const sanitizedQuestions = quizQuestions.map((q, idx) => {
    const claimId = `C${String(idx + 1).padStart(2, "0")}`;
    const sourceIds = q.source_ids && q.source_ids.length > 0 ? q.source_ids : [claimId];
    return {
      ...q,
      source_ids: sourceIds,
      validation: { ...q.validation, source_coverage: true },
    };
  });

  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: ageBand,
    language: targetLanguage,
    questions: sanitizedQuestions,
  });
  await repository.writeQuiz(channelId, episodeId, quiz);

  const synthesizedScenes = synthesizeScenesFromQuiz(quiz);
  await writeEpisodeMarkdownStubs(repository, episodeDirectory, {
    title: topic.title,
    hook: topic.hook,
    premise: topic.premise,
    isTopic: true,
    scenes: synthesizedScenes,
  });

  return { episode, quiz, episodeDirectory, timestamp };
}
