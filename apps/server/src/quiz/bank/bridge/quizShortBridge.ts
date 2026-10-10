import { nowIso, quizShortProductRef, type QuizQuestion, type QuizShort, type Task } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { createQuizShortId } from "../../../repository/quizShorts.js";
import type { TaskManager } from "../../../tasks.js";
import type { LLMClient } from "../../../utils/promptSanitizer.js";
import {
  computeConfirmationOptionsFingerprint,
  getTopicConfirmationReceipt,
  saveTopicConfirmationReceipt,
  type TopicConfirmationOptions,
  type TopicConfirmationReceipt,
} from "../../../repository/topicConfirmationReceipts.js";
import { localizeProductContent } from "../localization/productLocalization.js";
import { resolveBoundTopicSources } from "./boundSourceResolver.js";
import { applyLocalizedQuestionOverrides, buildSourcesMarkdown } from "./topicEpisodeConfig.js";
import { withTopicConfirmationLock } from "./topicConfirmationLock.js";
import {
  buildQuizShortConfirmationOptions,
  findAndValidateQuizShortTopicCandidate,
  resolveRequestedLayoutPair,
  type CreateQuizShortFromTopicWithBankInput,
  type CreateQuizShortFromTopicWithBankResult,
} from "./quizShortConfirmationConfig.js";
import { prepareQuizShortQuestions } from "./quizShortQuestionPreparation.js";
import { buildConfiguredQuizShort } from "./quizShortRecordBuilder.js";
import { handleExistingQuizShortReceipt } from "./quizShortReceiptReplay.js";
import { writeQuizShortConfirmationArtifacts } from "./quizShortArtifactWriter.js";

export interface CreateQuizShortFromTopicWithBankDeps {
  repository: RepositoryService;
  tasks?: TaskManager;
  channelId: string;
  input: CreateQuizShortFromTopicWithBankInput;
  llmClient?: LLMClient | null;
}

interface QuizShortReceiptParams {
  channelId: string;
  topicId: string;
  quizShort: QuizShort;
  requestId: string;
  confirmedAt: string;
  incomingOptions: TopicConfirmationOptions;
  boundResult: { questionIds: string[]; sourceContentHashes: string[] };
}

function buildQuizShortReceipt(params: QuizShortReceiptParams, status: TopicConfirmationReceipt["status"]): TopicConfirmationReceipt {
  return {
    receipt_id: `rec-${params.quizShort.quiz_short_id}`,
    channel_id: params.channelId,
    topic_id: params.topicId,
    content_kind: "quiz_short",
    product_id: params.quizShort.quiz_short_id,
    product_slug: params.quizShort.slug,
    confirmed_at: params.confirmedAt,
    request_id: params.requestId,
    options_fingerprint: computeConfirmationOptionsFingerprint(params.incomingOptions),
    options: params.incomingOptions,
    source_question_ids: params.boundResult.questionIds,
    source_content_hashes: params.boundResult.sourceContentHashes,
    status,
  };
}

function submitQuizShortPipeline(tasks: TaskManager | undefined, channelId: string, quizShortId: string, autoStart: boolean): Task | null {
  if (!autoStart || !tasks) return null;
  return tasks.submitForProduct("GENERATE_PIPELINE", quizShortProductRef(channelId, quizShortId));
}

/** Records post-write completion effects: history, topic selection, channel touch, durable receipt and the pipeline task. */
async function recordQuizShortConfirmationCompletion(params: {
  repository: RepositoryService;
  tasks?: TaskManager;
  receipt: QuizShortReceiptParams;
  finalQuizQuestions: QuizQuestion[];
  autoStartPipeline: boolean;
}): Promise<Task | null> {
  const { repository, tasks, receipt, finalQuizQuestions, autoStartPipeline } = params;
  const { channelId, topicId, quizShort } = receipt;
  const ref = quizShortProductRef(channelId, quizShort.quiz_short_id);

  await repository.appendQuestionHistory(channelId, ref, finalQuizQuestions, 30, undefined, "quiz_short");
  await repository.markTopicSelected(channelId, topicId, finalQuizQuestions.length);
  await repository.updateChannel(channelId, { updated_at: nowIso() });
  await saveTopicConfirmationReceipt(repository, channelId, buildQuizShortReceipt(receipt, "completed"));

  return submitQuizShortPipeline(tasks, channelId, quizShort.quiz_short_id, autoStartPipeline);
}

