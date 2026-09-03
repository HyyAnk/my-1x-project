import { Trash } from "@phosphor-icons/react";
import type { Episode, Task } from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";
import { buildHash, getNavProps } from "../../../hooks/useRouter";
import { isTaskActive } from "../../../lib/utils";
import { buildEpisodeCardViewModel } from "../utils/episodeCardViewModel";

type EpisodeCardProps = {
  episode: Episode;
  tasks: Task[];
  onOpen: () => void;
  onDelete: (episode: Episode) => void;
};

export function EpisodeCard({ episode, tasks, onOpen, onDelete }: EpisodeCardProps) {
  const episodeTasks = tasks.filter((t) => t.episode_id === episode.episode_id);
  const viewModel = buildEpisodeCardViewModel(episode, episodeTasks);
  const hasActiveTask = episodeTasks.some(isTaskActive);
  const episodeUrl = buildHash({ page: "channels", channelId: episode.channel_id, episodeId: episode.episode_id });
  const thumbnailUrl = viewModel.thumbnailRatio
    ? episodeApi.thumbnailFileUrl(episode.channel_id, episode.episode_id, viewModel.thumbnailRatio, episode.updated_at)
    : null;

  return (
    <article className={`episode-card ${thumbnailUrl ? "is-video-ready" : ""} ${hasActiveTask ? "is-active-task" : ""}`}>
      <a className="episode-card-link" aria-label={`Open ${episode.topic.title}`} {...getNavProps(episodeUrl, onOpen)}>
        <div className="episode-card-thumbnail" data-testid={thumbnailUrl ? undefined : "episode-thumbnail-placeholder"}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Thumbnail for ${episode.topic.title}`}
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>
        <div className="episode-card-content">
          <h3 className="episode-card-title">{episode.topic.title}</h3>
          <span className="episode-card-layout">{viewModel.layoutLabel}</span>
          <span className="episode-card-status">
            <span className="episode-card-status-dot" aria-hidden="true" />
            <span>{viewModel.statusLabel}</span>
          </span>
          <div className="episode-card-meta">
            <span>{viewModel.durationLabel}</span>
            <time dateTime={episode.created_at}>{viewModel.createdDateLabel}</time>
          </div>
        </div>
      </a>

      <button
        type="button"
        className="episode-card-delete"
        title={`Delete ${episode.topic.title}`}
        aria-label={`Delete episode ${episode.topic.title}`}
        onClick={() => onDelete(episode)}
      >
        <Trash size={14} />
      </button>
    </article>
  );
}
