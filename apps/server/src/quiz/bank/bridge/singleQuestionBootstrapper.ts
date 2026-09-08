import path from "node:path";
import {
  QuizV2Schema,
  type BankQuestion,
  type Channel,
  type QuizImageStyle,
  type QuizLayoutId,
  type QuizQuestion,
  type QuizV2,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import {
  buildEpisodeRecord,
  createEpisodeDirectoryStructure,
  prepareEpisodeDirectory,
  resolveRenderAspect,
  writeEpisodeMarkdownStubs,
} from "./bootstrapperHelpers.js";
import type { BootstrapEpisodeResult } from "./bootstrapperTypes.js";

export interface BootstrapSingleQuestionEpisodeParams {
  repository: RepositoryService;
  channel: Channel;
  channelId: string;
  bankQuestion: BankQuestion;
  quizQuestion: QuizQuestion;
  targetLanguage: string;
  targetLayout: QuizLayoutId;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  renderAspect?: "16:9";
  localizedHook: string;
  localizedPremise: string;
}

/**
 * Bootstraps directory structure, episode record, quiz-v2.json, and markdown stubs for a single-question episode.
 */
export async function bootstrapSingleQuestionEpisode(params: BootstrapSingleQuestionEpisodeParams): Promise<BootstrapEpisodeResult> {
  const {
    repository,
    channel,
    channelId,
    bankQuestion,
    quizQuestion,
    targetLanguage,
    targetLayout,
    requestedStyle,
    resolvedStyle,
    localizedHook,
    localizedPremise,
  } = params;

  const renderAspect = resolveRenderAspect(params.renderAspect);
  const title = `Shorts Quiz: ${localizedHook.slice(0, 50)}`;
  const { episodeId, episodeSlug, timestamp, episodeDirectory } = await prepareEpisodeDirectory(
    repository,
    channel,
    `shorts-${bankQuestion.archetype_id}-${Date.now().toString(36)}`,
  );
  await createEpisodeDirectoryStructure(episodeDirectory);

  const episode = buildEpisodeRecord({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    title,
    premise: localizedPremise,
    hook: localizedHook,
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

  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await writeEpisodeMarkdownStubs(repository, episodeDirectory, { title, hook: localizedHook, premise: localizedPremise });

  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: bankQuestion.age_band,
    language: targetLanguage,
    questions: [quizQuestion],
  });
  await repository.writeQuiz(channelId, episodeId, quiz);

  return { episode, quiz, episodeDirectory, timestamp };
}
