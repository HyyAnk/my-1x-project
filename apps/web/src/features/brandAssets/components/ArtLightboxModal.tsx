import { useEffect } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import type { SocialArtAsset } from "@studio/shared";
import { formatFileSize, triggerFileDownload } from "../utils/fileUploadHelpers";

export interface ArtLightboxModalProps {
  asset: SocialArtAsset | null;
  onClose: () => void;
}

export function ArtLightboxModal({ asset, onClose }: ArtLightboxModalProps) {
  useEffect(() => {
    if (!asset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, onClose]);

  if (!asset) return null;

  const handleDownload = () => {
    triggerFileDownload(asset.url || asset.relative_path, asset.filename);
  };

  return (
    <div
      className="modal-backdrop art-lightbox-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="art-lightbox-backdrop"
    >
      <div
        className="art-lightbox-content"
        role="dialog"
        aria-modal="true"
        aria-label={`Artwork: ${asset.filename}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="art-lightbox-modal"
      >
        <div className="art-lightbox-header">
          <div className="art-lightbox-title-group">
            <h3 className="art-lightbox-filename" title={asset.filename}>
              {asset.filename}
            </h3>
            <span className="art-lightbox-meta-badge">
              {`${asset.width} × ${asset.height} px • ${formatFileSize(asset.size_bytes)}`}
            </span>
          </div>

          <div className="art-lightbox-actions">
            <button
              type="button"
              className="button quiet lightbox-action-btn"
              onClick={handleDownload}
              title="Download artwork"
              aria-label="Download artwork"
              data-testid="lightbox-download-btn"
            >
              <DownloadSimple size={18} />
              <span>Download</span>
            </button>
            <button
              type="button"
              className="button quiet lightbox-close-btn"
              onClick={onClose}
              title="Close artwork preview"
              aria-label="Close artwork preview"
              data-testid="lightbox-close-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="art-lightbox-image-wrap transparent-checkerboard">
          <img
            src={asset.url || asset.relative_path}
            alt={asset.caption || asset.filename}
            className="art-lightbox-img"
            data-testid="lightbox-image"
          />
        </div>

        {asset.caption ? (
          <div className="art-lightbox-footer">
            <p className="art-lightbox-caption">{asset.caption}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
