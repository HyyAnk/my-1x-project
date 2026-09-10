import { useState } from "react";
import { ArrowSquareOut, Clock, DownloadSimple, FilmStrip, Sparkle, Trash } from "@phosphor-icons/react";
import type { ShortReelRecord, Task } from "@studio/shared";
import { getNavProps } from "../../../hooks/useRouter";
import { buildShortReelCardViewModel } from "../utils/shortReelCardViewModel";

export interface ShortReelCardProps {
  reel: ShortReelRecord;
  tasks: Task[];
  onOpenStudio: (channelId: string, reelId: string) => void;
  onDelete: (reel: ShortReelRecord) => void;
}

export function ShortReelCard({ reel, tasks, onOpenStudio, onDelete }: ShortReelCardProps) {
  const [imageError, setImageError] = useState(false);
  const vm = buildShortReelCardViewModel(reel, tasks);
  const showCover = Boolean(vm.coverUrl && !imageError);

  const handleOpenStudio = () => {
    onOpenStudio(reel.channel_id, reel.reel_id);
  };

  return (
    <article
      className={`short-reel-card is-${vm.status} ${vm.hasActiveTask ? "is-task-active" : ""}`}
      data-testid={`short-reel-card-${reel.reel_id}`}
      aria-label={`Short-Reel: ${vm.cleanTitle}`}
    >
      {/* 9:16 Media Container */}
      <div className="short-reel-media-wrap">
        {showCover ? (
          <img
            src={vm.coverUrl!}
            alt={`Cover for ${vm.cleanTitle}`}
            className="short-reel-cover-img"
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="short-reel-fallback-visual" data-testid="short-reel-fallback-visual">
            <div className="fallback-inner">
              <FilmStrip size={36} weight="duotone" className="fallback-icon" />
              <span className="fallback-aspect">9:16 Short-Reel</span>
              <p className="fallback-hook">{reel.topic.hook || vm.cleanTitle}</p>
            </div>
          </div>
        )}

        {/* Top Badges: Status Pill & Duration */}
        <div className="short-reel-top-badges">
          <span className={`short-reel-status-pill status-${vm.status}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{vm.statusLabel}</span>
          </span>

          <span className="short-reel-duration-badge" title="Target Duration">
            <Clock size={12} aria-hidden="true" />
            <span>{vm.durationLabel}</span>
          </span>
        </div>

        {/* Archetype Badge */}
        <div className="short-reel-archetype-wrap">
          <span className={`short-reel-archetype-badge archetype-${reel.source.archetype_id}`}>
            <Sparkle size={11} weight="fill" aria-hidden="true" />
            <span>{vm.archetypeLabel}</span>
          </span>
        </div>
      </div>

      {/* Content & Metadata */}
      <div className="short-reel-content">
        <h3 className="short-reel-title" title={vm.cleanTitle}>
          {vm.cleanTitle}
        </h3>
        <p className="short-reel-premise" title={vm.premise}>
          {vm.premise}
        </p>

        {vm.hasActiveTask && vm.activeProgressMessage ? (
          <div className="short-reel-live-task-bar" data-testid="short-reel-live-task">
            <div className="live-task-pulse" />
            <span className="live-task-message" title={vm.activeProgressMessage}>
              {vm.activeProgressMessage}
            </span>
          </div>
        ) : null}
      </div>

      {/* Card Action Row */}
      <div className="short-reel-actions">
        <a
          className="short-reel-studio-btn"
          aria-label={`Open Studio for ${vm.cleanTitle}`}
          {...getNavProps(vm.studioUrl, handleOpenStudio)}
        >
          <ArrowSquareOut size={15} />
          <span>Open Studio</span>
        </a>

        {vm.canQuickDownload && vm.exportUrl ? (
          <a
            href={vm.exportUrl}
            download={`short-reel-${reel.reel_id}.zip`}
            className="short-reel-quick-export-btn"
            title={`Download package ZIP for ${vm.cleanTitle}`}
            aria-label={`Download package for ${vm.cleanTitle}`}
            onClick={(e) => e.stopPropagation()}
            data-testid={`quick-export-${reel.reel_id}`}
          >
            <DownloadSimple size={15} />
            <span>ZIP</span>
          </a>
        ) : null}

        <button
          type="button"
          className="short-reel-delete-btn"
          title={`Delete ${vm.cleanTitle}`}
          aria-label={`Delete Short-Reel ${vm.cleanTitle}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(reel);
          }}
        >
          <Trash size={15} />
        </button>
      </div>
    </article>
  );
}
