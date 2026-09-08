import type { ShortReelRecord, Task } from "@studio/shared";
import { Warning } from "@phosphor-icons/react";

export interface ShortReelConflictBannerProps {
  conflictRemoteRecord: ShortReelRecord | null;
  onKeepLocalDraft: () => void;
  onDiscardDraftAndReload: () => void;
}

/** Concurrent edit conflict banner shown when the remote record advanced while the user was editing. */
export function ShortReelConflictBanner({ conflictRemoteRecord, onKeepLocalDraft, onDiscardDraftAndReload }: ShortReelConflictBannerProps) {
  if (!conflictRemoteRecord) return null;

  return (
    <div className="short-reel-alert short-reel-alert-conflict" role="alert">
      <Warning size={20} weight="fill" />
      <div className="short-reel-alert-body">
        <strong>Revision Conflict Detected</strong>
        <p>
          This Short-Reel was updated to Revision v{conflictRemoteRecord.revision} while you were editing. You can keep your local draft for
          manual reconciliation, or reload the latest remote version. Saving the local draft does not bypass revision checks.
        </p>
        <div className="short-reel-conflict-actions">
          <button type="button" className="short-reel-secondary-btn" onClick={onKeepLocalDraft}>
            Keep My Draft
          </button>
          <button type="button" className="short-reel-primary-btn" onClick={onDiscardDraftAndReload}>
            Discard & Reload Remote
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ShortReelTaskProgressBannerProps {
  isVisible: boolean;
  activeTask: Task | null;
}

/** Background task progress banner shown while generation is running or queued. */
export function ShortReelTaskProgressBanner({ isVisible, activeTask }: ShortReelTaskProgressBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="short-reel-alert short-reel-alert-info" role="status">
      <span className="short-reel-spinner" aria-hidden="true" />
      <div className="short-reel-alert-body">
        <strong>Generation In Progress</strong>
        <p>{activeTask?.progress_message || "Generating creative deliverables..."}</p>
      </div>
    </div>
  );
}
