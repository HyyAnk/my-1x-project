import { useEffect } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import type { PreviewImageData } from "../types";

export function ImagePreviewModal({ image, onClose }: { image: PreviewImageData; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="image-preview-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Image preview">
      <div className="image-preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="image-preview-modal-header">
          <div className="image-preview-title">
            <span className="continuity-badge">{image.bundleId}</span>
            <strong>{image.title}</strong>
          </div>
          <div className="image-preview-actions">
            <a className="primary-button compact" href={image.url} download={image.filename} title="Download image">
              <DownloadSimple size={15} /> Download
            </a>
            <button className="quiet-button compact icon-only" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="image-preview-body">
          <img src={image.url} alt={`${image.bundleId} preview`} />
        </div>
        <div className="image-preview-footer">
          <p className="image-preview-prompt">{image.prompt}</p>
          <div className="image-preview-meta">
            {typeof image.priceVnd === "number" ? <span className="cost-badge">💰 {image.priceVnd.toLocaleString("en-US")} VND</span> : null}
            {image.aspectRatio ? <span className="aspect-badge">{image.aspectRatio}</span> : null}
            {image.model ? <span className="cost-model">{image.model}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
