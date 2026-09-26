import React from "react";
import { Sparkle, Television, DeviceMobile } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { ThumbnailCarouselStage } from "./ThumbnailCarouselStage";
import { ThumbnailControlsDeck } from "./ThumbnailControlsDeck";
import { useThumbnailPreview } from "../hooks/useThumbnailPreview";
import { isTaskActive } from "../../../lib/utils";
import { thumbnailTaskMessage } from "../utils/thumbnailTaskState";

export type ThumbnailPreviewCardProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  activeEpisodeTask?: Task | null;
  thumbnailTask?: Task | null;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onUpdated?: () => Promise<void> | void;
};

export function ThumbnailPreviewCard(props: ThumbnailPreviewCardProps) {
  const { channel, episode, episodeId } = props;
  const backgroundPending = Boolean(props.thumbnailTask && isTaskActive(props.thumbnailTask));
  const thumb = useThumbnailPreview({ ...props, activeEpisodeTask: backgroundPending ? props.thumbnailTask : props.activeEpisodeTask });
  const generating = thumb.generating || backgroundPending;
  const newerManifest = Boolean(
    thumb.manifest?.updated_at &&
    props.thumbnailTask?.completed_at &&
    Date.parse(thumb.manifest.updated_at) > Date.parse(props.thumbnailTask.completed_at),
  );
  const statusMessage = newerManifest ? null : thumbnailTaskMessage(props.thumbnailTask);

  return (
    <section className="quiz-thumbnail-panel">
      {/* Studio Header Bar */}
      <div className="thumbnail-studio-header">
        <div className="thumbnail-studio-title">
          <Sparkle size={20} color="var(--accent)" />
          <span>YouTube Thumbnail Studio</span>
          <span className="thumbnail-studio-title-badge">Dual-Ratio AI</span>
        </div>

        {/* 16:9 vs 9:16 Segmented Control */}
        <div className="ratio-segmented-control" role="tablist" aria-label="Thumbnail Aspect Ratio">
          <button
            type="button"
            className={`ratio-segmented-btn ${thumb.activeRatio === "16:9" ? "active" : ""}`}
            onClick={() => thumb.setActiveRatio("16:9")}
            role="tab"
            aria-selected={thumb.activeRatio === "16:9"}
          >
            <Television size={15} />
            <span>16:9 Video</span>
          </button>
          <button
            type="button"
            className={`ratio-segmented-btn ${thumb.activeRatio === "9:16" ? "active" : ""}`}
            onClick={() => thumb.setActiveRatio("9:16")}
            role="tab"
            aria-selected={thumb.activeRatio === "9:16"}
          >
            <DeviceMobile size={15} />
            <span>9:16 Shorts Cover</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <p role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}
      {/* Main Studio Workspace Grid */}
      <div className="thumbnail-studio-grid">
        {/* Left / Center: Visual Carousel Stage */}
        <ThumbnailCarouselStage
          channelId={channel.channel_id}
          episodeId={episodeId}
          episodeSlug={episode.slug}
          activeRatio={thumb.activeRatio}
          generating={generating}
          hasImage={thumb.hasImage}
          hasAnyThumbnail={thumb.hasAnyThumbnail}
          imageUrl={thumb.imageUrl}
          historyList={thumb.historyList}
          carouselIndex={thumb.carouselIndex}
          imageTimestamp={thumb.imageTimestamp}
          onPrev={thumb.handlePrevVariant}
          onNext={thumb.handleNextVariant}
          onSelectIndex={thumb.setCarouselIndex}
          onSetActive={thumb.handleSetActive}
          onDeleteVariant={thumb.handleDeleteVariant}
        />

        {/* Right: Studio Control Deck */}
        <ThumbnailControlsDeck
          selectedLayout={thumb.selectedLayout}
          setSelectedLayout={thumb.setSelectedLayout}
          selectedBadge={thumb.selectedBadge}
          setSelectedBadge={thumb.setSelectedBadge}
          customHook={thumb.customHook}
          setCustomHook={thumb.setCustomHook}
          manifest={thumb.manifest}
          hasAnyThumbnail={thumb.hasAnyThumbnail}
          generating={generating}
          loading={thumb.loading}
          onGenerateThumbnail={thumb.handleGenerateThumbnail}
          onResetDefaults={thumb.handleResetDefaults}
        />
      </div>
    </section>
  );
}
