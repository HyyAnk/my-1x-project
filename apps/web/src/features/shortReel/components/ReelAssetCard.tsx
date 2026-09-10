import React from "react";
import { DownloadSimple, ArrowClockwise, Warning, Image as ImageIcon } from "@phosphor-icons/react";

export interface ReelAssetCardProps {
  title: string;
  roleLabel?: string;
  badge: {
    label: string;
    tone?: "ready" | "pending" | "failed" | "stale" | "missing" | "neutral";
  };
  aspectRatio: "1:1" | "9:16";
  imageUrl: string | null;
  imageAlt: string;
  previousImageUrl?: string | null;
  isGenerating?: boolean;
  statusMessage?: string | null;
  error?: string | null;
  actionButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    ariaLabel?: string;
    icon?: React.ReactNode;
  };
  retryButton?: {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
    ariaLabel?: string;
  };
  meta?: {
    dimensions?: string;
    mimeType?: string;
    checksum?: string;
  };
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  emptyState?: {
    title?: string;
    description: string;
    actionLink?: {
      label: string;
      href: string;
      onClick?: () => void;
    };
  };
  ariaLabel: string;
}

function ReelAssetMetadataBar({
  meta,
  downloadUrl,
  downloadName = "asset.png",
  downloadAriaLabel,
  title,
}: {
  meta?: { dimensions?: string; mimeType?: string; checksum?: string };
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  title: string;
}) {
  if (!meta) return null;
  return (
    <div className="short-reel-asset-metadata">
      {meta.dimensions && <span>{meta.dimensions}</span>}
      {meta.mimeType && <span>• {meta.mimeType}</span>}
      {meta.checksum && (
        <code title={meta.checksum} className="short-reel-checksum-code">
          Hash: {meta.checksum.slice(0, 10)}...
        </code>
      )}
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={downloadName}
          className="short-reel-download-link"
          aria-label={downloadAriaLabel ?? `Download ${title}`}
        >
          <DownloadSimple size={14} />
          <span>Download</span>
        </a>
      )}
    </div>
  );
}

function ReelAssetPlaceholder({
  aspectRatio,
  isGenerating,
  statusMessage,
  emptyState,
}: {
  aspectRatio: "1:1" | "9:16";
  isGenerating: boolean;
  statusMessage?: string | null;
  emptyState?: ReelAssetCardProps["emptyState"];
}) {
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

function ReelAssetPreview({
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
}: {
  displayImage?: string | null;
  imageAlt: string;
  aspectRatio: "1:1" | "9:16";
  isShowingPrevious: boolean;
  isGenerating: boolean;
  statusMessage?: string | null;
  meta?: ReelAssetCardProps["meta"];
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  title: string;
  emptyState?: ReelAssetCardProps["emptyState"];
}) {
  if (!displayImage) {
    return (
      <ReelAssetPlaceholder aspectRatio={aspectRatio} isGenerating={isGenerating} statusMessage={statusMessage} emptyState={emptyState} />
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

function ReelAssetErrorBox({
  error,
  retryButton,
  isGenerating,
}: {
  error?: string | null;
  retryButton?: ReelAssetCardProps["retryButton"];
  isGenerating: boolean;
}) {
  if (!error) return null;
  return (
    <div className="short-reel-unit-error-box" role="alert">
      <Warning size={16} weight="fill" className="short-reel-error-icon" />
      <div className="short-reel-unit-error-content">
        <span className="short-reel-unit-error-msg">{error}</span>
        {retryButton && (
          <button
            type="button"
            className="short-reel-retry-btn"
            disabled={retryButton.disabled || isGenerating}
            onClick={retryButton.onClick}
            aria-label={retryButton.ariaLabel ?? "Retry Generation"}
          >
            <ArrowClockwise size={12} />
            <span>{retryButton.label ?? "Retry"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

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
  const displayImage = imageUrl || previousImageUrl;
  const isShowingPrevious = Boolean(previousImageUrl) && (!imageUrl || isGenerating || Boolean(error));

  return (
    <section className="short-reel-card short-reel-asset-card" role="region" aria-label={ariaLabel}>
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">{title}</h3>
          {roleLabel && <span className="short-reel-badge short-reel-badge-role">{roleLabel}</span>}
          <span className={`short-reel-badge short-reel-badge-${badge.tone ?? "neutral"}`}>{badge.label}</span>
        </div>

        <div className="short-reel-header-actions">
          {actionButton && (
            <button
              type="button"
              className="short-reel-secondary-btn"
              disabled={actionButton.disabled || isGenerating}
              onClick={actionButton.onClick}
              aria-label={actionButton.ariaLabel ?? actionButton.label}
            >
              {actionButton.icon ?? <ArrowClockwise size={14} />}
              <span>{actionButton.label}</span>
            </button>
          )}
        </div>
      </div>

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
    </section>
  );
}
