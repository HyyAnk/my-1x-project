import { ArrowClockwise, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

type SandboxVerifiedPreviewProps = {
  iframeKey: number;
  previewHtml: string;
  pendingPreviewHtml: string;
  loading: boolean;
  previewError: string | null;
  onPendingPreviewLoad: (frame: HTMLIFrameElement, html: string) => void;
  onRetryPreview: () => void;
};

export function SandboxVerifiedPreview({
  iframeKey,
  previewHtml,
  pendingPreviewHtml,
  loading,
  previewError,
  onPendingPreviewLoad,
  onRetryPreview,
}: SandboxVerifiedPreviewProps) {
  const { t } = useTranslation();
  return (
    <>
      {previewHtml ? (
        <iframe
          key={iframeKey}
          title="HyperFrames Sandbox Frame Preview"
          srcDoc={previewHtml}
          style={{ width: "1920px", height: "1080px", border: "none", display: "block", pointerEvents: "auto" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#FFF" }}>
          <CircleNotch className="spin" size={48} />
        </div>
      )}

      {pendingPreviewHtml ? (
        <iframe
          key={pendingPreviewHtml}
          title="Font verification preview"
          srcDoc={pendingPreviewHtml}
          aria-hidden="true"
          tabIndex={-1}
          onLoad={(event) => void onPendingPreviewLoad(event.currentTarget, pendingPreviewHtml)}
          style={{
            position: "absolute",
            inset: 0,
            width: "1920px",
            height: "1080px",
            border: 0,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {loading ? <PreviewStatus label={t("visualSandbox.verifyingFonts")} /> : null}
      {previewError ? (
        <PreviewError label={t("visualSandbox.fontLoadFailed")} retryLabel={t("common.retry")} onRetry={onRetryPreview} />
      ) : null}
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
