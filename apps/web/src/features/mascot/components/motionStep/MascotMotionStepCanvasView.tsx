import type { MascotPlacementV2, MascotPublishedAnimationAsset } from "@studio/shared";
import { ManifestFrameCanvas, QuizStagePlacementPreview } from "../../animation";
import type { CanvasBackgroundMode } from "./MascotMotionStepToolbar";

export interface MascotMotionStepCanvasViewProps {
  previewMode: "canvas" | "stage";
  animation: MascotPublishedAnimationAsset | null;
  fallbackImageUrl?: string;
  timeSeconds: number;
  isPlaying: boolean;
  isLooping: boolean;
  canvasBackground: CanvasBackgroundMode;
  canvasZoom: number;
  flipHorizontal: boolean;
  placement: MascotPlacementV2;
  showGuides: boolean;
}

export function MascotMotionStepCanvasView({
  previewMode,
  animation,
  fallbackImageUrl,
  timeSeconds,
  isPlaying,
  isLooping,
  canvasBackground,
  canvasZoom,
  flipHorizontal,
  placement,
  showGuides,
}: MascotMotionStepCanvasViewProps) {
  if (previewMode === "stage") {
    return (
      <QuizStagePlacementPreview
        animation={animation}
        fallbackImageUrl={fallbackImageUrl}
        timeSeconds={timeSeconds}
        placement={placement}
        canvasZoom={canvasZoom}
        showGuides={showGuides}
      />
    );
  }

  return (
    <ManifestFrameCanvas
      animation={animation}
      fallbackImageUrl={fallbackImageUrl}
      timeSeconds={timeSeconds}
      isPlaying={isPlaying}
      isLooping={isLooping}
      canvasBackground={canvasBackground}
      canvasZoom={canvasZoom}
      flipHorizontal={flipHorizontal}
    />
  );
}
