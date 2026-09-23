import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, type QuizImageStyle, type TopicAvailability, type TopicCandidate } from "@studio/shared";
import { getTopicAvailabilityPresentation, getTopicFormatBadge } from "../../utils/topicHistoryHelpers";
import { TopicLayoutPreviewButton } from "../TopicLayoutPreviewButton";
import { formatDomain } from "../topicCard/topicCardHelpers";

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
  const formatBadge = getTopicFormatBadge(topic);
  const availabilityInfo = availability ? getTopicAvailabilityPresentation(availability) : null;
  const isActionDisabled = disabled || (availabilityInfo ? !availabilityInfo.canConfirm : false);

  const buttonTooltip =
    availabilityInfo && !availabilityInfo.canConfirm
      ? availabilityInfo.tooltip
      : `Select this topic (${topic.question_count} questions${availability ? `, ${availability.source_capacity} available` : ""})`;

  const shortReelArchetypeLabel =
    topic.archetype === "versus_faceoff"
      ? "Versus Face-off"
      : topic.archetype === "verdict_true_false"
        ? "True or False"
        : "Deep Trivia";

  return (
    <div className="topic-history-row">
      <div className="topic-history-col-identity">
        <span className="topic-history-index">#{String(index).padStart(2, "0")}</span>
        <span className={`topic-format-pill ${formatBadge.indicatorClass}`} title={`${formatBadge.label} format (${formatBadge.format})`}>
          {formatBadge.badgeText}
        </span>
      </div>

      <div className="topic-history-col-title">
        <strong className="topic-history-title" title={topic.title}>
          {topic.title}
        </strong>
        {topic.theme_hint && (
          <span className="topic-theme-badge compact" title={`Suggested by topic: ${topic.theme_hint}`}>
            🎯 {topic.theme_hint}
          </span>
        )}
      </div>

      <div className="topic-history-col-domain">
        {topic.domain_id ? (
          <span className="topic-domain-badge" title={`Domain: ${formatDomain(topic.domain_id)}`}>
            🏛️ {formatDomain(topic.domain_id)}
          </span>
        ) : (
          <span className="topic-domain-empty">—</span>
        )}
      </div>

      <div className="topic-history-col-archetype">
        {topic.content_kind === "episode" ? (
          <TopicLayoutPreviewButton
            quizFormat={topic.quiz_format}
            archetype={topic.archetype}
            layoutId={topic.suggested_layout}
            aspectRatio="16:9"
          />
        ) : (
          <span className="topic-archetype-tag" title={topic.archetype}>
            {shortReelArchetypeLabel}
          </span>
        )}
      </div>

      <div className="topic-history-col-actions">
        {availabilityInfo && (
          <span className={`topic-history-status is-${availabilityInfo.status}`} title={availabilityInfo.tooltip}>
            {availabilityInfo.label}
          </span>
        )}
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
    </div>
  );
}
