import { useMemo } from "react";
import { CircleNotch, Lightbulb, Sparkle } from "@phosphor-icons/react";
import type { Channel, QuizImageStyle, Task, TopicAvailability, TopicCandidate } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { TopicProgress } from "../../../components/TaskProgressPanel";
import { useTopicAvailability } from "../hooks/useTopicAvailability";
import { TopicCard } from "./TopicCard";
import { TopicHistoryRow } from "./TopicHistoryRow";

type ChannelTopicsTabProps = {
  channel: Channel;
  topics: TopicCandidate[];
  topicTask: Task | null;
  topicClock: number;
  topicHint: string;
  setTopicHint: (hint: string) => void;
  topicTaskActive: boolean;
  busy: string | null;
  confirmingTopicId: string | null;
  onSuggest: (overrideHint?: string) => Promise<void>;
  onConfirmTopic: (topic: TopicCandidate, questionCount: number, visualStyle?: QuizImageStyle | "mixed") => Promise<void>;
  availabilityMap?: Map<string, TopicAvailability>;
};

export function ChannelTopicsTab({
  channel,
  topics,
  topicTask,
  topicClock,
  topicHint,
  setTopicHint,
  topicTaskActive,
  busy,
  confirmingTopicId,
  onSuggest,
  onConfirmTopic,
  availabilityMap: externalAvailabilityMap,
}: ChannelTopicsTabProps) {
  const internalAvailability = useTopicAvailability({
    channelId: channel.channel_id,
    enabled: true,
  });
  const availabilityMap = externalAvailabilityMap ?? internalAvailability.availabilityMap;

  // Group latest run as a coherent unit; do not fill partial runs with historical results
  const { latestRunTopics, historyTopics } = useMemo(() => {
    if (topics.length === 0) return { latestRunTopics: [], historyTopics: [] };
    const latestTimestamp = topics[0]?.generated_at;
    const isSameRun = (timeA: string, timeB: string) => {
      if (timeA === timeB) return true;
      return Math.abs(new Date(timeA).getTime() - new Date(timeB).getTime()) < 1500;
    };
    const latestRun = topics.filter((t) => isSameRun(t.generated_at, latestTimestamp));
    const history = topics.filter((t) => !isSameRun(t.generated_at, latestTimestamp));
    return { latestRunTopics: latestRun, historyTopics: history };
  }, [topics]);
  return (
    <div>
      <div className="section-heading" style={{ marginTop: "12px" }}>
        <div>
          <p className="eyebrow">Brainstorm & Curation</p>
          <h2>Topic Ideas ({topics.length})</h2>
        </div>
        <div className="topic-suggest-group">
          <input
            type="text"
            className="text-input topic-hint-input"
            placeholder="Suggest Keyword"
            value={topicHint}
            onChange={(event) => setTopicHint(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !topicTaskActive && busy !== "topics" && channel.status !== "ARCHIVED") {
                void onSuggest();
              }
            }}
            disabled={busy === "topics" || topicTaskActive || channel.status === "ARCHIVED"}
          />
          <button
            className="primary-button"
            disabled={busy === "topics" || topicTaskActive || channel.status === "ARCHIVED"}
            onClick={() => void onSuggest()}
          >
            {busy === "topics" || topicTaskActive ? <CircleNotch className="spin" size={17} /> : <Sparkle size={17} />}
            <span>{topicTaskActive ? "Generating…" : "Suggest topics"}</span>
          </button>
        </div>
      </div>

      {topicTask ? <TopicProgress task={topicTask} now={topicClock} /> : null}

      {topics.length === 0 ? (
        <EmptyState
          compact
          icon={<Lightbulb size={23} />}
          title="No topic candidates yet"
          copy="Generate tailored video concepts aligned with your Channel DNA, or enter a topic hint above."
          action="Suggest topics"
          disabled={topicTaskActive}
          busy={topicTaskActive}
          busyLabel="Generating topics…"
          onAction={() => void onSuggest()}
        />
      ) : (
        <>
          <div className="topic-grid">
            {latestRunTopics.map((topic) => (
              <TopicCard
                key={topic.topic_id}
                topic={topic}
                channelStyles={channel.selected_styles}
                availability={availabilityMap.get(topic.topic_id)}
                busy={confirmingTopicId === topic.topic_id}
                disabled={Boolean(confirmingTopicId) || channel.status === "ARCHIVED"}
                onConfirm={(questionCount, visualStyle) => void onConfirmTopic(topic, questionCount, visualStyle)}
              />
            ))}
          </div>

          {historyTopics.length > 0 ? (
            <div className="topic-history-section">
              <div className="section-heading" style={{ marginTop: "32px", marginBottom: "14px" }}>
                <div>
                  <p className="eyebrow">Archive & Previous Ideas</p>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Older Ideas History ({historyTopics.length})</h3>
                </div>
                <span className="count-note">Single-line archive view</span>
              </div>
              <div className="topic-history-list">
                {historyTopics.map((topic, index) => (
                  <TopicHistoryRow
                    key={topic.topic_id}
                    index={latestRunTopics.length + index + 1}
                    topic={topic}
                    channelStyles={channel.selected_styles}
                    availability={availabilityMap.get(topic.topic_id)}
                    busy={confirmingTopicId === topic.topic_id}
                    disabled={Boolean(confirmingTopicId) || channel.status === "ARCHIVED"}
                    onConfirm={(questionCount, visualStyle) => void onConfirmTopic(topic, questionCount, visualStyle)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
