import { Crosshair, EyeSlash } from "@phosphor-icons/react";
import type { useStageStudio } from "../hooks/useStageStudio";
import { StageCanvasBackdrop } from "./StageCanvasBackdrop";
import { StageCanvasGuides } from "./StageCanvasGuides";

type StageCanvasViewportProps = {
  studio: ReturnType<typeof useStageStudio>;
};

export function StageCanvasViewport({ studio }: StageCanvasViewportProps) {
  const {
    t,
    stageViewportRef,
    aspectRatio,
    stageViewMode,
    showGuides,
    showSafeMargins,
    position,
    scale,
    offsetX,
    offsetY,
    isDragging,
    isResizing,
    previewHtml,
    pendingPreviewHtml,
    previewLoading,
    previewError,
    retryPreview,
    verifyPendingPreview,
    iframeKey,
    targetStageWidth,
    targetStageHeight,
    stageScale,
    scenarioPhase,
    isMascotVisibleInCurrentPhase,
    handleMascotMouseDown,
    handleResizeHandleMouseDown,
  } = studio;

  return (
    <div className="stage-canvas-workspace" ref={stageViewportRef}>
      <div
        className={`stage-canvas-letterbox aspect-${aspectRatio.replace(":", "-")}`}
        style={{
          width: `${targetStageWidth * stageScale}px`,
          height: `${targetStageHeight * stageScale}px`,
        }}
      >
        <div
          className={`stage-canvas-1080p ${stageViewMode === "video_stage" ? "is-scene-mode" : "is-grid-mode"}`}
          style={{
            width: `${targetStageWidth}px`,
            height: `${targetStageHeight}px`,
            transform: `scale(${stageScale})`,
            transformOrigin: "top left",
          }}
        >
          <StageCanvasBackdrop
            viewMode={stageViewMode}
            previewHtml={previewHtml}
            pendingPreviewHtml={pendingPreviewHtml}
            previewLoading={previewLoading}
            previewError={previewError}
            iframeKey={iframeKey}
            width={targetStageWidth}
            height={targetStageHeight}
            loadingLabel={t("stageStudio.loadingBackground")}
            updatingLabel={t("stageStudio.updatingPreview")}
            errorLabel={t("stageStudio.previewLoadFailed")}
            retryLabel={t("stageStudio.retryPreview")}
            onRetry={retryPreview}
            onPendingPreviewLoad={verifyPendingPreview}
          />
          <StageCanvasGuides
            showGuides={showGuides}
            showSafeMargins={showSafeMargins}
            stageHeight={targetStageHeight}
            baselineLabel={t("stageStudio.groundBaselineLabel")}
            actionSafeLabel={t("stageStudio.actionSafeLabel")}
            titleSafeLabel={t("stageStudio.titleSafeLabel")}
          />

          {/* Transparent editor controls; the visible mascot is rendered inside the canonical V2 iframe. */}
          {isMascotVisibleInCurrentPhase ? (
            <div
              className={`stage-mascot-container anchor-${position} ${isDragging ? "is-dragging" : ""} ${isResizing ? "is-resizing" : ""}`}
              style={
                {
                  zIndex: 40,
                  transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
                  transformOrigin: "bottom center",
                  "--mascot-scale": scale,
                } as React.CSSProperties
              }
              onMouseDown={handleMascotMouseDown}
            >
              <div className="stage-mascot-bounding-box">
                {/* Corner Resize Handles */}
                <div
                  className="transform-handle handle-tl"
                  onMouseDown={handleResizeHandleMouseDown}
                  title={t("stageStudio.dragToResizeTooltip")}
                />
                <div
                  className="transform-handle handle-tr"
                  onMouseDown={handleResizeHandleMouseDown}
                  title={t("stageStudio.dragToResizeTooltip")}
                />
                <div
                  className="transform-handle handle-bl"
                  onMouseDown={handleResizeHandleMouseDown}
                  title={t("stageStudio.dragToResizeTooltip")}
                />
                <div
                  className="transform-handle handle-br"
                  onMouseDown={handleResizeHandleMouseDown}
                  title={t("stageStudio.dragToResizeTooltip")}
                />

                {/* Real-time Coordinate & Scale HUD Pill */}
                <div className="stage-mascot-hud">
                  <Crosshair size={11} weight="bold" />
                  <span>
                    X: {offsetX > 0 ? `+${offsetX}` : offsetX}px · Y: {offsetY > 0 ? `+${offsetY}` : offsetY}px · {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Subtle silhouette indicator when Mascot is toggled OFF in current phase */
            <div
              className={`stage-mascot-hidden-indicator anchor-${position}`}
              style={{
                transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
                transformOrigin: "bottom center",
              }}
            >
              <div className="hidden-indicator-pill">
                <EyeSlash size={13} />
                <span>{t("stageStudio.hiddenInPhase", { phase: scenarioPhase.toUpperCase() })}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
