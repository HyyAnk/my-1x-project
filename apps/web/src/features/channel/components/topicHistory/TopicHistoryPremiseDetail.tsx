import type { TopicCandidate } from "@studio/shared";

export interface TopicHistoryPremiseDetailProps {
  topic: TopicCandidate;
  formatLabel: string;
  format: string;
}

/**
 * TopicHistoryPremiseDetail renders the expanded premise drawer for a topic history row,
 * presenting full premise text, archetype, hook, audience fit, and question count.
 */
export function TopicHistoryPremiseDetail({ topic, formatLabel, format }: TopicHistoryPremiseDetailProps) {
  return (
    <div
      className="topic-history-premise-expanded"
      role="region"
      id={`topic-premise-${topic.topic_id}`}
      aria-label={`Premise details for ${topic.title}`}
    >
      <div className="topic-history-premise-main">
        <span className="topic-history-premise-tag">Full Premise</span>
        <p className="topic-history-premise-text">{topic.premise}</p>
      </div>
      <div className="topic-history-premise-details">
        {topic.archetype ? (
          <div className="topic-history-detail-item">
            <span className="topic-history-detail-label">Archetype:</span>
            <span className="topic-history-detail-val">{topic.archetype.replace(/_/g, " ")}</span>
          </div>
        ) : null}
        {topic.hook ? (
          <div className="topic-history-detail-item">
            <span className="topic-history-detail-label">Hook:</span>
            <span className="topic-history-detail-val">"{topic.hook}"</span>
          </div>
        ) : null}
        {topic.why_it_fits ? (
          <div className="topic-history-detail-item">
            <span className="topic-history-detail-label">Audience Fit:</span>
            <span className="topic-history-detail-val">{topic.why_it_fits}</span>
          </div>
        ) : null}
        <div className="topic-history-detail-item">
          <span className="topic-history-detail-label">Format:</span>
          <span className="topic-history-detail-val">
            {formatLabel} ({format}) • {topic.question_count} Questions
          </span>
        </div>
      </div>
    </div>
  );
}
