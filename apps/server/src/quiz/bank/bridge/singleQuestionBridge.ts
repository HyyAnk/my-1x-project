import {
  getQuizGameplayArchetype,
  hashBankQuestionSource,
  makeId,
  nowIso,
  QuizV2Schema,
  type BankQuestionWithCooldown,
  type QuizQuestion,
  type QuizV2,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import type { TaskManager } from "../../../tasks.js";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import { localizeProductContent, normalizeTargetLanguage } from "../localization/productLocalization.js";
import { convertBankQuestionToQuizQuestionLossless } from "./bankQuestionConverter.js";
import { buildSingleQuestionDirectorPlan } from "./bankDirectorPlanFactory.js";
import {
  buildEpisodeRecord,
  resolveEpisodeVisualStyles,
  resolveRenderAspect,
  triggerPipelineTask,
} from "./bootstrapperHelpers.js";
import { stageAndPublishSingleQuestionEpisodeFiles } from "./episodeStagingPublisher.js";
import type {
  CreateEpisodeFromQuestionBankInput,
  CreateEpisodeFromQuestionBankResult,
} from "./bankEpisodeBootstrapper.js";

/** Validates question existence and checks cooldown constraints. */
function validateQuestionAvailability(
  bankQuestion: BankQuestionWithCooldown | null,
  questionId: string,
  channelId: string,
  force?: boolean,
): BankQuestionWithCooldown {
  if (!bankQuestion) {
    throw new RepositoryError(`Question not found: ${questionId}`, "QUESTION_NOT_FOUND");
  }
  const isCooldown = Boolean(bankQuestion.channel_cooldown?.is_cooldown);
  if (isCooldown && !force) {
    const days = bankQuestion.channel_cooldown?.days_remaining ?? 30;
    throw new RepositoryError(
      `Question ${questionId} is in 30-day cooldown for channel ${channelId} (${days} days remaining). Set force=true to override.`,
      "QUESTION_IN_COOLDOWN",
    );
  }
  return bankQuestion;
}

/** Applies localized translations to the base quiz question if target language is not English. */
function applySingleQuestionLocalization(
  baseQuizQuestion: QuizQuestion,
  localizationArtifact: Awaited<ReturnType<typeof localizeProductContent>>,
  targetLanguage: string,
): QuizQuestion {
  if (targetLanguage === "en" || !localizationArtifact.quiz_questions?.[0]) {
    return baseQuizQuestion;
  }
  const loc = localizationArtifact.quiz_questions[0];
  const choiceMap = new Map(loc.choices.map((c) => [c.id, c.text]));
  return {
    ...baseQuizQuestion,
    question: loc.question,
    explanation: loc.explanation || baseQuizQuestion.explanation,
    choices: baseQuizQuestion.choices.map((c) => ({
      ...c,
      text: choiceMap.get(c.id) || c.text,
    })),
  };
}

/**
 * Creates an episode directly from a single Question Bank question.
 */
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
  const rawQuestion = await repository.getQuestionBankQuestion(input.question_id, channelId);
  const bankQuestion = validateQuestionAvailability(rawQuestion, input.question_id, channelId, input.force);

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

  const quizQuestion = applySingleQuestionLocalization(baseQuizQuestion, localizationArtifact, targetLanguage);
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

  await stageAndPublishSingleQuestionEpisodeFiles({
    repository,
    channelSlug: channel.slug,
    parentDir,
    episodeSlug,
    episode,
    quiz,
    directorPlan,
    localizationArtifact,
    title,
    hook,
    premise,
  });

  await repository.appendQuestionHistory(channelId, episode.episode_id, [quizQuestion]);
  const task = triggerPipelineTask(tasks, channelId, episode.episode_id, input.auto_start_pipeline !== false);
  await repository.updateChannel(channelId, { updated_at: timestamp });

  return { episode, task, cooldown_recorded: true, quiz, director_plan: directorPlan };
}

export const createEpisodeFromBankQuestions = createEpisodeFromQuestionBank;
