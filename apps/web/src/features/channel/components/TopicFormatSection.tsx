import type { QuizImageStyle, TopicAvailability, TopicCandidate, TopicContentKind } from "@studio/shared";
import { TopicCard } from "./TopicCard";

export interface TopicFormatSectionCopy {
  kind: TopicContentKind;
  title: string;
  subtitle: string;
  aspectRatio: "16:9" | "9:16";
}

/** The three latest-run groups, in the order the Topics tab lists them. */
export const TOPIC_FORMAT_SECTIONS: readonly TopicFormatSectionCopy[] = [
  { kind: "episode", title: "Long-form Episodes", subtitle: "Landscape 16:9 Concepts", aspectRatio: "16:9" },
  { kind: "quiz_short", title: "Quiz Shorts", subtitle: "Vertical 9:16 five-question quizzes", aspectRatio: "9:16" },
  { kind: "short_reel", title: "Short-Reels", subtitle: "Vertical 9:16 Mobile Concepts", aspectRatio: "9:16" },
];

export interface TopicFormatSectionProps {
  section: TopicFormatSectionCopy;
  topics: TopicCandidate[];
  channelStyles?: QuizImageStyle[];
  availabilityMap: Map<string, TopicAvailability>;
  confirmingTopicId: string | null;
  disabled: boolean;
  isFirst: boolean;
  onConfirmTopic: (topic: TopicCandidate, questionCount: number, visualStyle?: QuizImageStyle | "mixed") => Promise<void>;
}

export function TopicFormatSection({
  section,
  topics,
  channelStyles,
  availabilityMap,
  confirmingTopicId,
  disabled,
  isFirst,
  onConfirmTopic,
}: TopicFormatSectionProps) {
  if (topics.length === 0) return null;
  const isPortrait = section.aspectRatio === "9:16";

  return (
    <div className={`topic-format-section topic-format-section-${section.kind}`} style={isFirst ? undefined : { marginTop: "28px" }}>
      <div className="topic-format-section-header">
        <div className="topic-format-heading-left">
          <span className={`topic-format-indicator ${isPortrait ? "is-vertical" : "is-landscape"}`}>{section.aspectRatio}</span>
          <h3 className="topic-format-title">
            {section.title} ({topics.length})
          </h3>
        </div>
        <span className="topic-format-subtitle">{section.subtitle}</span>
      </div>
      <div className={`topic-grid ${isPortrait ? "topic-grid-vertical" : "topic-grid-landscape"}`}>
        {topics.map((topic) => (
          <TopicCard
            key={topic.topic_id}
            topic={topic}
            channelStyles={channelStyles}
            availability={availabilityMap.get(topic.topic_id)}
            busy={confirmingTopicId === topic.topic_id}
            disabled={Boolean(confirmingTopicId) || disabled}
            onConfirm={(questionCount, visualStyle) => void onConfirmTopic(topic, questionCount, visualStyle)}
          />
        ))}
      </div>
    </div>
  );
}
