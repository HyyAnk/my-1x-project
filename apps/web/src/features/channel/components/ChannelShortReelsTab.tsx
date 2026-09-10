import { useMemo, useState } from "react";
import { FilmStrip, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { Channel, ShortReelRecord, Task } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { buildHash, getNavProps } from "../../../hooks/useRouter";
import { computeShortReelStatus, matchesShortReelSearch } from "../utils/shortReelCardViewModel";
import { ShortReelCard } from "./ShortReelCard";

export interface ChannelShortReelsTabProps {
  channel: Channel;
  shortReels: ShortReelRecord[];
  tasks: Task[];
  onOpenStudio: (channelId: string, reelId: string) => void;
  onDeleteShortReel: (reel: ShortReelRecord) => void;
  onGoToTopics: () => void;
  onNewShortReel?: () => void;
}

type ShortReelFilter = "all" | "in_progress" | "ready";

export function ChannelShortReelsTab({
  channel,
  shortReels,
  tasks,
  onOpenStudio,
  onDeleteShortReel,
  onGoToTopics,
  onNewShortReel,
}: ChannelShortReelsTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ShortReelFilter>("all");

  const topicsUrl = buildHash({
    page: "channels",
    channelId: channel.channel_id,
    tab: "topics",
  });

  const readyStatusSet = useMemo(() => new Set(["ready", "exported"]), []);

  const { readyCount, inProductionCount } = useMemo(() => {
    let ready = 0;
    for (const reel of shortReels) {
      const { status } = computeShortReelStatus(reel, tasks);
      if (readyStatusSet.has(status)) ready++;
    }
    return { readyCount: ready, inProductionCount: shortReels.length - ready };
  }, [shortReels, tasks, readyStatusSet]);

  const filteredReels = useMemo(() => {
    return shortReels.filter((reel) => {
      const { status } = computeShortReelStatus(reel, tasks);
      const isReady = readyStatusSet.has(status);

      if (filter === "ready" && !isReady) return false;
      if (filter === "in_progress" && isReady) return false;

      return matchesShortReelSearch(reel, search);
    });
  }, [shortReels, tasks, filter, search, readyStatusSet]);

  return (
    <div className="channel-short-reels-tab" data-testid="channel-short-reels-tab">
      {/* Section Header */}
      <div className="section-heading episode-section-heading">
        <h2>Confirmed Short-Reels (9:16)</h2>
        <div className="episode-section-actions">
          <span className="count-note">
            {shortReels.length} {shortReels.length === 1 ? "short-reel" : "short-reels"}
          </span>
          {onNewShortReel ? (
            <button type="button" className="primary-button compact" onClick={onNewShortReel} data-testid="new-short-reel-btn">
              <Plus size={15} />
              <span>New Short-Reel</span>
            </button>
          ) : (
            <a className="primary-button compact" {...getNavProps(topicsUrl, onGoToTopics)}>
              <Plus size={15} />
              <span>New Short-Reel</span>
            </a>
          )}
        </div>
      </div>

      {shortReels.length === 0 ? (
        <EmptyState
          compact
          icon={<FilmStrip size={24} />}
          title="No short-reels confirmed yet"
          copy={
            onNewShortReel
              ? "Create Short-Reels directly from the Question Bank or explore ideas in the Idea Lab."
              : "Explore and confirm Short-Reel ideas in the Idea Lab to start creating 9:16 short reels."
          }
          action={onNewShortReel ? "New Short-Reel" : "Explore Idea Lab"}
          actionHref={onNewShortReel ? undefined : topicsUrl}
          onAction={onNewShortReel ?? onGoToTopics}
        />
      ) : (
        <>
          {/* Search & Filter Toolbar */}
          <div className="episode-toolbar">
            <div className="episode-search-wrap">
              <MagnifyingGlass size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search short-reels by title, premise, or question..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="episode-search-input"
                aria-label="Search short-reels"
              />
              {search ? (
                <button type="button" className="search-clear-btn" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <div className="episode-filter-chips">
              <button type="button" className={`filter-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>
                All ({shortReels.length})
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

          {/* Cards Grid or Empty Search */}
          {filteredReels.length === 0 ? (
            <div className="episode-empty-search" data-testid="short-reels-empty-search">
              <MagnifyingGlass size={28} />
              <p>
                No short-reels matching <strong>"{search}"</strong> in this filter.
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
            <div className="short-reel-card-grid" data-testid="short-reel-card-grid">
              {filteredReels.map((reel) => (
                <ShortReelCard key={reel.reel_id} reel={reel} tasks={tasks} onOpenStudio={onOpenStudio} onDelete={onDeleteShortReel} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
