import { ArrowClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";

type CompositionPreviewFrameProps = {
  width: number;
  height: number;
  iframeKey: number;
  previewHtml: string;
  pendingPreviewHtml: string;
  loading: boolean;
  previewError: string | null;
  onPendingPreviewLoad: (frame: HTMLIFrameElement, html: string) => void;
  onRetryPreview: () => void;
  title: string;
  statusLabel: string;
  errorLabel: string;
  retryLabel: string;
};

export function CompositionPreviewFrame({
  width,
  height,
  iframeKey,
  previewHtml,
  pendingPreviewHtml,
  loading,
  previewError,
  onPendingPreviewLoad,
  onRetryPreview,
  title,
  statusLabel,
  errorLabel,
  retryLabel,
}: CompositionPreviewFrameProps) {
  return (
    <>
      {previewHtml ? (
        <iframe
          key={iframeKey}
          title={title}
          srcDoc={previewHtml}
          style={{ width: `${width}px`, height: `${height}px`, border: "none", display: "block", pointerEvents: "auto" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#FFF" }}>
          <CircleNotch className="spin" size={48} />
        </div>
      )}

      {pendingPreviewHtml ? (
        <iframe
          key={pendingPreviewHtml}
          title={`${title} — font verification`}
          srcDoc={pendingPreviewHtml}
          aria-hidden="true"
          tabIndex={-1}
          onLoad={(event) => void onPendingPreviewLoad(event.currentTarget, pendingPreviewHtml)}
          style={{
            position: "absolute",
            inset: 0,
            width: `${width}px`,
            height: `${height}px`,
            border: 0,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {loading ? <PreviewStatus label={statusLabel} /> : null}
      {previewError ? <PreviewError label={errorLabel} retryLabel={retryLabel} onRetry={onRetryPreview} /> : null}
    </>
  );
}

function PreviewStatus({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ ...statusStyle, padding: "10px 16px", borderRadius: "999px", background: "rgba(6, 9, 17, 0.88)" }}
    >
      <CircleNotch className="spin" size={18} />
      <span>{label}</span>
    </div>
  );
}

function PreviewError({ label, retryLabel, onRetry }: { label: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        ...statusStyle,
        padding: "10px 12px 10px 16px",
        border: "1px solid rgba(248, 113, 113, .55)",
        borderRadius: "14px",
        background: "rgba(69, 10, 10, .94)",
      }}
    >
      <WarningCircle size={20} />
      <span>{label}</span>
      <button type="button" className="quiet-button compact" onClick={onRetry}>
        <ArrowClockwise size={14} />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}

const statusStyle = {
  position: "absolute",
  top: "24px",
  left: "50%",
  zIndex: 10001,
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  color: "#fff",
  transform: "translateX(-50%)",
} as const;
