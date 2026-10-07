import { CircleNotch, Lightning, Play, Stop } from "@phosphor-icons/react";
import { formatCanonicalDomainName, inferCanonicalDomainFromText, type Channel, type Episode, type Task } from "@studio/shared";
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
  fastRenderMode?: boolean;
  onToggleFastRender?: () => void;
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
  fastRenderMode = true,
  onToggleFastRender,
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
  onBack,
  onCreateTask,
  onCancelActiveTask,
}: EpisodeHeaderProps) {
  const domainId =
    episode.topic?.domain_id ||
    inferCanonicalDomainFromText(episode.topic?.title) ||
    inferCanonicalDomainFromText(episode.topic?.premise);
  const domainTitle = formatCanonicalDomainName(domainId);

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
            {domainTitle ? (
              <span className="episode-header-domain-badge" title={`Domain: ${domainTitle}`}>
                🏛️ {domainTitle}
              </span>
            ) : null}
            <StageBadge stage={episode.stage} />
            <EpisodeAssetPills episode={episode} tasks={episodeTasks} />
          </div>
          {totalImageCostVnd > 0 ? (
            <span className="bundle-image-cost-tag" title="Total image generation cost for this episode">
              💰 {totalImageCostVnd.toLocaleString("en-US")} VND
            </span>
          ) : null}
          {onToggleFastRender && (
            <button
              type="button"
              className={`fast-render-toggle-btn ${fastRenderMode ? "is-active" : ""}`}
              onClick={onToggleFastRender}
              disabled={Boolean(activeEpisodeTask) || busy === "fast-render-mode"}
              title={
                fastRenderMode
                  ? "Fast Render enabled: Bypasses layout & media preflight checks for maximum speed"
                  : "Standard mode: Runs layout & media preflight checks before rendering"
              }
              aria-pressed={fastRenderMode}
              aria-label="Toggle Fast Render Mode"
            >
              <Lightning size={14} weight={fastRenderMode ? "fill" : "regular"} />
              <span>Fast Render: {fastRenderMode ? "ON" : "OFF"}</span>
            </button>
          )}
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
