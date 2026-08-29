import { Crosshair, EyeSlash, Smiley } from "@phosphor-icons/react";
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
    flipHorizontal,
    position,
    scale,
    offsetX,
    offsetY,
    activePose,
    isPlaying,
    isDragging,
    isResizing,
    activeMascot,
    currentSpriteUrl,
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

  const currentActionMeta = activeMascot?.actions[activePose];
  const spriteOffsetX = currentActionMeta?.offset_x || 0;
  const spriteOffsetY = currentActionMeta?.offset_y || 0;

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

          {/* Mascot on Stage (Conditioned on Scene Visibility) */}
          {isMascotVisibleInCurrentPhase ? (
            <div
              className={`stage-mascot-container anchor-${position} ${isDragging ? "is-dragging" : ""} ${isResizing ? "is-resizing" : ""}`}
              style={
                {
                  zIndex: 40,
                  transform: `scale(${scale}) ${flipHorizontal ? "scaleX(-1)" : ""}`,
                  transformOrigin: "bottom center",
                  "--mascot-scale": scale,
                  "--action-offset-x": `${offsetX + spriteOffsetX}px`,
                  "--action-offset-y": `${offsetY + spriteOffsetY}px`,
                } as React.CSSProperties
              }
              onMouseDown={handleMascotMouseDown}
            >
              {/* Transform Bounding Box with Corner Resize Handles */}
              <div
                className="stage-mascot-bounding-box"
                style={{
                  transform: `translate(${offsetX + spriteOffsetX}px, ${offsetY + spriteOffsetY}px)`,
                }}
              >
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

              {/* Mascot Visual Render */}
              {currentSpriteUrl ? (
                <div
                  className={`stage-mascot-sprite ${isPlaying ? `motion-${currentActionMeta?.motion_preset || "breathe"}` : ""}`}
                  style={
                    {
                      backgroundImage: `url(${currentSpriteUrl})`,
                      transform: `translate(${offsetX + spriteOffsetX}px, ${offsetY + spriteOffsetY}px)`,
                      "--action-offset-x": `${offsetX + spriteOffsetX}px`,
                      "--action-offset-y": `${offsetY + spriteOffsetY}px`,
                      "--anim-speed": currentActionMeta?.motion_speed || 1.0,
                      "--anim-intensity":
                        currentActionMeta?.motion_intensity === "subtle"
                          ? 0.35
                          : currentActionMeta?.motion_intensity === "dynamic"
                            ? 2.2
                            : 1.0,
                    } as React.CSSProperties
                  }
                  title={t("stageStudio.dragToRepositionTooltip")}
                />
              ) : (
                <div
                  className="stage-mascot-placeholder-box"
                  style={{
                    transform: `translate(${offsetX + spriteOffsetX}px, ${offsetY + spriteOffsetY}px)`,
                  }}
                >
                  <Smiley size={64} style={{ color: activeMascot?.color_theme || "var(--accent)" }} />
                  <span>{activeMascot?.name || "Mascot"}</span>
                </div>
              )}
            </div>
          ) : (
            /* Subtle silhouette indicator when Mascot is toggled OFF in current phase */
            <div
              className={`stage-mascot-hidden-indicator anchor-${position}`}
              style={{
                transform: `scale(${scale}) translate(${offsetX + spriteOffsetX}px, ${offsetY + spriteOffsetY}px)`,
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
