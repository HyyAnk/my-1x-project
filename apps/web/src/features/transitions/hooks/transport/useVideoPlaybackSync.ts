import { useEffect } from "react";
import { frameIndexToPts, ptsToSeconds, secondsToFrameIndex } from "../../utils/transitionFramePosition";
import type { UseVideoPlaybackSyncOptions } from "./transport.types";

/**
 * Hook to manage video element playback event listeners (timeupdate, ended),
 * review window boundary enforcement, and loop / completion handling.
 */
export function useVideoPlaybackSync({
  videoRef,
  artifact,
  isPlaying,
  isLooping,
  pause,
  replay,
  onComplete,
  onFrameChange,
}: UseVideoPlaybackSyncOptions): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !artifact) return;

    const handleTimeUpdate = () => {
      if (!isPlaying) return;

      const idx = secondsToFrameIndex(video.currentTime, artifact.manifest.frames, artifact.manifest.timeBase);
      onFrameChange(idx);

      if (idx >= artifact.manifest.reviewWindow.lastFrameInclusive) {
        if (isLooping) {
          const start = artifact.manifest.reviewWindow.firstFrame;
          video.currentTime = ptsToSeconds(frameIndexToPts(start, artifact.manifest.frames), artifact.manifest.timeBase);
        } else {
          pause();
          onComplete?.();
        }
      }
    };

    const handleEnded = () => {
      if (isLooping) {
        replay();
      } else {
        pause();
        onComplete?.();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoRef, artifact, isPlaying, isLooping, pause, replay, onComplete, onFrameChange]);
}
