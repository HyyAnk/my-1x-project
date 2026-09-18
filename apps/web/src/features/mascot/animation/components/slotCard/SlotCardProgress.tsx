import { CircleNotch, XCircle } from "@phosphor-icons/react";

export interface SlotCardProgressProps {
  status: string;
  isQueued: boolean;
  jobProgress?: number | null;
  activeJobId?: string | null;
  onCancelJob?: (jobId: string) => void;
}

export function resolveProgressPercent(status: string, isQueued: boolean, jobProgress?: number | null): number {
  if (isQueued) return 5;
  if (jobProgress !== undefined && jobProgress !== null) return jobProgress;
  if (status === "uploading") return 15;
  if (status === "processing") return 50;
  return 0;
}

export function resolveProgressMessage(status: string, isQueued: boolean, progressPercent: number): string {
  if (isQueued) return "In Queue (Waiting for slot...)";
  if (status === "uploading") return "Uploading video...";
  if (status === "retrying") return "Retrying animation...";
  if (status === "replacing") return "Staging replacement...";
  if (progressPercent < 35) return "Extracting frames...";
  if (progressPercent < 60) return "Removing background...";
  if (progressPercent < 75) return "Aligning registration...";
  if (progressPercent < 90) return "Packaging sequence...";
  return "Finalizing artifacts...";
}

export function SlotCardProgress({ status, isQueued, jobProgress, activeJobId, onCancelJob }: SlotCardProgressProps) {
  const progressPercent = resolveProgressPercent(status, isQueued, jobProgress);
  const progressMessage = resolveProgressMessage(status, isQueued, progressPercent);

  return (
    <div className="anim-slot-processing-box" role="status" aria-live="polite">
      <CircleNotch size={28} className="spin anim-spinner" />
      <div className="anim-progress-bar-wrap">
        <div className={`anim-progress-bar-fill ${isQueued ? "is-queued" : ""}`} style={{ width: `${progressPercent}%` }} />
      </div>
      <span className="anim-progress-pct">{isQueued ? "Queued" : `${progressPercent}%`}</span>
      <span className="anim-progress-text">{progressMessage}</span>
      {activeJobId && onCancelJob ? (
        <button
          type="button"
          className="anim-cancel-btn"
          onClick={() => onCancelJob(activeJobId)}
          title={isQueued ? "Cancel waiting job" : "Cancel processing"}
        >
          <XCircle size={13} />
          <span>Cancel</span>
        </button>
      ) : null}
    </div>
  );
}
