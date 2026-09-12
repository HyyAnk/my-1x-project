import type { useSandboxTransitionState } from "../hooks/useSandboxTransitionState";
import type { useSandboxViewportState } from "../hooks/useSandboxViewportState";
import type { useSandboxPreviewRenderer } from "../hooks/useSandboxPreviewRenderer";
import type { useSandboxTimelineState } from "../hooks/useSandboxTimelineState";
import { SandboxTransitionCanvasArea } from "./SandboxTransitionCanvasArea";
import { SandboxPreviewCanvas } from "./SandboxPreviewCanvas";

export interface SandboxCanvasAreaProps {
  isTransitionMode: boolean;
  transition: ReturnType<typeof useSandboxTransitionState>;
  viewport: ReturnType<typeof useSandboxViewportState>;
  preview: ReturnType<typeof useSandboxPreviewRenderer>;
  timeline: ReturnType<typeof useSandboxTimelineState>;
  themeColors: { from: string; to: string };
}

export function SandboxCanvasArea({
  isTransitionMode,
  transition,
  viewport,
  preview,
  timeline,
  themeColors,
}: SandboxCanvasAreaProps) {
  if (isTransitionMode) {
    return (
      <SandboxTransitionCanvasArea
        transition={transition}
        aspectRatio={viewport.aspectRatio}
        themeColors={themeColors}
      />
    );
  }

  return (
    <SandboxPreviewCanvas
      containerRef={viewport.containerRef}
      contrastReport={preview.contrastReport}
      lastRenderTime={preview.lastRenderTime}
      showSafeArea={viewport.showSafeArea}
      setShowSafeArea={viewport.setShowSafeArea}
      showShortsGuide={viewport.showShortsGuide}
      setShowShortsGuide={viewport.setShowShortsGuide}
      aspectRatio="16:9"
      iframeKey={preview.iframeKey}
      setIframeKey={preview.setIframeKey}
      zoom={viewport.zoom}
      setZoom={viewport.setZoom}
      scaleFactor={viewport.scaleFactor}
      previewHtml={preview.previewHtml}
      pendingPreviewHtml={preview.pendingPreviewHtml}
      loading={preview.loading}
      previewError={preview.previewError}
      onPendingPreviewLoad={preview.verifyPendingPreview}
      onRetryPreview={() => void preview.renderPreview()}
      phase={timeline.phase}
      useScrubber={timeline.useScrubber}
      timelineSeconds={timeline.timelineSeconds}
      handlePhaseChange={timeline.handlePhaseChange}
      isPlaying={timeline.isPlaying}
      setIsPlaying={timeline.setIsPlaying}
      handleTogglePlay={timeline.handleTogglePlay}
      setUseScrubber={timeline.setUseScrubber}
      handleScrubberChange={timeline.handleScrubberChange}
      iframeRef={timeline.iframeRef}
      isMuted={timeline.isMuted}
      onToggleMute={timeline.toggleMute}
      totalDuration={timeline.totalDuration}
    />
  );
}
