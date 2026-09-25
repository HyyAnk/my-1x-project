import { CheckCircle, Clock, CircleNotch, WarningCircle } from "@phosphor-icons/react";

export interface SlotCardStatusBadgeProps {
  status: string;
  isReady: boolean;
  isQueued: boolean;
  isProcessing: boolean;
  isFailed: boolean;
  errorMessage?: string | null;
}

export function SlotCardStatusBadge({ status, isReady, isQueued, isProcessing, isFailed, errorMessage }: SlotCardStatusBadgeProps) {
  if (isReady) {
    if (errorMessage) {
      return (
        <span className="anim-status-badge is-failed">
          <WarningCircle size={12} weight="fill" />
          <span>Replacement failed</span>
        </span>
      );
    }
    return (
      <span className="anim-status-badge is-ready" title="Sequence packaged and verified">
        <CheckCircle size={12} weight="fill" />
        <span>Ready</span>
      </span>
    );
  }

  if (isQueued) {
    return (
      <span className="anim-status-badge is-queued" title="Waiting in processing queue">
        <Clock size={12} weight="fill" />
        <span>In Queue</span>
      </span>
    );
  }

  if (isProcessing) {
    return (
      <span className="anim-status-badge is-processing">
        <CircleNotch size={12} className="spin" />
        <span>Processing</span>
      </span>
    );
  }

  if (isFailed) {
    const failedLabel = status === "qa_failed" ? "QA Failed" : status === "cancelled" ? "Cancelled" : "Failed";

    return (
      <span className="anim-status-badge is-failed" title={errorMessage || "Processing failed"}>
        <WarningCircle size={12} weight="fill" />
        <span>{failedLabel}</span>
      </span>
    );
  }

  return (
    <span className="anim-status-badge is-empty">
      <span>Empty</span>
    </span>
  );
}
