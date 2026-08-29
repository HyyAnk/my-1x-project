import type { StageViewMode } from "../types";
import { StagePreviewStatus } from "./StagePreviewStatus";

type StageCanvasBackdropProps = {
  viewMode: StageViewMode;
  previewHtml: string;
  previewLoading: boolean;
  previewError: boolean;
  iframeKey: number;
  width: number;
  height: number;
  loadingLabel: string;
  updatingLabel: string;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
};

export function StageCanvasBackdrop({
  viewMode,
  previewHtml,
  previewLoading,
  previewError,
  iframeKey,
  width,
  height,
  loadingLabel,
  updatingLabel,
  errorLabel,
  retryLabel,
  onRetry,
}: StageCanvasBackdropProps) {
  if (viewMode === "grid") {
    return (
      <div className="stage-blueprint-grid">
        <div className="grid-center-crosshair" />
        <span className="grid-dimension-tag">
          {width} x {height} px
        </span>
      </div>
    );
  }

  return (
    <>
      {previewHtml ? (
        <iframe
          key={iframeKey}
          title="Stage Studio video preview"
          srcDoc={previewHtml}
          className="stage-video-iframe"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      ) : null}
      <StagePreviewStatus
        hasPreview={Boolean(previewHtml)}
        loading={previewLoading}
        error={previewError}
        loadingLabel={previewHtml ? updatingLabel : loadingLabel}
        errorLabel={errorLabel}
        retryLabel={retryLabel}
        onRetry={onRetry}
      />
    </>
  );
}
