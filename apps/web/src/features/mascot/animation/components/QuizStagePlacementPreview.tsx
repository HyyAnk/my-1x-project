import type { MascotPublishedAnimationAsset, MascotPlacementV2 } from "@studio/shared";
import { MockStageOverlay, StageGuidesOverlay, StagePreviewControls, StageMascotOverlay } from "./stagePreview";
import { useStagePreviewViewport } from "../hooks/useStagePreviewViewport";

export interface QuizStagePlacementPreviewProps {
  animation?: MascotPublishedAnimationAsset | null;
  fallbackImageUrl?: string;
  timeSeconds: number;
  placement: MascotPlacementV2;
  canvasZoom?: number;
  showGuides?: boolean;
  aspectRatio?: "16:9" | "9:16";
  onAspectRatioChange?: (aspectRatio: "16:9" | "9:16") => void;
  onToggleGuides?: (showGuides: boolean) => void;
  showControls?: boolean;
}

export function QuizStagePlacementPreview({
  animation,
  fallbackImageUrl,
  timeSeconds,
  placement,
  canvasZoom = 1.0,
  showGuides = false,
  aspectRatio = "16:9",
  onAspectRatioChange,
  onToggleGuides,
  showControls = false,
}: QuizStagePlacementPreviewProps) {
  const viewport = useStagePreviewViewport(aspectRatio);
  return (
    <div
      ref={viewport.viewportRef}
      className="quiz-stage-preview-viewport"
      data-testid="quiz-stage-preview"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: aspectRatio === "9:16" ? "9 / 16" : "16 / 9",
        borderRadius: "var(--radius, 12px)",
        overflow: "hidden",
        backgroundColor: "#0b0f19",
        border: "1px solid var(--line, rgba(255,255,255,0.1))",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div
        data-testid="mascot-logical-stage"
        style={{
          position: "absolute",
          width: viewport.width,
          height: viewport.height,
          transform: `scale(${viewport.scale * canvasZoom})`,
          transformOrigin: "0 0",
        }}
      >
        <MockStageOverlay aspectRatio={aspectRatio} />
        <StageGuidesOverlay showGuides={showGuides} aspectRatio={aspectRatio} />
        <StageMascotOverlay
          animation={animation}
          fallbackImageUrl={fallbackImageUrl}
          timeSeconds={timeSeconds}
          placement={placement}
          aspectRatio={aspectRatio}
        />
      </div>

      {showControls && (
        <StagePreviewControls
          aspectRatio={aspectRatio}
          onAspectRatioChange={onAspectRatioChange}
          showGuides={showGuides}
          onToggleGuides={onToggleGuides}
          style={{ position: "absolute", top: "12px", right: "12px" }}
        />
      )}
    </div>
  );
}
