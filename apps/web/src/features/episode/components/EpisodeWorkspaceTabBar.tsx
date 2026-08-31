import { ArrowsClockwise, CheckCircle, FileText, FilmSlate, Image } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import type { BundleImage } from "../../../api";
import { buildHash, getNavProps } from "../../../hooks/useRouter";
import type { useEpisodePipeline } from "../hooks/useEpisodePipeline";

export type EpisodeWorkspaceTabBarProps = {
  channel: Channel;
  episodeId: string;
  simplifyMode: boolean;
  pipeline: ReturnType<typeof useEpisodePipeline>;
  bundleImages: BundleImage[];
  sceneCount: number;
};

export function EpisodeWorkspaceTabBar({
  channel,
  episodeId,
  simplifyMode,
  pipeline,
  bundleImages,
  sceneCount,
}: EpisodeWorkspaceTabBarProps) {
  return (
    <div className="channel-group-tabs" role="tablist" aria-label="Episode creation workspace" style={{ margin: "24px 0 26px" }}>
      {!simplifyMode ? (
        <a
          role="tab"
          aria-selected={pipeline.workflowTab === "script"}
          className={`channel-group-tab ${pipeline.workflowTab === "script" ? "is-selected" : ""}`}
          {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "script" }), () =>
            pipeline.switchWorkflowTab("script"),
          )}
        >
          <FileText size={17} weight={pipeline.workflowTab === "script" ? "fill" : "regular"} />
          <span>1. Script & Plan</span>
          {pipeline.readiness.script ? <CheckCircle size={14} weight="fill" style={{ color: "var(--green)" }} /> : null}
        </a>
      ) : null}
      <a
        role="tab"
        aria-selected={pipeline.workflowTab === "remix"}
        className={`channel-group-tab ${pipeline.workflowTab === "remix" ? "is-selected" : ""}`}
        {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "remix" }), () =>
          pipeline.switchWorkflowTab("remix"),
        )}
      >
        <ArrowsClockwise size={17} weight={pipeline.workflowTab === "remix" ? "bold" : "regular"} />
        <span>Question Remix</span>
        {pipeline.historyCheck?.duplicate_count ? (
          <span className={`tab-badge ${pipeline.historyCheck.passed ? "badge-success" : "badge-warning"}`}>
            {pipeline.historyCheck.duplicate_count}
          </span>
        ) : null}
      </a>
      {!simplifyMode ? (
        <>
          <a
            role="tab"
            aria-selected={pipeline.workflowTab === "visual"}
            className={`channel-group-tab ${pipeline.workflowTab === "visual" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "visual" }), () =>
              pipeline.switchWorkflowTab("visual"),
            )}
          >
            <Image size={17} weight={pipeline.workflowTab === "visual" ? "fill" : "regular"} />
            <span>2. Visual & Continuity</span>
            {bundleImages.length > 0 ? <small>{bundleImages.length}</small> : null}
          </a>
          <a
            role="tab"
            aria-selected={pipeline.workflowTab === "timeline"}
            className={`channel-group-tab ${pipeline.workflowTab === "timeline" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "timeline" }), () =>
              pipeline.switchWorkflowTab("timeline"),
            )}
          >
            <FilmSlate size={17} weight={pipeline.workflowTab === "timeline" ? "fill" : "regular"} />
            <span>3. Timeline & Shots</span>
            {sceneCount > 0 ? <small>{sceneCount}</small> : null}
          </a>
        </>
      ) : null}
    </div>
  );
}
