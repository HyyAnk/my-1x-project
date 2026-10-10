import { useMemo, useState } from "react";
import { CaretDown, CaretRight, CaretUp, CircleNotch, Trash } from "@phosphor-icons/react";
import type { QuizImageStyle, TopicAvailability, TopicCandidate } from "@studio/shared";
import type { TopicHistoryFilter } from "../../types/history.types";
import { calculateTopicHistoryMetrics, filterHistoryTopics } from "../../utils/topicHistoryHelpers";
import { TopicHistoryFilterBar } from "./TopicHistoryFilterBar";
import { TopicHistoryRow } from "./TopicHistoryRow";

const TOPIC_HISTORY_EMPTY_LABELS: Record<TopicHistoryFilter, string> = {
  all: "topics",
  episode: "16:9 Episodes",
  quiz_short: "9:16 Quiz Shorts",
  short_reel: "9:16 Shorts",
};

const INITIAL_VISIBLE_COUNT = 6;

export interface TopicHistorySectionProps {
  historyTopics: TopicCandidate[];
  latestRunTopicsCount: number;
  channelStyles?: QuizImageStyle[];
  availabilityMap: Map<string, TopicAvailability>;
  confirmingTopicId: string | null;
  channelStatus?: string;
  onConfirmTopic: (topic: TopicCandidate, questionCount: number, visualStyle?: QuizImageStyle | "mixed") => Promise<void>;
  onDeleteTopic?: (topic: TopicCandidate) => Promise<void> | void;
  onClearHistory?: (unselectedOnly?: boolean) => Promise<void> | void;
  deletingTopicId?: string | null;
  clearingTopicHistory?: boolean;
}

export function TopicHistorySection({
  historyTopics,
  latestRunTopicsCount,
  channelStyles,
  availabilityMap,
  confirmingTopicId,
  channelStatus,
  onConfirmTopic,
  onDeleteTopic,
  onClearHistory,
  deletingTopicId,
  clearingTopicHistory,
}: TopicHistorySectionProps) {
  const [activeFilter, setActiveFilter] = useState<TopicHistoryFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  const metrics = useMemo(() => calculateTopicHistoryMetrics(historyTopics, availabilityMap), [historyTopics, availabilityMap]);
  const filteredTopics = useMemo(() => filterHistoryTopics(historyTopics, activeFilter), [historyTopics, activeFilter]);

  const visibleTopics = useMemo(() => {
    if (showAll || filteredTopics.length <= INITIAL_VISIBLE_COUNT) return filteredTopics;
    return filteredTopics.slice(0, INITIAL_VISIBLE_COUNT);
  }, [filteredTopics, showAll]);

  const handleFilterChange = (newFilter: TopicHistoryFilter) => {
    setActiveFilter(newFilter);
    setShowAll(false);
  };

  const handleClearHistory = () => {
    if (clearingTopicHistory || !onClearHistory) return;
    const confirmed = window.confirm(
      "Are you sure you want to clear older ideas history? This will clean up previous brainstorm suggestions without affecting your created episodes or 30-day question cooldowns.",
    );
    if (confirmed) {
      void onClearHistory();
    }
  };

  return (
    <div className="topic-history-section">
      <div className="section-heading topic-history-heading">
        <div className="topic-history-heading-left">
          <button
            type="button"
            className="topic-history-collapse-btn"
            onClick={() => setIsSectionExpanded((prev) => !prev)}
            aria-expanded={isSectionExpanded}
            aria-controls="topic-history-content-panel"
            aria-label={isSectionExpanded ? "Collapse older ideas history" : "Expand older ideas history"}
            title={isSectionExpanded ? "Collapse history section" : "Expand history section"}
          >
            {isSectionExpanded ? <CaretDown size={15} weight="bold" /> : <CaretRight size={15} weight="bold" />}
          </button>
          <div>
            <p className="eyebrow">Archive & Previous Ideas</p>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Older Ideas History ({historyTopics.length})</h3>
          </div>
        </div>

        {isSectionExpanded ? (
          <div className="topic-history-heading-right">
            <TopicHistoryFilterBar activeFilter={activeFilter} metrics={metrics} onFilterChange={handleFilterChange} />
            {onClearHistory && historyTopics.length > 0 && (
              <button
                type="button"
                className="topic-history-clear-btn"
                disabled={Boolean(confirmingTopicId) || Boolean(clearingTopicHistory) || channelStatus === "ARCHIVED"}
                onClick={handleClearHistory}
                title="Clear older ideas history (does not affect created episodes or question cooldowns)"
                aria-label="Clear older ideas history"
              >
                {clearingTopicHistory ? <CircleNotch className="spin" size={13} /> : <Trash size={13} weight="bold" />}
                <span>{clearingTopicHistory ? "Clearing…" : "Clear History"}</span>
              </button>
            )}
          </div>
        ) : (
          <span className="count-note">Section collapsed</span>
        )}
      </div>

      {isSectionExpanded && (
        <div id="topic-history-content-panel">
          {filteredTopics.length === 0 ? (
            <div className="topic-history-empty-filter">
              <p>No {TOPIC_HISTORY_EMPTY_LABELS[activeFilter]} in history archive.</p>
            </div>
          ) : (
            <div id="topic-history-list" className="topic-history-list">
              {visibleTopics.map((topic) => {
                const origIdx = historyTopics.findIndex((t) => t.topic_id === topic.topic_id);
                const displayIndex = latestRunTopicsCount + (origIdx >= 0 ? origIdx : 0) + 1;
                return (
                  <TopicHistoryRow
                    key={topic.topic_id}
                    index={displayIndex}
                    topic={topic}
                    channelStyles={channelStyles}
                    availability={availabilityMap.get(topic.topic_id)}
                    busy={confirmingTopicId === topic.topic_id}
                    deleting={deletingTopicId === topic.topic_id}
                    disabled={
                      Boolean(confirmingTopicId) ||
                      Boolean(deletingTopicId) ||
                      Boolean(clearingTopicHistory) ||
                      channelStatus === "ARCHIVED"
                    }
                    onConfirm={(qCount, style) => void onConfirmTopic(topic, qCount, style)}
                    onDelete={onDeleteTopic ? (t) => void onDeleteTopic(t) : undefined}
                  />
                );
              })}
            </div>
          )}

          {filteredTopics.length > INITIAL_VISIBLE_COUNT && (
            <div className="topic-history-footer">
              <button
                type="button"
                className="topic-history-toggle-disclosure-btn"
                onClick={() => setShowAll((prev) => !prev)}
                aria-expanded={showAll}
                aria-controls="topic-history-list"
              >
                {showAll ? (
                  <>
                    <CaretUp size={14} weight="bold" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <CaretDown size={14} weight="bold" />
                    <span>Show all ({filteredTopics.length}) older ideas</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
