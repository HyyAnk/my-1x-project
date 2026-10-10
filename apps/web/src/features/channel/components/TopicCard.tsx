import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import type { QuizImageStyle, TopicAvailability, TopicCandidate } from "@studio/shared";
import { TopicAvailabilityNotice, TopicTopBar, useTopicCardState } from "./topicCard/index";
import { getTopicKindPresentation } from "./topicCard/topicKindPresentation";

export interface TopicCardProps {
  topic: TopicCandidate;
  channelStyles?: QuizImageStyle[];
  availability?: TopicAvailability;
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
  busy: boolean;
  disabled: boolean;
}

function resolveConfirmQuestionCount(topic: TopicCandidate, minQuestionCount: number, maxAllowedQuestions: number): number {
  if (topic.content_kind === "short_reel") return 1;
  if (topic.content_kind === "quiz_short") return Math.max(minQuestionCount, Math.min(topic.question_count, maxAllowedQuestions));
  return Math.max(1, Math.min(topic.question_count || 8, maxAllowedQuestions));
}

export function TopicCard({ topic, channelStyles, availability, onConfirm, busy, disabled }: TopicCardProps) {
  const { isShortReel, canConfirm, sourceCapacity, maxAllowedQuestions, minQuestionCount, selectedStyle } = useTopicCardState({
    topic,
    availability,
    channelStyles,
  });
  const kind = getTopicKindPresentation(topic.content_kind);

  const isClickable = !disabled && !busy && canConfirm;

  const handleSelect = () => {
    if (!isClickable) return;
    const finalQuestionCount = resolveConfirmQuestionCount(topic, minQuestionCount, maxAllowedQuestions);
    const finalStyle = topic.content_kind === "episode" ? (topic.visual_style ?? selectedStyle) : "mixed";
    onConfirm(finalQuestionCount, finalStyle);
  };

  const cardTitleTooltip =
    !canConfirm && availability?.recovery_action ? availability.recovery_action : `Click to select "${topic.title}" and start creation`;
  const kindClass = isShortReel ? "topic-card-short-reel" : kind.isPortrait ? "topic-card-quiz-short" : "";

  return (
    <article
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={`Select topic: ${topic.title}`}
      aria-disabled={!isClickable}
      className={`topic-card ${kindClass} ${isClickable ? "is-clickable" : "is-disabled"} ${busy ? "is-busy" : ""}`}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      title={cardTitleTooltip}
    >
      <TopicTopBar topic={topic} availability={availability} canConfirm={canConfirm} sourceCapacity={sourceCapacity} />
      <h3 className="topic-card-title" title={topic.title}>
        {topic.title}
      </h3>
      {availability ? <TopicAvailabilityNotice availability={availability} /> : null}

      <div className="topic-card-action-bar">
        {busy ? (
          <div className="topic-card-action-status is-busy">
            <CircleNotch className="spin" size={14} />
            <span>{kind.busyLabel}</span>
          </div>
        ) : canConfirm ? (
          <div className="topic-card-action-status is-ready">
            <span>{kind.selectLabel}</span>
            <ArrowRight size={13} weight="bold" />
          </div>
        ) : (
          <div className="topic-card-action-status is-unavailable">
            <span>{availability?.recovery_action || "Unavailable"}</span>
          </div>
        )}
      </div>
    </article>
  );
}
