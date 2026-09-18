import { useState } from "react";
import { CaretDown, CaretUp, CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, type QuizImageStyle, type TopicAvailability, type TopicCandidate } from "@studio/shared";
import { getTopicAvailabilityPresentation, getTopicFormatBadge } from "../../utils/topicHistoryHelpers";
import { TopicLayoutPreviewButton } from "../TopicLayoutPreviewButton";
import { TopicHistoryPremiseDetail } from "./TopicHistoryPremiseDetail";

export interface TopicHistoryRowProps {
  topic: TopicCandidate;
  index: number;
  channelStyles?: QuizImageStyle[];
  availability?: TopicAvailability;
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
  busy: boolean;
  disabled: boolean;
}

export function TopicHistoryRow({
  topic,
  index,
  channelStyles: _channelStyles = ALL_QUIZ_IMAGE_STYLES,
  availability,
  onConfirm,
  busy,
  disabled,
}: TopicHistoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatBadge = getTopicFormatBadge(topic);
  const availabilityInfo = availability ? getTopicAvailabilityPresentation(availability) : null;
  const isActionDisabled = disabled || (availabilityInfo ? !availabilityInfo.canConfirm : false);

  const buttonTooltip =
    availabilityInfo && !availabilityInfo.canConfirm
      ? availabilityInfo.tooltip
      : `Select this topic (${topic.question_count} questions${availability ? `, ${availability.source_capacity} available` : ""})`;

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  return (
    <div className={`topic-history-row${isExpanded ? " is-expanded" : ""}`}>
      <div className="topic-history-col-identity">
        <span className="topic-history-index">#{String(index).padStart(2, "0")}</span>
        <span className={`topic-format-pill ${formatBadge.indicatorClass}`} title={`${formatBadge.label} format (${formatBadge.format})`}>
          {formatBadge.badgeText}
        </span>
      </div>

      <div className="topic-history-col-content">
        <div className="topic-history-title-wrap">
          <strong className="topic-history-title" title={`${topic.title}\n\nPremise: ${topic.premise}`}>
            {topic.title}
          </strong>
          {topic.theme_hint && (
            <span className="topic-theme-badge compact" title={`Suggested by topic: ${topic.theme_hint}`}>
              🎯 {topic.theme_hint}
            </span>
          )}
          {topic.estimated_potential && (
            <span className="topic-history-potential" title="Estimated Potential">
              {topic.estimated_potential}
            </span>
          )}
          {topic.premise && (
            <span
              className="topic-history-premise-snippet"
              title="Click or press enter to view full premise details"
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={`topic-premise-${topic.topic_id}`}
              onClick={toggleExpand}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpand();
                }
              }}
            >
              — {topic.premise}
            </span>
          )}
          <button
            type="button"
            className="topic-history-expand-btn"
            onClick={toggleExpand}
            aria-expanded={isExpanded}
            aria-controls={`topic-premise-${topic.topic_id}`}
            aria-label={isExpanded ? `Hide premise preview for ${topic.title}` : `Expand premise preview for ${topic.title}`}
            title={isExpanded ? "Hide premise details" : "Show premise details"}
          >
            {isExpanded ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
            <span>{isExpanded ? "Hide" : "Premise"}</span>
          </button>
        </div>
      </div>

      <div className="topic-history-col-status">
        {availabilityInfo && (
          <span className={`topic-history-status is-${availabilityInfo.status}`} title={availabilityInfo.tooltip}>
            {availabilityInfo.label}
          </span>
        )}
      </div>

      <div className="topic-history-col-actions">
        {topic.content_kind === "episode" && <TopicLayoutPreviewButton quizFormat={topic.quiz_format} />}
        <button
          type="button"
          className="topic-history-use-btn"
          disabled={isActionDisabled}
          aria-busy={busy}
          onClick={() => onConfirm(topic.question_count, topic.content_kind === "episode" ? (topic.visual_style ?? "mixed") : "mixed")}
          title={buttonTooltip}
          aria-label={`Select topic: ${topic.title}`}
        >
          {busy ? <CircleNotch className="spin" size={13} /> : <CheckCircle size={13} weight="bold" />}
          <span>{busy ? "Selecting…" : "Select"}</span>
        </button>
      </div>

      {isExpanded && <TopicHistoryPremiseDetail topic={topic} formatLabel={formatBadge.label} format={formatBadge.format} />}
    </div>
  );
}
