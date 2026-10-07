import { useEffect } from "react";
import { CaretLeft, CaretRight, DownloadSimple, X } from "@phosphor-icons/react";
import type { PreviewImageData } from "../types";

export interface ImagePreviewModalProps {
  image: PreviewImageData;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function ImagePreviewModal({
  image,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: ImagePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && onPrevious && hasPrevious) {
        onPrevious();
      } else if (event.key === "ArrowRight" && onNext && hasNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);

  return (
    <div
      className="image-preview-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="image-preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="image-preview-modal-header">
          <div className="image-preview-title">
            <span className="continuity-badge">{image.bundleId}</span>
            <strong>{image.title}</strong>
            {image.counter ? <span className="preview-counter-badge">{image.counter}</span> : null}
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
          {onPrevious ? (
            <button
              type="button"
              className="image-preview-nav prev"
              onClick={onPrevious}
              disabled={!hasPrevious}
              aria-label="Previous image"
              title="Previous image (Left arrow)"
            >
              <CaretLeft size={28} />
            </button>
          ) : null}

          <img src={image.url} alt={`${image.bundleId} preview`} />

          {onNext ? (
            <button
              type="button"
              className="image-preview-nav next"
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next image"
              title="Next image (Right arrow)"
            >
              <CaretRight size={28} />
            </button>
          ) : null}
        </div>

        <div className="image-preview-footer">
          {image.subtitle ? <p className="image-preview-subtitle">{image.subtitle}</p> : null}
          {image.prompt ? <p className="image-preview-prompt">{image.prompt}</p> : null}
          <div className="image-preview-meta">
            {typeof image.priceVnd === "number" ? (
              <span className="cost-badge">💰 {image.priceVnd.toLocaleString("en-US")} VND</span>
            ) : null}
            {image.aspectRatio ? <span className="aspect-badge">{image.aspectRatio}</span> : null}
            {image.model ? <span className="cost-model">{image.model}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
