import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, type QuizImageStyle, type TopicAvailability, type TopicCandidate } from "@studio/shared";
import { TopicLayoutPreviewButton } from "./TopicLayoutPreviewButton";

export function TopicHistoryRow({
  topic,
  index,
  channelStyles = ALL_QUIZ_IMAGE_STYLES,
  availability,
  onConfirm,
  busy,
  disabled,
}: {
  topic: TopicCandidate;
  index: number;
  channelStyles?: QuizImageStyle[];
  availability?: TopicAvailability;
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <div className="topic-history-row">
      <div className="topic-history-main">
        <span className="topic-history-index">#{String(index).padStart(2, "0")}</span>
        <div className="topic-history-title-wrap">
          <strong className="topic-history-title" title={`${topic.title}\n\nPremise: ${topic.premise}`}>
            {topic.title}
          </strong>
          {topic.theme_hint ? (
            <span className="topic-theme-badge compact" title={`Suggested by topic: ${topic.theme_hint}`}>
              🎯 {topic.theme_hint}
            </span>
          ) : null}
        </div>
      </div>
      <div className="topic-history-meta">
        <span className="topic-history-potential" title="Estimated Potential">
          {topic.estimated_potential || "Normal"}
        </span>
        {availability ? (
          <span
            className="badge"
            style={{
              fontSize: "10px",
              padding: "1px 5px",
              borderRadius: "3px",
              backgroundColor: availability.can_confirm ? "#059669" : "#dc2626",
              color: "#fff",
              fontWeight: 600,
            }}
            title={availability.recovery_action}
          >
            {availability.can_confirm
              ? `${availability.source_capacity} Ready`
              : availability.reason_code === "UNBOUND_LEGACY_TOPIC"
                ? "Legacy Unbound"
                : "Unavailable"}
          </span>
        ) : null}
        {topic.content_kind === "episode" ? <TopicLayoutPreviewButton quizFormat={topic.quiz_format} /> : null}
        <button
          type="button"
          className="topic-history-use-btn"
          disabled={disabled || (availability !== undefined && !availability.can_confirm)}
          onClick={() => onConfirm(topic.question_count, topic.content_kind === "episode" ? (topic.visual_style ?? "mixed") : "mixed")}
          title={
            availability && !availability.can_confirm
              ? availability.recovery_action
              : `Select this topic (${topic.question_count} questions${availability ? `, ${availability.source_capacity} available` : ""})`
          }
        >
          {busy ? <CircleNotch className="spin" size={13} /> : <CheckCircle size={13} weight="bold" />}
          <span>{busy ? "Selecting…" : "Select"}</span>
        </button>
      </div>
    </div>
  );
}
