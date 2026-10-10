import type { QuizImageStyle, TopicCandidate, TopicConfirmInput } from "@studio/shared";

export interface TopicConfirmRequestOptions {
  questionCount?: number;
  visualStyle?: QuizImageStyle | "mixed";
  autoStartPipeline?: boolean;
}

/**
 * Shapes the confirm body per topic kind: Short Reels and Quiz Shorts are portrait only and the
 * Quiz Short carries its own question count, while Episodes keep the landscape request.
 */
export function buildTopicConfirmPayload(
  topicId: string,
  contentKind: TopicCandidate["content_kind"],
  options: TopicConfirmRequestOptions,
): TopicConfirmInput {
  const shared = {
    topic_id: topicId,
    visual_style: options.visualStyle,
    auto_start_pipeline: options.autoStartPipeline ?? false,
  };
  if (contentKind === "short_reel") {
    return { ...shared, question_count: 1, render_aspect_ratio: "9:16" };
  }
  if (contentKind === "quiz_short") {
    return { ...shared, question_count: options.questionCount, render_aspect_ratio: "9:16" };
  }
  return { ...shared, question_count: options.questionCount, render_aspect_ratio: "16:9" };
}
