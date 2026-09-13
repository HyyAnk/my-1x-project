import { Warning, Image as ImageIcon } from "@phosphor-icons/react";
import type {
  ReelAssetErrorBoxProps,
  ReelAssetMediaSlotProps,
  ReelAssetPlaceholderProps,
  ReelAssetPreviewProps,
} from "./reelAsset.types";
import { ReelAssetMetadataBar } from "./ReelAssetMetadataBar";
import { ReelAssetRetryButton } from "./ReelAssetActionControls";

export function ReelAssetPlaceholder({
  aspectRatio,
  isGenerating,
  statusMessage,
  emptyState,
}: ReelAssetPlaceholderProps) {
  const frameClass = aspectRatio === "9:16" ? "short-reel-frame-portrait" : "short-reel-frame-square";

  if (isGenerating) {
    return (
      <div className={`short-reel-asset-placeholder ${frameClass}`}>
        <div className="short-reel-placeholder-loading" role="status">
          <span className="short-reel-spinner" aria-hidden="true" />
          <p>{statusMessage || "Generating..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`short-reel-asset-placeholder ${frameClass}`}>
      <div className="short-reel-placeholder-empty">
        <ImageIcon size={32} weight="duotone" />
        {emptyState?.title && <strong>{emptyState.title}</strong>}
        <p>{emptyState?.description || "No image available yet."}</p>
        {emptyState?.actionLink && (
          <a
            href={emptyState.actionLink.href}
            className="short-reel-link-btn"
            onClick={emptyState.actionLink.onClick}
            aria-label={emptyState.actionLink.label}
          >
            {emptyState.actionLink.label}
          </a>
        )}
      </div>
    </div>
  );
}

export function ReelAssetPreview({
  displayImage,
  imageAlt,
  aspectRatio,
  isShowingPrevious,
  isGenerating,
  statusMessage,
  meta,
  downloadUrl,
  downloadName,
  downloadAriaLabel,
  title,
  emptyState,
}: ReelAssetPreviewProps) {
  if (!displayImage) {
    return (
      <ReelAssetPlaceholder
        aspectRatio={aspectRatio}
        isGenerating={isGenerating}
        statusMessage={statusMessage}
        emptyState={emptyState}
      />
    );
  }

  const frameClass = aspectRatio === "9:16" ? "short-reel-frame-portrait" : "short-reel-frame-square";

  return (
    <div className="short-reel-asset-preview-wrapper">
      <div className={`short-reel-asset-frame ${frameClass}`}>
        <img src={displayImage} alt={imageAlt} className="short-reel-asset-img" loading="lazy" />
        {isShowingPrevious && (
          <div className="short-reel-previous-output-badge" title="Retained from previous accepted attempt">
            Previous Accepted Output
          </div>
        )}
        {isGenerating && (
          <div className="short-reel-frame-overlay" role="status">
            <span className="short-reel-spinner" aria-hidden="true" />
            <span>{statusMessage || "Generating..."}</span>
          </div>
        )}
      </div>
      <ReelAssetMetadataBar
        meta={meta}
        downloadUrl={downloadUrl}
        downloadName={downloadName}
        downloadAriaLabel={downloadAriaLabel}
        title={title}
      />
    </div>
  );
}

export function ReelAssetErrorBox({
  error,
  retryButton,
  isGenerating = false,
}: ReelAssetErrorBoxProps) {
  if (!error) return null;

  return (
    <div className="short-reel-unit-error-box" role="alert">
      <Warning size={16} weight="fill" className="short-reel-error-icon" />
      <div className="short-reel-unit-error-content">
        <span className="short-reel-unit-error-msg">{error}</span>
        {retryButton && (
          <ReelAssetRetryButton retryButton={retryButton} isGenerating={isGenerating} />
        )}
      </div>
    </div>
  );
}

export function ReelAssetMediaSlot({
  title,
  aspectRatio,
  imageUrl,
  imageAlt,
  previousImageUrl,
  isGenerating = false,
  statusMessage,
  error,
  retryButton,
  meta,
  downloadUrl,
  downloadName = "asset.png",
  downloadAriaLabel,
  emptyState,
}: ReelAssetMediaSlotProps) {
  const displayImage = imageUrl || previousImageUrl;
  const isShowingPrevious = Boolean(previousImageUrl) && (!imageUrl || isGenerating || Boolean(error));

  return (
    <>
      <div className="short-reel-asset-preview-container">
        <ReelAssetPreview
          displayImage={displayImage}
          imageAlt={imageAlt}
          aspectRatio={aspectRatio}
          isShowingPrevious={isShowingPrevious}
          isGenerating={isGenerating}
          statusMessage={statusMessage}
          meta={meta}
          downloadUrl={downloadUrl}
          downloadName={downloadName}
          downloadAriaLabel={downloadAriaLabel}
          title={title}
          emptyState={emptyState}
        />
      </div>

      <ReelAssetErrorBox error={error} retryButton={retryButton} isGenerating={isGenerating} />
    </>
  );
}
