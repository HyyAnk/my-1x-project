import { CircleNotch, Play, Stop } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import { EpisodeBreadcrumb } from "../../components/Breadcrumbs";
import { EpisodeAssetPills, StageBadge } from "../../components/AppChrome";

type EpisodeHeaderProps = {
  channel: Channel;
  episode: Episode;
  episodeTasks: Task[];
  totalImageCostVnd: number;
  activeEpisodeTask: Task | null;
  busy: string | null;
  cancelling: boolean;
  readiness: { video: boolean };
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
  onBack: () => void;
  onCreateTask: (type: Task["task_type"]) => void;
  onCancelActiveTask: (task?: Task | null) => void;
};

export function EpisodeHeader({
  channel,
  episode,
  episodeTasks,
  totalImageCostVnd,
  activeEpisodeTask,
  busy,
  cancelling,
  readiness,
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
  onBack,
  onCreateTask,
  onCancelActiveTask,
}: EpisodeHeaderProps) {
  return (
    <>
      <EpisodeBreadcrumb
        channelName={channel.display_name}
        channelId={channel.channel_id}
        episodeTitle={episode.topic.title}
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
        onNavigateChannel={onNavigateChannel || onBack}
      />

      <header className="detail-header episode-detail-header">
        <div>
          <h1>{episode.topic.title}</h1>
          <p className="detail-copy">{episode.topic.premise}</p>
        </div>
        <div className="detail-actions">
          <div className="episode-detail-badges">
            <StageBadge stage={episode.stage} />
            <EpisodeAssetPills episode={episode} tasks={episodeTasks} />
          </div>
          {totalImageCostVnd > 0 ? (
            <span className="bundle-image-cost-tag" title="Total image generation cost for this episode">
              💰 {totalImageCostVnd.toLocaleString("en-US")} VND
            </span>
          ) : null}
          <button
            className="primary-button"
            disabled={Boolean(activeEpisodeTask) || busy === "GENERATE_PIPELINE"}
            onClick={() => void onCreateTask("GENERATE_PIPELINE")}
          >
            {activeEpisodeTask || busy === "GENERATE_PIPELINE" ? <CircleNotch className="spin" size={16} /> : <Play size={16} />}
            <span>
              {activeEpisodeTask || busy === "GENERATE_PIPELINE"
                ? "Starting production…"
                : readiness.video
                  ? "Rebuild Quiz Video"
                  : "Start production"}
            </span>
          </button>
          {activeEpisodeTask ? (
            <button
              type="button"
              className="danger-button"
              disabled={cancelling}
              onClick={() => void onCancelActiveTask(activeEpisodeTask)}
              title="Stop current task immediately"
              aria-label="Stop current task"
            >
              {cancelling ? <CircleNotch className="spin" size={16} /> : <Stop size={16} weight="fill" />}
              <span>Stop</span>
            </button>
          ) : null}
        </div>
      </header>
    </>
  );
}