/** Executes the Quiz Short confirmation steps from a validated topic candidate (call under the lock). */
export async function executeQuizShortConfirmation(
  deps: CreateQuizShortFromTopicWithBankDeps,
): Promise<CreateQuizShortFromTopicWithBankResult> {
  const { repository, tasks, channelId, input } = deps;
  const channel = await repository.getChannel(channelId);
  const topic = await findAndValidateQuizShortTopicCandidate(repository, channelId, input.topic_id);
  const { targetLanguage, incomingOptions } = buildQuizShortConfirmationOptions(input, topic, channel.language);

  const existingReceipt = await getTopicConfirmationReceipt(repository, channelId, input.topic_id);
  if (existingReceipt) {
    const replay = await handleExistingQuizShortReceipt(repository, channelId, input.topic_id, incomingOptions);
    if (replay) return replay;
  }

  const boundResult = await resolveBoundTopicSources({
    repository,
    channelId,
    topicId: input.topic_id,
    requestedQuestionCount: incomingOptions.question_count,
    force: Boolean(input.force || existingReceipt?.status === "preparing"),
  });
  const prepared = prepareQuizShortQuestions(boundResult.questions, resolveRequestedLayoutPair(input, topic));

  const quizShortId = existingReceipt?.product_id || createQuizShortId();
  const slug =
    existingReceipt?.product_slug ||
    (await repository.uniqueSlug(topic.title, repository.resolvePath("channels", channel.slug, "quiz_shorts")));
  const timestamp = nowIso();

  const localizationArtifact = await localizeProductContent({
    targetLanguage,
    productId: quizShortId,
    contentKind: "quiz_short",
    sourceQuestionIds: boundResult.questionIds,
    sourceContentHashes: boundResult.sourceContentHashes,
    quizQuestions: prepared.questions,
    videoDescription: topic.premise,
    llmClient: deps.llmClient,
  });
  const finalQuizQuestions = applyLocalizedQuestionOverrides(prepared.questions, localizationArtifact, targetLanguage);

  const { quizShort, quiz, directorPlan } = buildConfiguredQuizShort({
    quizShortId,
    channel,
    slug,
    topic,
    finalQuizQuestions,
    layoutPair: prepared.layoutPair,
    targetLanguage,
    timestamp,
    inputVisualStyle: input.visual_style,
  });

  const receipt: QuizShortReceiptParams = {
    channelId,
    topicId: topic.topic_id,
    quizShort,
    requestId: input.request_id || existingReceipt?.request_id || `req-confirm-${Date.now()}`,
    confirmedAt: existingReceipt?.confirmed_at || timestamp,
    incomingOptions,
    boundResult,
  };
  await saveTopicConfirmationReceipt(repository, channelId, buildQuizShortReceipt(receipt, "preparing"));
  await writeQuizShortConfirmationArtifacts({
    repository,
    channelId,
    quizShort,
    quiz,
    directorPlan,
    localizationArtifact,
    sourcesContent: buildSourcesMarkdown(boundResult.questionIds, boundResult.sourceContentHashes),
  });
  const task = await recordQuizShortConfirmationCompletion({
    repository,
    tasks,
    receipt,
    finalQuizQuestions,
    autoStartPipeline: input.auto_start_pipeline === true,
  });

  return { quiz_short: quizShort, task, quiz, director_plan: directorPlan, question_ids: boundResult.questionIds, cooldown_recorded: true };
}

/** Creates a Quiz Short from a bound topic candidate, serialized per topic by the confirmation lock. */
export async function createQuizShortFromTopicWithBank(
  deps: CreateQuizShortFromTopicWithBankDeps,
): Promise<CreateQuizShortFromTopicWithBankResult> {
  return withTopicConfirmationLock(deps.channelId, deps.input.topic_id, () => executeQuizShortConfirmation(deps));
}
