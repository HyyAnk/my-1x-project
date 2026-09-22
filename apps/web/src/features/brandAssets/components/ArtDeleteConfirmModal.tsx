import { useEffect } from "react";
import { Trash, WarningCircle, X } from "@phosphor-icons/react";
import type { SocialArtAsset } from "@studio/shared";

export interface ArtDeleteConfirmModalProps {
  asset: SocialArtAsset | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ArtDeleteConfirmModal({
  asset,
  isDeleting = false,
  onConfirm,
  onClose,
}: ArtDeleteConfirmModalProps) {
  useEffect(() => {
    if (!asset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, isDeleting, onClose]);

  if (!asset) return null;

  return (
    <div
      className="modal-backdrop delete-confirm-backdrop"
      role="presentation"
      onClick={() => !isDeleting && onClose()}
      data-testid="art-delete-confirm-backdrop"
    >
      <div
        className="modal-dialog delete-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        data-testid="art-delete-confirm-modal"
      >
        <div className="dialog-header">
          <div className="dialog-title-group">
            <WarningCircle size={22} className="warning-icon" weight="duotone" />
            <h3 id="delete-dialog-title">Delete Artwork</h3>
          </div>
          <button
            type="button"
            className="button quiet dialog-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="dialog-body">
          <p id="delete-dialog-desc">
            Are you sure you want to permanently delete{" "}
            <strong className="delete-target-name">{asset.filename}</strong>? This action cannot be
            undone.
          </p>
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="button quiet cancel-modal-btn"
            onClick={onClose}
            disabled={isDeleting}
            data-testid="cancel-delete-artwork-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            className="button danger confirm-modal-delete-btn"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="confirm-delete-artwork-btn"
          >
            <Trash size={16} />
            <span>{isDeleting ? "Deleting..." : "Delete Artwork"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
