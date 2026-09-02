import React from "react";
import {
  CaretLeft,
  CaretRight,
  DownloadSimple,
  Eye,
  Image as ImageIcon,
  Star,
  Trash,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import type { ThumbnailAspectRatio, ThumbnailHistoryItem } from "@studio/shared";
import { ThumbnailFilmstrip } from "./ThumbnailFilmstrip";

type ThumbnailCarouselStageProps = {
  channelId: string;
  episodeId: string;
  episodeSlug: string;
  activeRatio: ThumbnailAspectRatio;
  generating: boolean;
  hasImage: boolean;
  hasAnyThumbnail: boolean;
  imageUrl: string;
  historyList: ThumbnailHistoryItem[];
  carouselIndex: number;
  imageTimestamp: string | null;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (index: number) => void;
  onSetActive: (versionId: string) => void;
  onDeleteVariant: (variantId: string) => void;
};

export function ThumbnailCarouselStage({
  channelId,
  episodeId,
  episodeSlug,
  activeRatio,
  generating,
  hasImage,
  hasAnyThumbnail,
  imageUrl,
  historyList,
  carouselIndex,
  imageTimestamp,
  onPrev,
  onNext,
  onSelectIndex,
  onSetActive,
  onDeleteVariant,
}: ThumbnailCarouselStageProps) {
  const currentVariant = historyList[carouselIndex] || null;
  const isViewingActive = currentVariant ? currentVariant.is_active : true;
  const totalVariants = historyList.length;
  const currentVersionNumber = totalVariants > 0 ? totalVariants - carouselIndex : 1;

  return (
    <div className="thumbnail-stage-card">
      {generating ? (
        <div className="thumbnail-generating-overlay">
          <ArrowsClockwise size={34} className="thumbnail-spinner" />
          <span style={{ fontWeight: 600, fontSize: "0.92rem", marginTop: "12px" }}>
            Synthesizing {activeRatio} high-CTR thumbnail...
          </span>
        </div>
      ) : hasImage ? (
        <div className="thumbnail-stage-content">
          <div className={`thumbnail-frame-container ${activeRatio === "9:16" ? "portrait-mode" : ""}`}>
            <img
              src={imageUrl}
              alt={`YouTube Thumbnail ${activeRatio} Version ${currentVersionNumber}`}
              className="thumbnail-image"
              style={{ aspectRatio: activeRatio === "16:9" ? "16/9" : "9/16" }}
            />

            {/* Version & Ratio Pill */}
            <div className="thumbnail-pill-group">
              <span className={`thumbnail-version-pill ${isViewingActive ? "active-pill" : "archived-pill"}`}>
                {isViewingActive ? (
                  <>
                    <Star size={12} weight="fill" /> v{currentVersionNumber} Active
                  </>
                ) : (
                  <>v{currentVersionNumber} Archived</>
                )}
              </span>
              <span className="thumbnail-spec-pill">
                {activeRatio === "16:9" ? "1280×720 HD" : "1080×1920 SHORTS"}
              </span>
            </div>

            {/* Carousel Navigation Chevron Arrows */}
            {totalVariants > 1 && (
              <>
                <button
                  type="button"
                  className="thumbnail-carousel-nav-btn prev-btn"
                  onClick={onPrev}
                  disabled={carouselIndex <= 0}
                  aria-label="Previous thumbnail version"
                >
                  <CaretLeft size={20} weight="bold" />
                </button>
                <button
                  type="button"
                  className="thumbnail-carousel-nav-btn next-btn"
                  onClick={onNext}
                  disabled={carouselIndex >= totalVariants - 1}
                  aria-label="Next thumbnail version"
                >
                  <CaretRight size={20} weight="bold" />
                </button>
              </>
            )}

            {/* Floating Action Toolbar */}
            <div className="thumbnail-floating-actions">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="floating-action-btn"
                title="View Fullscreen in new tab"
              >
                <Eye size={16} />
              </a>
              <a
                href={imageUrl}
                download={`${episodeSlug}_thumbnail_${activeRatio === "16:9" ? "16x9" : "9x16"}_v${currentVersionNumber}.jpg`}
                className="floating-action-btn"
                title="Download HD Image"
              >
                <DownloadSimple size={16} />
              </a>
              {totalVariants > 1 && currentVariant && (
                <button
                  type="button"
                  className="floating-action-btn delete-btn"
                  onClick={() => onDeleteVariant(currentVariant.id)}
                  title="Delete this version"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>

            {/* Activate Banner if browsing archived thumbnail */}
            {!isViewingActive && currentVariant && (
              <div className="thumbnail-set-active-overlay">
                <button
                  type="button"
                  className="thumbnail-set-active-btn"
                  onClick={() => onSetActive(currentVariant.id)}
                >
                  <Star size={15} weight="fill" />
                  <span>Set Version {currentVersionNumber} as Active Thumbnail</span>
                </button>
              </div>
            )}
          </div>

          {/* Filmstrip Version Gallery */}
          <ThumbnailFilmstrip
            channelId={channelId}
            episodeId={episodeId}
            activeRatio={activeRatio}
            historyList={historyList}
            selectedIndex={carouselIndex}
            imageTimestamp={imageTimestamp}
            onSelect={onSelectIndex}
          />
        </div>
      ) : (
        <div className="thumbnail-empty-state">
          <ImageIcon size={44} opacity={0.35} />
          <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>No {activeRatio} thumbnail rendered yet</span>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", maxWidth: "260px", textAlign: "center" }}>
            Thumbnails are automatically generated during the visual asset phase. Re-roll will be unlocked once ready.
          </span>
        </div>
      )}
    </div>
  );
}
