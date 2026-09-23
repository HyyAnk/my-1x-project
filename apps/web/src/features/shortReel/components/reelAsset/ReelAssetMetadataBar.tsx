import React, { useState } from "react";
import { DownloadSimple, Copy, Check } from "@phosphor-icons/react";
import type { ReelAssetMetadataBarProps } from "./reelAsset.types";
import { copyImageToClipboard } from "../../utils/copyImage";
import { downloadImageFile } from "../../utils/downloadImage";

export function ReelAssetMetadataBar({
  meta,
  downloadUrl,
  downloadName = "asset.png",
  downloadAriaLabel,
  title,
  onNotice,
  onCopyImage,
  onDownloadImage,
}: ReelAssetMetadataBarProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!meta && !downloadUrl) return null;

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!downloadUrl) return;

    try {
      if (onCopyImage) {
        await onCopyImage(downloadUrl);
      } else {
        await copyImageToClipboard(downloadUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onNotice?.({ tone: "good", message: `Copied ${title} image to clipboard` });
    } catch (err) {
      onNotice?.({
        tone: "bad",
        message: `Failed to copy image: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!downloadUrl) return;
    try {
      setIsDownloading(true);
      if (onDownloadImage) {
        await onDownloadImage(downloadUrl, downloadName);
      } else {
        await downloadImageFile(downloadUrl, downloadName);
      }
      onNotice?.({ tone: "good", message: `Downloaded ${downloadName}` });
    } catch (err) {
      onNotice?.({
        tone: "bad",
        message: `Failed to download: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="short-reel-asset-metadata short-reel-asset-bar">
      {downloadUrl && (
        <div className="short-reel-asset-actions">
          <button
            type="button"
            className={`short-reel-asset-btn short-reel-asset-btn-copy ${copied ? "short-reel-asset-btn-copied" : ""}`}
            onClick={handleCopyImage}
            aria-label={`Copy ${title} image`}
            title="Copy image directly to clipboard"
          >
            {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Image"}</span>
          </button>

          <a
            href={downloadUrl}
            download={downloadName}
            onClick={handleDownload}
            className={`short-reel-asset-btn short-reel-asset-btn-download short-reel-download-link ${
              isDownloading ? "short-reel-asset-btn-loading" : ""
            }`}
            aria-label={downloadAriaLabel ?? `Download ${title}`}
            title={`Download as ${downloadName}`}
          >
            <DownloadSimple size={14} />
            <span>{isDownloading ? "Downloading..." : "Download"}</span>
          </a>
        </div>
      )}

      {meta && (
        <div className="short-reel-asset-specs">
          {meta.dimensions && <span className="short-reel-spec-pill short-reel-spec-dim">{meta.dimensions}</span>}
          {meta.mimeType && (
            <span className="short-reel-spec-pill short-reel-spec-mime">
              {meta.mimeType.replace("image/", "").toUpperCase()}
            </span>
          )}
          {meta.checksum && (
            <code title={`Checksum: ${meta.checksum}`} className="short-reel-checksum-code">
              Hash: {meta.checksum.slice(0, 8)}...
            </code>
          )}
        </div>
      )}
    </div>
  );
}
