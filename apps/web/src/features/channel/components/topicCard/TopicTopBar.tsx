import type { TopicAvailability, TopicCandidate } from "@studio/shared";
import { TopicLayoutPreviewButton } from "../TopicLayoutPreviewButton";
import { formatDomain } from "./topicCardHelpers";

export interface TopicTopBarProps {
  topic: TopicCandidate;
  availability?: TopicAvailability;
  canConfirm: boolean;
  sourceCapacity: number;
}

export function TopicTopBar({
  topic,
  availability,
  canConfirm,
  sourceCapacity,
}: TopicTopBarProps) {
  const isShortReel = topic.content_kind === "short_reel";

  return (
    <div className="topic-card-top-bar">
      <div className="topic-card-top-row">
        <div className="topic-card-format-group">
          <span className={`topic-format-badge ${isShortReel ? "is-vertical" : "is-landscape"}`}>
            {isShortReel ? "9:16 Short-Reel" : "16:9 Episode"}
          </span>
          <span className="topic-origin-badge">{topic.origin === "keyword" ? "Keyword" : "Discovery"}</span>
        </div>
        <div>
          {topic.content_kind === "episode" ? (
            <TopicLayoutPreviewButton
              quizFormat={topic.quiz_format}
              archetype={topic.archetype}
              layoutId={topic.suggested_layout}
            />
          ) : (
            <span className="topic-archetype-tag">
              {topic.archetype === "versus_faceoff" ? "Versus Face-off" : "Deep Trivia"}
            </span>
          )}
        </div>
      </div>
      <div className="topic-card-tags-row">
        {topic.domain_id ? (
          <span className="topic-domain-badge" title={`Domain: ${formatDomain(topic.domain_id)}`}>
            🏛️ {formatDomain(topic.domain_id)}
          </span>
        ) : null}
        {topic.theme_hint ? (
          <span className="topic-theme-badge" title={`Suggested by topic: ${topic.theme_hint}`}>
            🎯 {topic.theme_hint}
          </span>
        ) : null}
        {availability ? (
          <span
            className={`badge topic-availability-pill ${canConfirm ? "is-ready" : "is-unready"}`}
            title={availability.recovery_action}
          >
            {canConfirm
              ? `${sourceCapacity} Ready`
              : availability.reason_code === "UNBOUND_LEGACY_TOPIC"
                ? "Legacy Unbound"
                : "Unavailable"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
