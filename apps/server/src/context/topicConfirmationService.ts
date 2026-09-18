import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  TopicConfirmInputSchema,
  makeId,
  nowIso,
  type Channel,
  type Episode,
  type QuizImageStyle,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError } from "../repository/errors.js";
import { resolveBoundTopicSources, type ResolvedBoundTopicSources } from "../quiz/bank/bridge/boundSourceResolver.js";
import {
  saveTopicConfirmationReceipt,
  computeConfirmationOptionsFingerprint,
  type TopicConfirmationOptions,
} from "../repository/topicConfirmationReceipts.js";
import { normalizeTargetLanguage } from "../quiz/bank/localization/productLocalization.js";
import type { RepositoryService } from "../repository/service.js";
import type { RepositoryRuntime } from "../repository/runtime.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../repository/helpers.js";
import {
  assertConfirmableCandidate,
  buildEpisodePaths,
  buildEpisodeSkeleton,
  buildQuizConfig,
  getInitialEpisodeDocuments,
  resolveCandidateStyles,
  type BuildEpisodeParams,
  type EpisodePaths,
  type ResolvedCandidateStyles,
} from "./confirmation/index.js";

export {
  assertConfirmableCandidate,
  buildEpisodePaths,
  type EpisodePaths,
  getInitialEpisodeDocuments,
  resolveCandidateStyles,
  type ResolvedCandidateStyles,
  buildQuizConfig,
  buildEpisodeSkeleton,
  type BuildEpisodeParams,
};

async function initializeEpisodeFiles(
  repo: RepositoryRuntime,
  episodeDirectory: string,
  candidate: TopicCandidate,
  boundResult?: Partial<ResolvedBoundTopicSources>,
): Promise<void> {
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  if (boundResult?.questions && boundResult.questions.length > 0 && boundResult.sourceContentHashes) {
    const recordedBindings = boundResult.questions.map((q, idx) => ({
      source_question_id: q.id,
      source_content_hash: boundResult.sourceContentHashes![idx],
      choice_ids: q.choices.map((c) => c.id),
      correct_choice_id: q.correct_choice_id,
    }));
    await repo.writeTextAtomic(
      path.join(episodeDirectory, "sources.md"),
      `# Source Questions\n\n\`\`\`json\n${JSON.stringify(recordedBindings, null, 2)}\n\`\`\`\n`,
    );
  }

  await repo.writeTextAtomic(
    path.join(episodeDirectory, "brief.md"),
    `# ${candidate.title}\n\n## Premise\n\n${candidate.premise}\n\n## Hook\n\n${candidate.hook}\n`,
  );

  const initialDocs = getInitialEpisodeDocuments();
  await Promise.all(initialDocs.map((doc) => repo.writeTextAtomic(path.join(episodeDirectory, doc.name), doc.content)));
}

async function saveConfirmationReceiptRecord(
  repo: RepositoryRuntime,
  channel: Channel,
  episode: Episode,
  topicId: string,
  selectedQuestionCount: number,
  requestedStyle: QuizImageStyle | "mixed",
  timestamp: string,
  boundResult?: Partial<ResolvedBoundTopicSources>,
): Promise<void> {
  const effectiveTargetLang = normalizeTargetLanguage(channel.language ?? "en");
  const confirmOptions: TopicConfirmationOptions = {
    question_count: selectedQuestionCount,
    visual_style: requestedStyle,
    target_language: effectiveTargetLang,
  };

  await saveTopicConfirmationReceipt(repo as unknown as RepositoryService, channel.channel_id, {
    receipt_id: `rec-${episode.episode_id}`,
    channel_id: channel.channel_id,
    topic_id: topicId,
    content_kind: "episode",
    product_id: episode.episode_id,
    product_slug: episode.slug,
    status: "completed",
    confirmed_at: timestamp,
    request_id: makeId("req"),
    options_fingerprint: computeConfirmationOptionsFingerprint(confirmOptions),
    options: confirmOptions,
    source_question_ids: boundResult?.questions?.map((q) => q.id) ?? [],
    source_content_hashes: boundResult?.sourceContentHashes ?? [],
  });
}

function resolveConfirmInvocation(
  callerThis: RepositoryRuntime | void,
  firstParam: RepositoryRuntime | string,
  secondParam: string,
  thirdParam?: number | string,
  fourthParam?: QuizImageStyle | "mixed" | number,
  fifthParam?: QuizImageStyle | "mixed",
): {
  repo: RepositoryRuntime;
  channelId: string;
  topicId: string;
  questionCount?: number;
  visualStyle?: QuizImageStyle | "mixed";
} {
  if (typeof firstParam === "string") {
    return {
      repo: callerThis as RepositoryRuntime,
      channelId: firstParam,
      topicId: secondParam,
      questionCount: thirdParam as number | undefined,
      visualStyle: fourthParam as QuizImageStyle | "mixed" | undefined,
    };
  }
  return {
    repo: firstParam,
    channelId: secondParam,
    topicId: thirdParam as string,
    questionCount: fourthParam as number | undefined,
    visualStyle: fifthParam,
  };
}

