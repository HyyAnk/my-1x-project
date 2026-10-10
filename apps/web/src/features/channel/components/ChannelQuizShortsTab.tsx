import { useMemo, useState } from "react";
import { DeviceMobile, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { Channel, QuizShort, Task } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { buildHash, getNavProps } from "../../../hooks/useRouter";
import { computeQuizShortStatus, matchesQuizShortSearch } from "../utils/quizShortCardViewModel";
import { QuizShortCard } from "./QuizShortCard";

export interface ChannelQuizShortsTabProps {
  channel: Channel;
  quizShorts: QuizShort[];
  tasks: Task[];
  onOpenQuizShort: (channelId: string, quizShortId: string) => void;
  onDeleteQuizShort: (quizShort: QuizShort) => void;
  onGoToTopics: () => void;
}

type QuizShortFilter = "all" | "in_progress" | "ready";

export function ChannelQuizShortsTab({
  channel,
  quizShorts,
  tasks,
  onOpenQuizShort,
  onDeleteQuizShort,
  onGoToTopics,
}: ChannelQuizShortsTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuizShortFilter>("all");
  const topicsUrl = buildHash({ page: "channels", channelId: channel.channel_id, tab: "topics" });

  const readyCount = useMemo(
    () => quizShorts.filter((quizShort) => computeQuizShortStatus(quizShort, tasks).status === "ready").length,
    [quizShorts, tasks],
  );
  const inProductionCount = quizShorts.length - readyCount;

  const filteredQuizShorts = useMemo(
    () =>
      quizShorts.filter((quizShort) => {
        const isReady = computeQuizShortStatus(quizShort, tasks).status === "ready";
        if (filter === "ready" && !isReady) return false;
        if (filter === "in_progress" && isReady) return false;
        return matchesQuizShortSearch(quizShort, search);
      }),
    [quizShorts, tasks, filter, search],
  );

  return (
    <div className="channel-short-reels-tab channel-quiz-shorts-tab" data-testid="channel-quiz-shorts-tab">
      <div className="section-heading episode-section-heading">
        <h2>Confirmed Quiz Shorts (9:16)</h2>
        <div className="episode-section-actions">
          <span className="count-note">
            {quizShorts.length} {quizShorts.length === 1 ? "quiz short" : "quiz shorts"}
          </span>
          <a className="primary-button compact" {...getNavProps(topicsUrl, onGoToTopics)}>
            <Plus size={15} />
            <span>New Quiz Short</span>
          </a>
        </div>
      </div>

      {quizShorts.length === 0 ? (
        <EmptyState
          compact
          icon={<DeviceMobile size={24} />}
          title="No quiz shorts confirmed yet"
          copy="Confirm a Quiz Short idea in the Idea Lab to start a 9:16 portrait quiz video."
          action="Explore Idea Lab"
          actionHref={topicsUrl}
          onAction={onGoToTopics}
        />
      ) : (
        <>
          <div className="episode-toolbar">
            <div className="episode-search-wrap">
              <MagnifyingGlass size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search quiz shorts by title, premise, or hook..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="episode-search-input"
                aria-label="Search quiz shorts"
              />
              {search ? (
                <button type="button" className="search-clear-btn" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={13} />
                </button>
              ) : null}
            </div>
            <div className="episode-filter-chips">
              <button type="button" className={`filter-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
                All ({quizShorts.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${filter === "in_progress" ? "is-active" : ""}`}
                onClick={() => setFilter("in_progress")}
              >
                In Production ({inProductionCount})
              </button>
              <button type="button" className={`filter-chip ${filter === "ready" ? "is-active" : ""}`} onClick={() => setFilter("ready")}>
                Ready ({readyCount})
              </button>
            </div>
          </div>

          {filteredQuizShorts.length === 0 ? (
            <div className="episode-empty-search" data-testid="quiz-shorts-empty-search">
              <MagnifyingGlass size={28} />
              <p>
                No quiz shorts matching <strong>"{search}"</strong> in this filter.
              </p>
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="short-reel-card-grid" data-testid="quiz-short-card-grid">
              {filteredQuizShorts.map((quizShort) => (
                <QuizShortCard
                  key={quizShort.quiz_short_id}
                  quizShort={quizShort}
                  tasks={tasks}
                  onOpen={onOpenQuizShort}
                  onDelete={onDeleteQuizShort}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
