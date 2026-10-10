import { useState } from "react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_SHORT_DEFAULT_QUESTION_COUNT,
  type QuizImageStyle,
  type TopicAvailability,
  type TopicCandidate,
} from "@studio/shared";
import { calculateMaxAllowedQuestions, resolveMinQuestionCount, validateQuestionCount } from "./topicCardHelpers";

export interface UseTopicCardStateOptions {
  topic: TopicCandidate;
  availability?: TopicAvailability;
  channelStyles?: QuizImageStyle[];
}

function resolveInitialQuestionCount(topic: TopicCandidate, maxAllowedQuestions: number): number {
  if (topic.content_kind === "short_reel") return 1;
  const preferred =
    topic.content_kind === "quiz_short" ? (topic.question_count ?? QUIZ_SHORT_DEFAULT_QUESTION_COUNT) : topic.question_count;
  return Math.min(preferred, maxAllowedQuestions);
}

export function useTopicCardState({ topic, availability, channelStyles = ALL_QUIZ_IMAGE_STYLES }: UseTopicCardStateOptions) {
  const isShortReel = topic.content_kind === "short_reel";
  const isQuizShort = topic.content_kind === "quiz_short";
  const canConfirm = availability ? availability.can_confirm : true;
  const isBound = Array.isArray(topic.source_bindings) && topic.source_bindings.length > 0;
  const sourceCapacity = availability?.source_capacity ?? (isBound ? topic.source_bindings!.length : QUIZ_MAX_QUESTION_COUNT);
  const maxAllowedQuestions = calculateMaxAllowedQuestions(topic.content_kind, sourceCapacity, isBound || Boolean(availability));
  const minQuestionCount = resolveMinQuestionCount(topic.content_kind);

  const [questionCount, setQuestionCount] = useState(resolveInitialQuestionCount(topic, maxAllowedQuestions));
  const [selectedStyle, setSelectedStyle] = useState<QuizImageStyle | "mixed">(
    topic.content_kind === "episode" && topic.visual_style ? topic.visual_style : "mixed",
  );
  const isQuestionCountValid = validateQuestionCount(
    questionCount,
    maxAllowedQuestions,
    isShortReel,
    availability ? sourceCapacity : undefined,
    minQuestionCount,
  );
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;

  return {
    isShortReel,
    isQuizShort,
    canConfirm,
    sourceCapacity,
    maxAllowedQuestions,
    minQuestionCount,
    questionCount,
    setQuestionCount,
    selectedStyle,
    setSelectedStyle,
    isQuestionCountValid,
    availableStyles,
  };
}
