import { useMemo } from "react";
import { CircleNotch, Lightbulb, Sparkle } from "@phosphor-icons/react";
import type { Channel, QuizImageStyle, Task, TopicAvailability, TopicCandidate, TopicRun } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { TopicProgress } from "../../../components/TaskProgressPanel";
import { useTopicAvailability } from "../hooks/useTopicAvailability";
import { TOPIC_FORMAT_SECTIONS, TopicFormatSection } from "./TopicFormatSection";
import { TopicHistorySection } from "./TopicHistorySection";

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
  onDeleteTopic?: (topic: TopicCandidate) => Promise<void> | void;
  onClearHistory?: (unselectedOnly?: boolean) => Promise<void> | void;
  deletingTopicId?: string | null;
  clearingTopicHistory?: boolean;
  availabilityMap?: Map<string, TopicAvailability>;
};

interface LatestRunSplit {
  latestRunTopics: TopicCandidate[];
  historyTopics: TopicCandidate[];
  hasEmptyLatestRunShortages: boolean;
}

/** Groups by authoritative run identity; partial or empty runs are never filled with historical results. */
function splitLatestRun(topics: TopicCandidate[], latestRun?: TopicRun | null): LatestRunSplit {
  if (latestRun) {
    const runId = latestRun.run_id;
    const latest = topics.filter((t) => Boolean(t.run_id && t.run_id === runId));
    const history = topics.filter((t) => !t.run_id || t.run_id !== runId);
    const hasEmptyLatestRunShortages = latest.length === 0 && (latestRun.shortages?.length ?? 0) > 0;
    return { latestRunTopics: latest, historyTopics: history, hasEmptyLatestRunShortages };
  }

  if (topics.length === 0) {
    return { latestRunTopics: [], historyTopics: [], hasEmptyLatestRunShortages: false };
  }

  const firstRunId = topics[0]?.run_id;
  if (firstRunId) {
    const latest = topics.filter((t) => Boolean(t.run_id && t.run_id === firstRunId));
    const history = topics.filter((t) => !t.run_id || t.run_id !== firstRunId);
    return { latestRunTopics: latest, historyTopics: history, hasEmptyLatestRunShortages: false };
  }

  // Unassigned legacy candidates without run_id belong in history, never inferred into a latest run
  return { latestRunTopics: [], historyTopics: topics, hasEmptyLatestRunShortages: false };
}

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
  onDeleteTopic,
  onClearHistory,
  deletingTopicId,
  clearingTopicHistory,
  availabilityMap: externalAvailabilityMap,
}: ChannelTopicsTabProps) {
  const internalAvailability = useTopicAvailability({
    channelId: channel.channel_id,
    enabled: externalAvailabilityMap === undefined,
  });
  const availabilityMap = externalAvailabilityMap ?? internalAvailability.availabilityMap;

  const { latestRunTopics, historyTopics, hasEmptyLatestRunShortages } = useMemo(
    () => splitLatestRun(topics, latestRun),
    [topics, latestRun],
  );

  // Latest run grouped by content kind in Topics tab order: Episode, Quiz Short, Short Reel
  const sectionTopics = useMemo(
    () => TOPIC_FORMAT_SECTIONS.map((section) => latestRunTopics.filter((t) => t.content_kind === section.kind)),
    [latestRunTopics],
  );
  const firstVisibleSectionIndex = sectionTopics.findIndex((group) => group.length > 0);
  const suggestDisabled = busy === "topics" || topicTaskActive || channel.status === "ARCHIVED";

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
              if (event.key === "Enter" && !suggestDisabled) {
                void onSuggest();
              }
            }}
            disabled={suggestDisabled}
          />
          <button className="primary-button" disabled={suggestDisabled} onClick={() => void onSuggest()}>
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
            No candidates could be generated for the latest run because the Question Bank lacks sufficient eligible questions matching the
            required formats and archetypes.
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
          {TOPIC_FORMAT_SECTIONS.map((section, index) => (
            <TopicFormatSection
              key={section.kind}
              section={section}
              topics={sectionTopics[index]}
              channelStyles={channel.selected_styles}
              availabilityMap={availabilityMap}
              confirmingTopicId={confirmingTopicId}
              disabled={channel.status === "ARCHIVED"}
              isFirst={index === firstVisibleSectionIndex}
              onConfirmTopic={onConfirmTopic}
            />
          ))}

          {historyTopics.length > 0 ? (
            <TopicHistorySection
              historyTopics={historyTopics}
              latestRunTopicsCount={latestRunTopics.length}
              channelStyles={channel.selected_styles}
              availabilityMap={availabilityMap}
              confirmingTopicId={confirmingTopicId}
              channelStatus={channel.status}
              onConfirmTopic={onConfirmTopic}
              onDeleteTopic={onDeleteTopic}
              onClearHistory={onClearHistory}
              deletingTopicId={deletingTopicId}
              clearingTopicHistory={clearingTopicHistory}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
