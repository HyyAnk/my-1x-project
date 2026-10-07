import type { MascotRenderAspectRatio } from "@studio/shared";

interface MotionPreviewIframeProps {
  htmlMarkup: string | null;
  aspectRatio: MascotRenderAspectRatio;
  isLoading: boolean;
  error: string | null;
  replayKey: number;
  onReplay: () => void;
  onToggleAspectRatio: (ratio: MascotRenderAspectRatio) => void;
}

export function MotionPreviewIframe({
  htmlMarkup,
  aspectRatio,
  isLoading,
  error,
  replayKey,
  onReplay,
  onToggleAspectRatio,
}: MotionPreviewIframeProps) {
  const isPortrait = aspectRatio === "9:16";

  return (
    <div className="motion-preview-container">
      <div className="motion-preview-header">
        <div className="motion-preview-title">
          <span>Live Motion Preview</span>
        </div>
        <div className="motion-preview-controls">
          <div className="ratio-toggle-group">
            <button
              type="button"
              className={`ratio-btn ${!isPortrait ? "is-active" : ""}`}
              onClick={() => onToggleAspectRatio("16:9")}
              aria-label="Preview in 16:9 landscape"
            >
              16:9
            </button>
            <button
              type="button"
              className={`ratio-btn ${isPortrait ? "is-active" : ""}`}
              onClick={() => onToggleAspectRatio("9:16")}
              aria-label="Preview in 9:16 portrait"
            >
              9:16
            </button>
          </div>
          <button
            type="button"
            className="motion-btn motion-btn-secondary"
            onClick={onReplay}
            disabled={isLoading || !htmlMarkup}
            aria-label="Replay motion animation"
          >
            ↻ Replay
          </button>
        </div>
      </div>

      <div className={`motion-preview-viewport ratio-${isPortrait ? "9-16" : "16-9"}`}>
        {isLoading && (
          <div className="motion-preview-overlay" role="status">
            <div className="motion-spinner" />
            <span>Rendering Motion Preview...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="motion-preview-overlay is-error" role="alert">
            <span>{error}</span>
          </div>
        )}

        {!htmlMarkup && !isLoading && !error && (
          <div className="motion-preview-overlay is-empty">
            <span>Select a motion template to preview</span>
          </div>
        )}

        {htmlMarkup && (
          <iframe
            key={replayKey}
            title="Motion Template Live Preview"
            srcDoc={htmlMarkup}
            className="motion-preview-frame"
            sandbox="allow-scripts"
          />
        )}
      </div>
    </div>
  );
}
