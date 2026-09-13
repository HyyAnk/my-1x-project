import { useState } from "react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  QUIZ_MAX_QUESTION_COUNT,
  type QuizImageStyle,
  type TopicAvailability,
  type TopicCandidate,
} from "@studio/shared";
import {
  calculateMaxAllowedQuestions,
  validateQuestionCount,
} from "./topicCardHelpers";

export interface UseTopicCardStateOptions {
  topic: TopicCandidate;
  availability?: TopicAvailability;
  channelStyles?: QuizImageStyle[];
}

export function useTopicCardState({
  topic,
  availability,
  channelStyles = ALL_QUIZ_IMAGE_STYLES,
}: UseTopicCardStateOptions) {
  const isShortReel = topic.content_kind === "short_reel";
  const canConfirm = availability ? availability.can_confirm : true;
  const isBound = Array.isArray(topic.source_bindings) && topic.source_bindings.length > 0;
  const sourceCapacity =
    availability?.source_capacity ?? (isBound ? topic.source_bindings!.length : QUIZ_MAX_QUESTION_COUNT);
  const maxAllowedQuestions = calculateMaxAllowedQuestions(
    topic.content_kind,
    sourceCapacity,
    isBound || Boolean(availability),
  );

  const [questionCount, setQuestionCount] = useState(
    isShortReel ? 1 : Math.min(topic.question_count, maxAllowedQuestions),
  );
  const [selectedStyle, setSelectedStyle] = useState<QuizImageStyle | "mixed">(
    topic.content_kind === "episode" && topic.visual_style ? topic.visual_style : "mixed",
  );
  const isQuestionCountValid = validateQuestionCount(
    questionCount,
    maxAllowedQuestions,
    isShortReel,
    availability ? sourceCapacity : undefined,
  );
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;

  return {
    isShortReel,
    canConfirm,
    sourceCapacity,
    maxAllowedQuestions,
    questionCount,
    setQuestionCount,
    selectedStyle,
    setSelectedStyle,
    isQuestionCountValid,
    availableStyles,
  };
}