async function executeTopicConfirmation(
  repo: RepositoryRuntime,
  channelId: string,
  topicId: string,
  questionCount?: number,
  visualStyle?: QuizImageStyle | "mixed",
): Promise<Episode> {
  const channel = await repo.getChannel(channelId);
  const candidate = (await repo.listTopics(channelId)).find((topic) => topic.topic_id === topicId);
  if (!candidate) throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  if (candidate.content_kind === "short_reel") {
    throw new RepositoryError("Cannot confirm Short-Reel topic candidate as Episode", "INVALID_TOPIC_KIND");
  }

  assertConfirmableCandidate(candidate);

  const parsedConfirm = TopicConfirmInputSchema.parse({
    topic_id: topicId,
    question_count: questionCount,
    visual_style: visualStyle,
  });
  const selectedQuestionCount = parsedConfirm.question_count ?? candidate.question_count;

  let boundResult: Partial<ResolvedBoundTopicSources> | undefined;
  if (candidate.source_bindings && candidate.source_bindings.length > 0) {
    boundResult = await resolveBoundTopicSources({
      repository: repo as unknown as RepositoryService,
      channelId,
      topicId,
      requestedQuestionCount: selectedQuestionCount,
    });
  }

  const { requestedStyle, resolvedStyle } = resolveCandidateStyles(
    parsedConfirm.visual_style,
    candidate.visual_style,
    channel.selected_styles,
  );
  const targetDurationMinutes = estimateQuizTargetDurationMinutes(selectedQuestionCount);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);

  await repo.markTopicSelected(channelId, topicId, selectedQuestionCount);
  const episodeSlug = await repo.uniqueSlug(candidate.title, repo.resolvePath("channels", channel.slug, "episodes"));
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = repo.resolvePath("channels", channel.slug, "episodes", episodeSlug);

  const episode = buildEpisodeSkeleton({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    candidate: candidate,
    selectedQuestionCount,
    requestedStyle,
    resolvedStyle,
    channel,
    targetDurationMinutes,
    targetWordCount,
    timestamp,
  });

  await initializeEpisodeFiles(repo, episodeDirectory, candidate, boundResult);
  await repo.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  repo.entityIdResolver.setEpisodeSlug(channelId, episode.episode_id, episode.slug);
  repo.entityIdResolver.setEpisodeTitle(episode.episode_id, episode.topic?.title || "");
  repo.channelCache.incrementEpisodeCount(channelId);

  await repo.writeJsonAtomic(
    path.join(repo.resolvePath("channels", channel.slug), "topic_database.json"),
    (await repo.listTopics(channelId)).map(({ title, premise }) => ({ title, premise })),
  );
  await repo.updateChannel(channelId, { updated_at: timestamp });

  await saveConfirmationReceiptRecord(repo, channel, episode, topicId, selectedQuestionCount, requestedStyle, timestamp, boundResult);

  return episode;
}

/**
 * Core workflow for confirming a topic candidate as an episode.
 * Accepts either (repo, channelId, topicId, ...) or (channelId, topicId, ...) with bound runtime.
 */
export async function confirmTopicCandidate(
  this: RepositoryRuntime | void,
  channelId: string,
  topicId: string,
  questionCount?: number,
  visualStyle?: QuizImageStyle | "mixed",
): Promise<Episode>;
export async function confirmTopicCandidate(
  repo: RepositoryRuntime,
  channelId: string,
  topicId: string,
  questionCount?: number,
  visualStyle?: QuizImageStyle | "mixed",
): Promise<Episode>;
export async function confirmTopicCandidate(
  this: RepositoryRuntime | void,
  repoOrChannelId: RepositoryRuntime | string,
  channelIdOrTopicId: string,
  questionCountOrTopicId?: number | string,
  visualStyleOrQuestionCount?: QuizImageStyle | "mixed" | number,
  visualStyleParam?: QuizImageStyle | "mixed",
): Promise<Episode> {
  const { repo, channelId, topicId, questionCount, visualStyle } = resolveConfirmInvocation(
    this,
    repoOrChannelId,
    channelIdOrTopicId,
    questionCountOrTopicId,
    visualStyleOrQuestionCount,
    visualStyleParam,
  );
  return executeTopicConfirmation(repo, channelId, topicId, questionCount, visualStyle);
}

/**
 * Backward-compatible entry point for confirming a topic candidate.
 */
export const confirmTopic = confirmTopicCandidate;
