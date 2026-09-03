import { useState } from "react";
import { FilmSlate, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { EpisodeCard } from "./EpisodeCard";
import { buildHash, getNavProps } from "../../../hooks/useRouter";

type ChannelEpisodesTabProps = {
  channel: Channel;
  episodes: Episode[];
  tasks: Task[];
  onOpenEpisode: (channelId: string, episodeId: string) => void;
  onDeleteEpisode: (episode: Episode) => void;
  onGoToTopics: () => void;
};

export function ChannelEpisodesTab({ channel, episodes, tasks, onOpenEpisode, onDeleteEpisode, onGoToTopics }: ChannelEpisodesTabProps) {
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [episodeFilter, setEpisodeFilter] = useState<"all" | "in_progress" | "video_ready">("all");
  const topicsUrl = buildHash({ page: "channels", channelId: channel.channel_id, tab: "topics" });

  const videoReadyCount = episodes.filter((e) => Boolean(e.video_asset_path)).length;
  const inProgressCount = episodes.length - videoReadyCount;

  const filteredEpisodes = episodes.filter((ep) => {
    if (episodeFilter === "video_ready" && !ep.video_asset_path) return false;
    if (episodeFilter === "in_progress" && ep.video_asset_path) return false;
    if (episodeSearch.trim()) {
      const q = episodeSearch.toLowerCase();
      const matchTitle = ep.topic.title.toLowerCase().includes(q);
      const matchPremise = ep.topic.premise.toLowerCase().includes(q);
      const matchHook = ep.topic.hook?.toLowerCase().includes(q);
      if (!matchTitle && !matchPremise && !matchHook) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="section-heading episode-section-heading">
        <h2>Confirmed Episodes</h2>
        <div className="episode-section-actions">
          <span className="count-note">
            {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
          </span>
          <a className="primary-button compact" {...getNavProps(topicsUrl, onGoToTopics)}>
            <Plus size={15} />
            <span>New Episode</span>
          </a>
        </div>
      </div>

      {episodes.length === 0 ? (
        <EmptyState
          compact
          icon={<FilmSlate size={24} />}
          title="No episodes confirmed yet"
          copy="Explore and confirm ideas in the Idea Lab to start generating video episodes."
          action="Explore Idea Lab"
          actionHref={topicsUrl}
          onAction={onGoToTopics}
        />
      ) : (
        <>
          {/* Search and Filter Toolbar */}
          <div className="episode-toolbar">
            <div className="episode-search-wrap">
              <MagnifyingGlass size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search episodes by title or topic..."
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                className="episode-search-input"
              />
              {episodeSearch ? (
                <button type="button" className="search-clear-btn" onClick={() => setEpisodeSearch("")} aria-label="Clear search">
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <div className="episode-filter-chips">
              <button
                type="button"
                className={`filter-chip ${episodeFilter === "all" ? "is-active" : ""}`}
                onClick={() => setEpisodeFilter("all")}
              >
                All ({episodes.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${episodeFilter === "in_progress" ? "is-active" : ""}`}
                onClick={() => setEpisodeFilter("in_progress")}
              >
                In Production ({inProgressCount})
              </button>
              <button
                type="button"
                className={`filter-chip ${episodeFilter === "video_ready" ? "is-active" : ""}`}
                onClick={() => setEpisodeFilter("video_ready")}
              >
                Video Ready ({videoReadyCount})
              </button>
            </div>
          </div>

          {filteredEpisodes.length === 0 ? (
            <div className="episode-empty-search">
              <MagnifyingGlass size={28} />
              <p>
                No episodes matching <strong>"{episodeSearch}"</strong> in this filter.
              </p>
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => {
                  setEpisodeSearch("");
                  setEpisodeFilter("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="episode-card-grid">
              {filteredEpisodes.map((episode) => (
                <EpisodeCard
                  key={episode.episode_id}
                  episode={episode}
                  tasks={tasks}
                  onOpen={() => onOpenEpisode(channel.channel_id, episode.episode_id)}
                  onDelete={onDeleteEpisode}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
