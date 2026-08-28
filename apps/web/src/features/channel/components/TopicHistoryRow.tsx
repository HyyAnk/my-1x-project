import { CircleNotch, Play } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, type QuizImageStyle, type TopicCandidate } from "@studio/shared";
import { TopicLayoutPreviewButton } from "./TopicLayoutPreviewButton";

export function TopicHistoryRow({
  topic,
  index,
  channelStyles = ALL_QUIZ_IMAGE_STYLES,
  onConfirm,
  busy,
  disabled,
}: {
  topic: TopicCandidate;
  index: number;
  channelStyles?: QuizImageStyle[];
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
        <TopicLayoutPreviewButton quizFormat={topic.quiz_format} />
        <button
          type="button"
          className="topic-history-use-btn"
          disabled={disabled}
          onClick={() => onConfirm(topic.question_count, topic.visual_style ?? "mixed")}
          title={`Use this topic (${topic.question_count} questions)`}
        >
          {busy ? <CircleNotch className="spin" size={13} /> : <Play size={12} weight="fill" />}
          <span>{busy ? "Creating…" : "Use"}</span>
        </button>
      </div>
    </div>
  );
}
