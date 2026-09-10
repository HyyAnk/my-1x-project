import { useState } from "react";
import { CircleNotch, Trash, X } from "@phosphor-icons/react";
import type { Channel, ShortReelRecord } from "@studio/shared";
import { api } from "../../../api";

export interface DeleteShortReelModalProps {
  channel: Channel;
  reel: ShortReelRecord;
  onClose: () => void;
  onDeleted: (reel: ShortReelRecord) => Promise<void>;
  onError: (error: unknown) => void;
}

export function DeleteShortReelModal({ channel, reel, onClose, onDeleted, onError }: DeleteShortReelModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteShortReel(channel.channel_id, reel.reel_id);
      await onDeleted(reel);
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : "Could not delete Short-Reel";
      setError(msg);
      onError(reason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-short-reel-title"
        aria-describedby="delete-short-reel-copy"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Short-Reel Studio</p>
            <h2 id="delete-short-reel-title">Delete Short-Reel</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close delete dialog" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <p id="delete-short-reel-copy" className="modal-copy">
          Are you sure you want to delete <strong>"{reel.topic.title}"</strong>? This will permanently remove all generated script segments,
          references, cover artwork, and prompt configurations.
        </p>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="quiet-button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="primary-button danger-confirm" onClick={() => void handleDelete()} disabled={busy}>
            {busy ? <CircleNotch className="spin" size={16} /> : <Trash size={16} />}
            <span>{busy ? "Deleting..." : "Delete Short-Reel"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
