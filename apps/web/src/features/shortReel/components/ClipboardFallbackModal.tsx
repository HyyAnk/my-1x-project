import { X } from "@phosphor-icons/react";

export interface ClipboardFallbackModalProps {
  clipboardFallbackText: string;
  onClose: () => void;
}

export function ClipboardFallbackModal({ clipboardFallbackText, onClose }: ClipboardFallbackModalProps) {
  return (
    <div className="short-reel-modal-backdrop" role="dialog" aria-modal="true" aria-label="Manual Copy Fallback">
      <div className="short-reel-modal">
        <div className="short-reel-modal-header">
          <h3>Manual Copy Fallback</h3>
          <button type="button" className="short-reel-modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="short-reel-modal-body">
          <p>Clipboard access was not permitted. You can select and copy the text below:</p>
          <textarea
            readOnly
            rows={6}
            className="short-reel-textarea short-reel-fallback-textarea"
            value={clipboardFallbackText}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="short-reel-modal-footer">
          <button type="button" className="short-reel-primary-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
