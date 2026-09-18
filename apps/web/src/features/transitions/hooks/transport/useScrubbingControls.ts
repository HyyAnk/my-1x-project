import { useRef, useCallback, useEffect } from "react";
import { frameIndexToPts, ptsToSeconds } from "../../utils/transitionFramePosition";
import type { UseScrubbingControlsOptions, UseScrubbingControlsResult } from "./transport.types";

/**
 * Hook to manage timeline frame seeking, stepping forward/backward,
 * and review window boundary clamping.
 */
export function useScrubbingControls({
  artifact,
  videoRef,
  currentFrameIndex,
  pause,
  loadAuthoritativeFrame,
}: UseScrubbingControlsOptions): UseScrubbingControlsResult {
  const seekTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  const seekToFrame = useCallback(
    (index: number) => {
      if (!artifact) return;

      const first = artifact.manifest.reviewWindow.firstFrame;
      const last = artifact.manifest.reviewWindow.lastFrameInclusive;
      const clamped = Math.max(first, Math.min(last, index));

      pause();

      if (videoRef.current) {
        const time = ptsToSeconds(frameIndexToPts(clamped, artifact.manifest.frames), artifact.manifest.timeBase);
        videoRef.current.currentTime = time;
      }

      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }

      seekTimeoutRef.current = window.setTimeout(() => {
        void loadAuthoritativeFrame(clamped, artifact.artifactId);
      }, 40);
    },
    [artifact, videoRef, pause, loadAuthoritativeFrame],
  );

  const stepForward = useCallback(() => {
    if (!artifact) return;
    seekToFrame(currentFrameIndex + 1);
  }, [artifact, currentFrameIndex, seekToFrame]);

  const stepBackward = useCallback(() => {
    if (!artifact) return;
    seekToFrame(currentFrameIndex - 1);
  }, [artifact, currentFrameIndex, seekToFrame]);

  return {
    seekToFrame,
    stepForward,
    stepBackward,
  };
}
