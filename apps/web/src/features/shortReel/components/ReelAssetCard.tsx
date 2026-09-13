import type { ReelAssetCardProps } from "./reelAsset/reelAsset.types";
import { ReelAssetActionButton } from "./reelAsset/ReelAssetActionControls";
import { ReelAssetMediaSlot } from "./reelAsset/ReelAssetMediaSlot";

export type { ReelAssetCardProps } from "./reelAsset/reelAsset.types";
export * from "./reelAsset";

export function ReelAssetCard({
  title,
  roleLabel,
  badge,
  aspectRatio,
  imageUrl,
  imageAlt,
  previousImageUrl,
  isGenerating = false,
  statusMessage,
  error,
  actionButton,
  retryButton,
  meta,
  downloadUrl,
  downloadName = "asset.png",
  downloadAriaLabel,
  emptyState,
  ariaLabel,
}: ReelAssetCardProps) {
  return (
    <section className="short-reel-card short-reel-asset-card" role="region" aria-label={ariaLabel}>
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">{title}</h3>
          {roleLabel && <span className="short-reel-badge short-reel-badge-role">{roleLabel}</span>}
          <span className={`short-reel-badge short-reel-badge-${badge.tone ?? "neutral"}`}>{badge.label}</span>
        </div>

        <div className="short-reel-header-actions">
          <ReelAssetActionButton actionButton={actionButton} isGenerating={isGenerating} />
        </div>
      </div>

      <ReelAssetMediaSlot
        title={title}
        aspectRatio={aspectRatio}
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        previousImageUrl={previousImageUrl}
        isGenerating={isGenerating}
        statusMessage={statusMessage}
        error={error}
        retryButton={retryButton}
        meta={meta}
        downloadUrl={downloadUrl}
        downloadName={downloadName}
        downloadAriaLabel={downloadAriaLabel}
        emptyState={emptyState}
      />
    </section>
  );
}
