import type { TransitionAspectRatio } from "../../transitions/types/transitionPreview.types";
import { TransitionPreviewPlayer } from "../../transitions/components/TransitionPreviewPlayer";
import type { useSandboxTransitionState } from "../hooks/useSandboxTransitionState";

export interface SandboxTransitionCanvasAreaProps {
  transition: ReturnType<typeof useSandboxTransitionState>;
  aspectRatio: TransitionAspectRatio;
  themeColors: { from: string; to: string };
}

export function SandboxTransitionCanvasArea({
  transition,
  aspectRatio,
  themeColors,
}: SandboxTransitionCanvasAreaProps) {
  return (
    <div
      className="sandbox-transition-canvas-area"
      data-testid="sandbox-transition-canvas-area"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#060911",
        borderRadius: "16px",
        border: "1px solid var(--line)",
        padding: "24px",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TransitionPreviewPlayer
          transitionType={transition.transitionId}
          durationSeconds={transition.transitionDuration}
          aspectRatio={aspectRatio}
          themeColors={themeColors}
          onDurationChange={transition.setTransitionDuration}
          onTransitionChange={transition.setTransitionId}
          progress={transition.transitionProgress}
          onProgressChange={transition.setTransitionProgress}
          isPlaying={transition.isPlaying}
          onPlayingChange={transition.setIsPlaying}
          isLooping={transition.isLooping}
          onLoopingChange={transition.setIsLooping}
          playTrigger={transition.playTrigger}
          onTogglePlay={transition.togglePlay}
          onReplay={transition.triggerPlay}
          onToggleLoop={transition.toggleLoop}
        />
      </div>
    </div>
  );
}
