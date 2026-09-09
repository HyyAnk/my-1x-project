import { useMemo } from "react";
import { CircleNotch, Lightbulb, Sparkle } from "@phosphor-icons/react";
import type { Channel, QuizImageStyle, Task, TopicAvailability, TopicCandidate, TopicRun } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { TopicProgress } from "../../../components/TaskProgressPanel";
import { useTopicAvailability } from "../hooks/useTopicAvailability";
import { TopicCard } from "./TopicCard";
import { TopicHistoryRow } from "./TopicHistoryRow";

type ChannelTopicsTabProps = {
  channel: Channel;
  topics: TopicCandidate[];
  latestRun?: TopicRun | null;
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
  latestRun,
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
    enabled: externalAvailabilityMap === undefined,
  });
  const availabilityMap = externalAvailabilityMap ?? internalAvailability.availabilityMap;

  // Group latest run by authoritative run identity; do not fill partial/empty runs with historical results
  const { latestRunTopics, historyTopics, hasEmptyLatestRunShortages } = useMemo(() => {
    if (latestRun) {
      const runId = latestRun.run_id;
      const latest = topics.filter((t) => t.run_id === runId);
      const history = topics.filter((t) => t.run_id !== runId);
      const hasEmptyLatestRunShortages = latest.length === 0 && (latestRun.shortages?.length ?? 0) > 0;
      return { latestRunTopics: latest, historyTopics: history, hasEmptyLatestRunShortages };
    }

    if (topics.length === 0) {
      return { latestRunTopics: [], historyTopics: [], hasEmptyLatestRunShortages: false };
    }

    const firstRunId = topics[0]?.run_id;
    if (firstRunId) {
      const latest = topics.filter((t) => t.run_id === firstRunId);
      const history = topics.filter((t) => t.run_id !== firstRunId);
      return { latestRunTopics: latest, historyTopics: history, hasEmptyLatestRunShortages: false };
    }

    const latestTimestamp = topics[0]?.generated_at;
    const isSameRun = (timeA: string, timeB: string) => {
      if (timeA === timeB) return true;
      return Math.abs(new Date(timeA).getTime() - new Date(timeB).getTime()) < 1500;
    };
    const latest = topics.filter((t) => isSameRun(t.generated_at, latestTimestamp));
    const history = topics.filter((t) => !isSameRun(t.generated_at, latestTimestamp));
    return { latestRunTopics: latest, historyTopics: history, hasEmptyLatestRunShortages: false };
  }, [topics, latestRun]);
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

      {hasEmptyLatestRunShortages ? (
        <div
          className="topic-shortage-notice"
          role="status"
          style={{
            padding: "14px 18px",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "var(--warning, #d97706)" }}>
            <Lightbulb size={20} />
            <span>Latest Suggestion Run Shortage Notice</span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "14px", color: "var(--text-muted, #555)" }}>
            No candidates could be generated for the latest run because the Question Bank lacks sufficient eligible questions matching the required formats and archetypes.
          </p>
        </div>
      ) : null}

      {topics.length === 0 ? (
        <EmptyState
          compact
          icon={<Lightbulb size={23} />}
          title={hasEmptyLatestRunShortages ? "No eligible questions found" : "No topic candidates yet"}
          copy={
            hasEmptyLatestRunShortages
              ? "The question bank had shortages for all requested slots. Add more approved questions to Question Bank or try another topic hint."
              : "Generate tailored video concepts aligned with your Channel DNA, or enter a topic hint above."
          }
          action="Suggest topics"
          disabled={topicTaskActive}
          busy={topicTaskActive}
          busyLabel="Generating topics…"
          onAction={() => void onSuggest()}
        />
      ) : (
        <>
          {latestRunTopics.length > 0 ? (
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
          ) : null}

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
