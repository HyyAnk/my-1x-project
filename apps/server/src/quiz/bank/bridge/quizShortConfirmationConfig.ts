import type { DirectorPlan, QuizImageStyle, QuizShort, QuizShortLayoutPair, QuizShortTopicCandidate, QuizV2, Task } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../../repository.js";
import type { TopicConfirmationOptions } from "../../../repository/topicConfirmationReceipts.js";
import { normalizeTargetLanguage } from "../localization/productLocalization.js";

export const QUIZ_SHORT_RENDER_ASPECT = "9:16" as const;

export interface CreateQuizShortFromTopicWithBankInput {
  topic_id: string;
  question_count?: number;
  target_language?: string;
  render_aspect_ratio?: "9:16";
  auto_start_pipeline?: boolean;
  visual_style?: QuizImageStyle | "mixed";
  layout_pair?: QuizShortLayoutPair;
  force?: boolean;
  request_id?: string;
}

export interface CreateQuizShortFromTopicWithBankResult {
  quiz_short: QuizShort;
  task: Task | null;
  quiz: QuizV2;
  director_plan: DirectorPlan;
  question_ids: string[];
  cooldown_recorded: boolean;
}

/** Quiz Shorts are portrait only; any other requested aspect is a client error, never silently coerced. */
export function resolveQuizShortRenderAspect(renderAspect: string | undefined): typeof QUIZ_SHORT_RENDER_ASPECT {
  const resolved = renderAspect ?? QUIZ_SHORT_RENDER_ASPECT;
  if (resolved !== QUIZ_SHORT_RENDER_ASPECT) {
    throw new RepositoryError(`Quiz Short creation only supports ${QUIZ_SHORT_RENDER_ASPECT} portrait`, "UNSUPPORTED_ASPECT_RATIO");
  }
  return QUIZ_SHORT_RENDER_ASPECT;
}

/** Validates that a topic candidate exists, is a Quiz Short candidate, and has bound sources. */
export async function findAndValidateQuizShortTopicCandidate(
  repository: RepositoryService,
  channelId: string,
  topicId: string,
): Promise<QuizShortTopicCandidate> {
  const topics = await repository.listTopics(channelId);
  const topic = topics.find((t) => t.topic_id === topicId);
  if (!topic) {
    throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  }
  if (topic.content_kind !== "quiz_short") {
    throw new RepositoryError(`Cannot create Quiz Short from ${topic.content_kind} topic candidate`, "INVALID_TOPIC_KIND");
  }
  if (!topic.source_bindings || topic.source_bindings.length === 0) {
    throw new RepositoryError(
      "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
      "UNBOUND_LEGACY_TOPIC",
    );
  }
  return topic;
}

/** Builds the normalized confirmation options that the receipt fingerprint is computed from. */
export function buildQuizShortConfirmationOptions(
  input: CreateQuizShortFromTopicWithBankInput,
  topic: QuizShortTopicCandidate,
  channelLanguage?: string,
): { targetLanguage: string; incomingOptions: TopicConfirmationOptions } {
  const targetLanguage = normalizeTargetLanguage(input.target_language || channelLanguage || "en");
  return {
    targetLanguage,
    incomingOptions: {
      question_count: input.question_count ?? topic.question_count,
      visual_style: input.visual_style ?? "mixed",
      render_aspect_ratio: resolveQuizShortRenderAspect(input.render_aspect_ratio),
      target_language: targetLanguage,
    },
  };
}

/** The layout pair requested at confirmation wins over the one suggested with the topic. */
export function resolveRequestedLayoutPair(
  input: Pick<CreateQuizShortFromTopicWithBankInput, "layout_pair">,
  topic: Pick<QuizShortTopicCandidate, "layout_pair">,
): QuizShortLayoutPair | undefined {
  return input.layout_pair ?? topic.layout_pair;
}
