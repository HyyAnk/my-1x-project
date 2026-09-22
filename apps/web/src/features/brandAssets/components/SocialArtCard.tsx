import { useState } from "react";
import {
  Check,
  Copy,
  DownloadSimple,
  Eye,
  MagnifyingGlassPlus,
  Trash,
} from "@phosphor-icons/react";
import type { SocialArtAsset } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { formatDate, formatFileSize, triggerFileDownload } from "../utils/fileUploadHelpers";

export interface SocialArtCardProps {
  asset: SocialArtAsset;
  isMutating?: boolean;
  onView: (asset: SocialArtAsset) => void;
  onDeleteRequest: (asset: SocialArtAsset) => void;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

export function SocialArtCard({
  asset,
  isMutating = false,
  onView,
  onDeleteRequest,
  onNotice,
}: SocialArtCardProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleDownload = () => {
    triggerFileDownload(asset.url || asset.relative_path, asset.filename);
  };

  const handleCopyPath = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(asset.relative_path);
      }
      setCopied(true);
      onNotice?.({ tone: "good", message: "Relative path copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotice?.({ tone: "bad", message: "Failed to copy path to clipboard." });
    }
  };

  return (
    <div
      className="brand-asset-card social-art-card"
      data-testid={`social-art-card-${asset.id}`}
    >
      <div className="art-card-preview-container">
        <div className="art-card-preview-box transparent-checkerboard">
          <img
            src={asset.url || asset.relative_path}
            alt={asset.caption || asset.filename}
            className="art-card-img"
            data-testid={`art-card-img-${asset.id}`}
          />
          <div className="art-card-overlay">
            <button
              type="button"
              className="art-overlay-btn"
              onClick={() => onView(asset)}
              title="View full size"
              aria-label={`View full size ${asset.filename}`}
              data-testid={`overlay-view-${asset.id}`}
            >
              <MagnifyingGlassPlus size={18} />
            </button>
            <button
              type="button"
              className="art-overlay-btn"
              onClick={handleDownload}
              title="Download artwork"
              aria-label={`Download ${asset.filename}`}
              data-testid={`overlay-download-${asset.id}`}
            >
              <DownloadSimple size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="art-card-body">
        <div className="art-card-header">
          <h4 className="art-card-filename" title={asset.filename}>
            {asset.filename}
          </h4>
        </div>

        {asset.caption ? (
          <p className="art-card-caption" title={asset.caption}>
            {asset.caption}
          </p>
        ) : null}

        <dl className="asset-metadata-list">
          <div className="meta-item">
            <dt className="meta-label">Dimensions</dt>
            <dd className="meta-value">{`${asset.width} × ${asset.height} px`}</dd>
          </div>
          <div className="meta-item">
            <dt className="meta-label">Size</dt>
            <dd className="meta-value">{formatFileSize(asset.size_bytes)}</dd>
          </div>
          <div className="meta-item">
            <dt className="meta-label">Uploaded</dt>
            <dd className="meta-value">{formatDate(asset.updated_at || asset.created_at)}</dd>
          </div>
        </dl>

        <div className="asset-actions-toolbar art-actions-toolbar">
          <button
            type="button"
            className="button quiet art-action-btn"
            onClick={() => onView(asset)}
            data-testid={`view-art-btn-${asset.id}`}
            title="View in Lightbox"
          >
            <Eye size={15} />
            <span>View</span>
          </button>

          <button
            type="button"
            className="button quiet art-action-btn"
            onClick={handleDownload}
            data-testid={`download-art-btn-${asset.id}`}
            title="Download file"
          >
            <DownloadSimple size={15} />
            <span>Download</span>
          </button>

          <button
            type="button"
            className="button quiet art-action-btn copy-path-btn"
            onClick={handleCopyPath}
            data-testid={`copy-path-btn-${asset.id}`}
            title="Copy relative path"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Copy Path"}</span>
          </button>

          <button
            type="button"
            className="button quiet art-action-btn delete-art-btn"
            onClick={() => onDeleteRequest(asset)}
            disabled={isMutating}
            data-testid={`delete-art-btn-${asset.id}`}
            aria-label={`Delete ${asset.filename}`}
            title="Delete artwork"
          >
            <Trash size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
