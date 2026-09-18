import { FilmSlate, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import { EmptyState } from "../../../components/EmptyState";
import { EpisodeCard } from "./EpisodeCard";
import { buildHash, getNavProps } from "../../../hooks/useRouter";
import { PaginationControl } from "../../../components/PaginationControl";
import { ChannelEpisodesToolbar } from "./ChannelEpisodesToolbar";
import { useChannelEpisodesFilter, type UseChannelEpisodesFilterOptions } from "../hooks/useChannelEpisodesFilter";

export type ChannelEpisodesTabProps = UseChannelEpisodesFilterOptions & {
  channel: Channel;
  tasks: Task[];
  onOpenEpisode: (channelId: string, episodeId: string) => void;
  onDeleteEpisode: (episode: Episode) => void;
  onGoToTopics: () => void;
};

export function ChannelEpisodesTab(props: ChannelEpisodesTabProps) {
  const { channel, tasks, onOpenEpisode, onDeleteEpisode, onGoToTopics } = props;
  const filter = useChannelEpisodesFilter(props);
  const topicsUrl = buildHash({ page: "channels", channelId: channel.channel_id, tab: "topics" });

  return (
    <div className="channel-episodes-tab" data-testid="channel-episodes-tab">
      <div className="section-heading episode-section-heading">
        <h2>Confirmed Episodes</h2>
        <div className="episode-section-actions">
          <span className="count-note">
            {filter.currentTotalItems} {filter.currentTotalItems === 1 ? "episode" : "episodes"}
          </span>
          <a className="primary-button compact" {...getNavProps(topicsUrl, onGoToTopics)}>
            <Plus size={15} />
            <span>New Episode</span>
          </a>
        </div>
      </div>

      {filter.hasNoEpisodesEver ? (
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
          <ChannelEpisodesToolbar
            search={filter.currentSearch}
            filter={filter.currentFilter}
            sort={filter.currentSort}
            onSearchChange={filter.handleSearchChange}
            onFilterChange={filter.handleFilterChange}
            onSortChange={filter.handleSortChange}
          />

          {filter.displayedEpisodes.length === 0 ? (
            <div className="episode-empty-search" data-testid="episode-empty-search">
              <MagnifyingGlass size={28} aria-hidden="true" />
              <p>
                No episodes matching <strong>"{filter.currentSearch}"</strong> in this filter.
              </p>
              <button
                type="button"
                className="quiet-button compact"
                onClick={() => {
                  filter.handleSearchChange("");
                  filter.handleFilterChange("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="episode-card-grid" data-testid="episode-card-grid">
                {filter.displayedEpisodes.map((episode) => (
                  <EpisodeCard
                    key={episode.episode_id}
                    episode={episode}
                    tasks={tasks}
                    onOpen={() => onOpenEpisode(channel.channel_id, episode.episode_id)}
                    onDelete={onDeleteEpisode}
                  />
                ))}
              </div>

              <PaginationControl
                page={filter.currentPage}
                totalPages={filter.currentTotalPages}
                totalItems={filter.currentTotalItems}
                limit={filter.currentLimit}
                onPageChange={filter.handlePageChange}
                onLimitChange={filter.handleLimitChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
