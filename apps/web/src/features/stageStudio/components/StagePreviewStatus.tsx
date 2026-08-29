import { ArrowClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";

type StagePreviewStatusProps = {
  hasPreview: boolean;
  loading: boolean;
  error: boolean;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
};

export function StagePreviewStatus({ hasPreview, loading, error, loadingLabel, errorLabel, retryLabel, onRetry }: StagePreviewStatusProps) {
  if (error) {
    return (
      <div className={`stage-preview-status is-error ${hasPreview ? "is-compact" : ""}`} role="alert">
        <WarningCircle size={hasPreview ? 14 : 28} />
        <span>{errorLabel}</span>
        <button type="button" onClick={onRetry}>
          <ArrowClockwise size={13} />
          <span>{retryLabel}</span>
        </button>
      </div>
    );
  }

  if (!loading && hasPreview) return null;

  return (
    <div className={`stage-preview-status ${hasPreview ? "is-compact" : ""}`} role="status" aria-live="polite">
      <CircleNotch className="spin" size={hasPreview ? 14 : 32} />
      <span>{loadingLabel}</span>
    </div>
  );
}
