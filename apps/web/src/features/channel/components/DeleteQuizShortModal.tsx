import { useState } from "react";
import { CircleNotch, Trash, X } from "@phosphor-icons/react";
import type { Channel, QuizShort } from "@studio/shared";
import { api } from "../../../api";

export interface DeleteQuizShortModalProps {
  channel: Channel;
  quizShort: QuizShort;
  onClose: () => void;
  onDeleted: (quizShort: QuizShort) => Promise<void>;
  onError: (error: unknown) => void;
}

export function DeleteQuizShortModal({ channel, quizShort, onClose, onDeleted, onError }: DeleteQuizShortModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteQuizShort(channel.channel_id, quizShort.quiz_short_id);
      await onDeleted(quizShort);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete Quiz Short");
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
        aria-labelledby="delete-quiz-short-title"
        aria-describedby="delete-quiz-short-copy"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Quiz Shorts</p>
            <h2 id="delete-quiz-short-title">Delete Quiz Short</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close delete dialog" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <p id="delete-quiz-short-copy" className="modal-copy">
          Are you sure you want to delete <strong>"{quizShort.topic.title}"</strong>? This permanently removes its questions, plans,
          narration, rendered video and cover.
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
            <span>{busy ? "Deleting..." : "Delete Quiz Short"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
