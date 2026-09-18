import { useState, useCallback } from "react";
import { frameIndexToPts, ptsToSeconds, secondsToFrameIndex } from "../../utils/transitionFramePosition";
import type { UsePlaybackControlsOptions, UsePlaybackControlsResult } from "./transport.types";

/**
 * Hook to manage playback state (play, pause, togglePlay, replay, loop)
 * and synchronization with video element.
 */
export function usePlaybackControls({
  artifact,
  videoRef,
  currentFrameIndex,
  initialLooping = false,
  loadAuthoritativeFrame,
  seekToFrame,
}: UsePlaybackControlsOptions): UsePlaybackControlsResult {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(initialLooping);

  const pause = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    setIsPlaying(false);

    if (artifact && videoRef.current) {
      const idx = secondsToFrameIndex(videoRef.current.currentTime, artifact.manifest.frames, artifact.manifest.timeBase);
      void loadAuthoritativeFrame(idx, artifact.artifactId);
    }
  }, [artifact, videoRef, loadAuthoritativeFrame]);

  const play = useCallback(async () => {
    if (!videoRef.current || !artifact) {
      setIsPlaying(true);
      return;
    }

    const { firstFrame, lastFrameInclusive } = artifact.manifest.reviewWindow;
    if (currentFrameIndex >= lastFrameInclusive) {
      videoRef.current.currentTime = ptsToSeconds(frameIndexToPts(firstFrame, artifact.manifest.frames), artifact.manifest.timeBase);
    }

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, [artifact, videoRef, currentFrameIndex]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, pause, play]);

  const replay = useCallback(() => {
    if (!artifact) {
      setIsPlaying(true);
      return;
    }
    seekToFrame?.(artifact.manifest.reviewWindow.firstFrame);
    void play();
  }, [artifact, seekToFrame, play]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  return {
    isPlaying,
    isLooping,
    setIsPlaying,
    play,
    pause,
    togglePlay,
    replay,
    toggleLoop,
  };
}
