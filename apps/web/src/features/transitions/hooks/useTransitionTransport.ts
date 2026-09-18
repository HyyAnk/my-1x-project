import { useState, useEffect, useRef, useCallback } from "react";
import { formatFrameTime, frameIndexToPts, ptsToSeconds } from "../utils/transitionFramePosition";
import { useAuthoritativeFrameLoader, usePlaybackControls, useScrubbingControls, useVideoPlaybackSync } from "./transport";
import type { UseTransitionTransportOptions, UseTransitionTransportResult } from "./transport/transport.types";

export type { UseTransitionTransportOptions, UseTransitionTransportResult };

export function useTransitionTransport(options: UseTransitionTransportOptions): UseTransitionTransportResult {
  const { artifact, autoPlay = false, isLooping: initialLooping = false, onComplete, playTrigger } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewWindow = artifact?.manifest.reviewWindow ?? null;
  const totalFrames = artifact?.manifest.frameCount ?? 0;
  const fps = artifact?.manifest.fps ? artifact.manifest.fps.numerator / artifact.manifest.fps.denominator : 30;

  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(reviewWindow?.firstFrame ?? 0);

  const { authoritativePngUrl, isLoadingFrame, loadAuthoritativeFrame, clearAuthoritativeFrame } = useAuthoritativeFrameLoader({
    onFrameLoaded: setCurrentFrameIndex,
  });

  const { isPlaying, isLooping, play, pause, togglePlay, toggleLoop, setIsPlaying } = usePlaybackControls({
    artifact,
    videoRef,
    currentFrameIndex,
    initialLooping,
    loadAuthoritativeFrame,
  });

  const { seekToFrame, stepForward, stepBackward } = useScrubbingControls({
    artifact,
    videoRef,
    currentFrameIndex,
    pause,
    loadAuthoritativeFrame,
  });

  const replay = useCallback(() => {
    if (!artifact) {
      setIsPlaying(true);
      return;
    }
    seekToFrame(artifact.manifest.reviewWindow.firstFrame);
    void play();
  }, [artifact, seekToFrame, play, setIsPlaying]);

  useEffect(() => {
    if (!artifact) {
      clearAuthoritativeFrame();
      setCurrentFrameIndex(0);
      setIsPlaying(false);
      return;
    }

    const start = artifact.manifest.reviewWindow.firstFrame;
    setCurrentFrameIndex(start);
    void loadAuthoritativeFrame(start, artifact.artifactId);

    if (autoPlay && videoRef.current) {
      videoRef.current.currentTime = ptsToSeconds(frameIndexToPts(start, artifact.manifest.frames), artifact.manifest.timeBase);
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setIsPlaying(false);
    }
  }, [artifact, autoPlay, clearAuthoritativeFrame, loadAuthoritativeFrame, setIsPlaying]);

  useEffect(() => {
    if (playTrigger && playTrigger > 0) replay();
  }, [playTrigger, replay]);

  useVideoPlaybackSync({
    videoRef,
    artifact,
    isPlaying,
    isLooping,
    pause,
    replay,
    onComplete,
    onFrameChange: setCurrentFrameIndex,
  });

  return {
    videoRef,
    isPlaying,
    isLooping,
    currentFrameIndex,
    totalFrames,
    formattedTime: formatFrameTime(currentFrameIndex, totalFrames, fps),
    authoritativePngUrl,
    isLoadingFrame,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    seekToFrame,
    replay,
    toggleLoop,
    reviewWindow,
  };
}
