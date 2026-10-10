import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import type { QuizImageStyle, TopicCandidate } from "@studio/shared";
import { getTopicKindPresentation } from "./topicKindPresentation";

export interface TopicFooterProps {
  topic: TopicCandidate;
  busy: boolean;
  disabled: boolean;
  isQuestionCountValid: boolean;
  canConfirm: boolean;
  sourceCapacity: number;
  recoveryAction?: string;
  questionCount: number;
  selectedStyle: QuizImageStyle | "mixed";
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
}

export function TopicFooter({
  topic,
  busy,
  disabled,
  isQuestionCountValid,
  canConfirm,
  sourceCapacity,
  recoveryAction,
  questionCount,
  selectedStyle,
  onConfirm,
}: TopicFooterProps) {
  const isShortReel = topic.content_kind === "short_reel";
  const kind = getTopicKindPresentation(topic.content_kind);
  const actionLabel = isShortReel ? "Create Short-Reel" : kind.selectLabel;

  return (
    <div className="topic-footer">
      <div className="topic-footer-meta">
        <span className="topic-potential-label">Potential</span>
        <span className="topic-potential-val" title={`Estimated Potential: ${topic.estimated_potential || "Normal"}`}>
          {topic.estimated_potential || "Normal"}
        </span>
      </div>
      <button
        className="primary-button topic-build-btn"
        disabled={disabled || !isQuestionCountValid || !canConfirm}
        title={
          !canConfirm ? recoveryAction : !isQuestionCountValid ? `Question count must not exceed capacity (${sourceCapacity})` : undefined
        }
        onClick={() => onConfirm(isShortReel ? 1 : questionCount, selectedStyle)}
      >
        {busy ? <CircleNotch className="spin" size={15} /> : <CheckCircle size={15} weight="bold" />}
        <span>{busy ? kind.busyLabel : actionLabel}</span>
      </button>
    </div>
  );
}
