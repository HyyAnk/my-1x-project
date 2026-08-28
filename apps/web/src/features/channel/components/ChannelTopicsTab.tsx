import { CircleNotch, Lightbulb, Sparkle } from "@phosphor-icons/react";
import type { Channel, QuizImageStyle, Task, TopicCandidate } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { TopicProgress } from "../../../components/TaskProgressPanel";
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
}: ChannelTopicsTabProps) {
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
            <span>{topicTaskActive ? "Generating…" : "Suggest 5 topics"}</span>
          </button>
        </div>
      </div>

      {topicTask ? <TopicProgress task={topicTask} now={topicClock} /> : null}

      {topics.length === 0 ? (
        <EmptyState
          compact
          icon={<Lightbulb size={23} />}
          title="No topic candidates yet"
          copy="Let AI generate 5 tailored video concepts aligned with your Channel DNA, or enter a topic hint above."
          action="Suggest topics"
          disabled={topicTaskActive}
          busy={topicTaskActive}
          busyLabel="Generating topics…"
          onAction={() => void onSuggest()}
        />
      ) : (
        <>
          <div className="topic-grid">
            {topics.slice(0, 5).map((topic) => (
              <TopicCard
                key={topic.topic_id}
                topic={topic}
                channelStyles={channel.selected_styles}
                busy={confirmingTopicId === topic.topic_id}
                disabled={Boolean(confirmingTopicId) || channel.status === "ARCHIVED"}
                onConfirm={(questionCount, visualStyle) => void onConfirmTopic(topic, questionCount, visualStyle)}
              />
            ))}
          </div>

          {topics.length > 5 ? (
            <div className="topic-history-section">
              <div className="section-heading" style={{ marginTop: "32px", marginBottom: "14px" }}>
                <div>
                  <p className="eyebrow">Archive & Previous Ideas</p>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                    Older Ideas History ({topics.length - 5})
                  </h3>
                </div>
                <span className="count-note">Single-line archive view</span>
              </div>
              <div className="topic-history-list">
                {topics.slice(5).map((topic, index) => (
                  <TopicHistoryRow
                    key={topic.topic_id}
                    index={index + 6}
                    topic={topic}
                    channelStyles={channel.selected_styles}
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
