import { Play, Trash, VideoCamera } from "@phosphor-icons/react";
import {
  QUIZ_IMAGE_STYLE_LABELS,
  QUIZ_SECONDS_PER_QUESTION,
  type Episode,
  type Task,
} from "@studio/shared";
import { formatDate, isTaskActive } from "../../../lib/utils";
import { EpisodeAssetPills, StageBadge } from "../../../components/AppChrome";
import { buildHash, getNavProps } from "../../../hooks/useRouter";

export function EpisodeCard({
  episode,
  index,
  tasks,
  onOpen,
  onDelete,
}: {
  episode: Episode;
  index: number;
  tasks: Task[];
  onOpen: () => void;
  onDelete: (episode: Episode) => void;
}) {
  const isVideoReady = Boolean(episode.video_asset_path);
  const questionCount = episode.quiz_config?.question_count ?? 8;
  const estimatedDurationMinutes = Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));
  const visualStyle = episode.quiz_config?.visual_style ?? "mixed";
  const visualStyleLabel = visualStyle === "mixed" ? "Mixed" : (QUIZ_IMAGE_STYLE_LABELS[visualStyle] ?? visualStyle);
  const format = episode.quiz_config?.quiz_format;
  const formatLabel =
    format === "odd_one_out"
      ? "Odd One Out"
      : format === "image_guess"
      ? "Image Guess"
      : format === "true_false"
      ? "True/False"
      : "Knowledge";

  const episodeTasks = tasks.filter((t) => t.episode_id === episode.episode_id);
  const hasActiveTask = episodeTasks.some(isTaskActive);
  const episodeUrl = buildHash({ page: "channels", channelId: episode.channel_id, episodeId: episode.episode_id });

  return (
    <article className={`episode-card ${isVideoReady ? "is-video-ready" : ""} ${hasActiveTask ? "is-active-task" : ""}`}>
      <div className="episode-card-top">
        <div className="episode-card-badges">
          <span className="episode-card-index">#{String(index).padStart(2, "0")}</span>
          <span className="episode-badge format-badge" title={`Format: ${formatLabel}`}>
            {format === "odd_one_out" ? "🎨 " : format === "image_guess" ? "🖼️ " : format === "true_false" ? "⚖️ " : "🎯 "}
            {formatLabel}
          </span>
          <span className="episode-badge style-badge" title={`Visual Style: ${visualStyleLabel}`}>
            {visualStyle === "mixed" ? "🎲 " : "✨ "}
            {visualStyleLabel}
          </span>
        </div>
        <button
          type="button"
          className="icon-button danger episode-card-delete"
          title={`Delete ${episode.topic.title}`}
          aria-label={`Delete episode ${episode.topic.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(episode);
          }}
        >
          <Trash size={15} />
        </button>
      </div>

      <div
        className="episode-card-main"
        role="button"
        tabIndex={0}
        {...getNavProps(episodeUrl, onOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Open studio for ${episode.topic.title}`}
      >
        <h3 className="episode-card-title">{episode.topic.title}</h3>
        <p className="episode-card-premise">{episode.topic.premise}</p>

        {isVideoReady ? (
          <div className="episode-video-ready-banner">
            <div className="video-ready-left">
              <VideoCamera size={16} weight="fill" className="video-ready-icon" />
              <strong>Video Master Ready</strong>
            </div>
            {episode.video_duration_seconds ? (
              <span className="video-ready-time">
                {Math.floor(episode.video_duration_seconds / 60)}:
                {String(Math.round(episode.video_duration_seconds % 60)).padStart(2, "0")}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="episode-card-status-row">
          <StageBadge stage={episode.stage} size="sm" />
          <EpisodeAssetPills episode={episode} tasks={episodeTasks} compact />
        </div>

        <div className="episode-card-footer">
          <div className="episode-card-meta">
            <span className="meta-item" title="Question count & estimated target duration">
              🎯 {questionCount} Qs · ~{estimatedDurationMinutes}m
            </span>
            {episode.created_at ? (
              <span className="meta-date" title={`Created: ${formatDate(episode.created_at)}`}>
                {formatDate(episode.created_at)}
              </span>
            ) : null}
          </div>
          <div className="episode-card-action">
            <span className="action-label">Open Studio</span>
            <div className="action-icon-circle">
              <Play size={11} weight="fill" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
