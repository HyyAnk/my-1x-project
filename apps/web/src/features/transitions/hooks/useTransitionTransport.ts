import { useState, useEffect, useRef, useCallback } from "react";
import type { LoadedArtifact } from "../types/transitionPlayer.types";
import {
  formatFrameTime,
  frameIndexToPts,
  ptsToSeconds,
  secondsToFrameIndex,
} from "../utils/transitionFramePosition";
import { getTransitionFrameUrl } from "../services/transitionPreviewApi";

export type UseTransitionTransportOptions = {
  artifact: LoadedArtifact | null;
  autoPlay?: boolean;
  isLooping?: boolean;
  onComplete?: () => void;
  playTrigger?: number;
};

export type UseTransitionTransportResult = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isLooping: boolean;
  currentFrameIndex: number;
  totalFrames: number;
  formattedTime: string;
  authoritativePngUrl: string | null;
  isLoadingFrame: boolean;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekToFrame: (index: number) => void;
  replay: () => void;
  toggleLoop: () => void;
  reviewWindow: { firstFrame: number; lastFrameInclusive: number; boundaryFrame: number } | null;
};

export function useTransitionTransport(
  options: UseTransitionTransportOptions,
): UseTransitionTransportResult {
  const { artifact, autoPlay = false, isLooping: initialLooping = false, onComplete, playTrigger } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(initialLooping);

  const reviewWindow = artifact?.manifest.reviewWindow ?? null;
  const totalFrames = artifact?.manifest.frameCount ?? 0;
  const fpsVal = artifact?.manifest.fps
    ? artifact.manifest.fps.numerator / artifact.manifest.fps.denominator
    : 30;

  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(
    reviewWindow?.firstFrame ?? 0,
  );
  const [authoritativePngUrl, setAuthoritativePngUrl] = useState<string | null>(null);
  const [isLoadingFrame, setIsLoadingFrame] = useState<boolean>(false);

  const requestSequenceRef = useRef<number>(0);
  const seekTimeoutRef = useRef<number | null>(null);

  // Update visible frame image from server
  const loadAuthoritativeFrame = useCallback(
    async (frameIndex: number, artifactId: string) => {
      requestSequenceRef.current += 1;
      const currentSeq = requestSequenceRef.current;

      const url = getTransitionFrameUrl(artifactId, frameIndex);
      setIsLoadingFrame(true);

      try {
        const img = new Image();
        img.src = url;
        await img.decode();

        if (requestSequenceRef.current === currentSeq) {
          setAuthoritativePngUrl(url);
          setCurrentFrameIndex(frameIndex);
          setIsLoadingFrame(false);
        }
      } catch {
        if (requestSequenceRef.current === currentSeq) {
          setIsLoadingFrame(false);
        }
      }
    },
    [],
  );

  // On artifact change: reset position to review window start and fetch initial frame
  useEffect(() => {
    if (!artifact) {
      setAuthoritativePngUrl(null);
      setCurrentFrameIndex(0);
      setIsPlaying(false);
      return;
    }

    const startFrame = artifact.manifest.reviewWindow.firstFrame;
    setCurrentFrameIndex(startFrame);
    void loadAuthoritativeFrame(startFrame, artifact.artifactId);

    if (autoPlay && videoRef.current) {
      const startTime = ptsToSeconds(
        frameIndexToPts(startFrame, artifact.manifest.frames),
        artifact.manifest.timeBase,
      );
      videoRef.current.currentTime = startTime;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked by browser policy
          setIsPlaying(false);
        });
    } else {
      setIsPlaying(false);
    }
  }, [artifact, autoPlay, loadAuthoritativeFrame]);

  const pause = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    setIsPlaying(false);

    if (artifact && videoRef.current) {
      const frameIdx = secondsToFrameIndex(
        videoRef.current.currentTime,
        artifact.manifest.frames,
        artifact.manifest.timeBase,
      );
      void loadAuthoritativeFrame(frameIdx, artifact.artifactId);
    }
  }, [artifact, loadAuthoritativeFrame]);

  const play = useCallback(async () => {
    if (!videoRef.current || !artifact) {
      setIsPlaying(true);
      return;
    }

    // If at or past the end of the review window, replay from review window start
    const endFrame = artifact.manifest.reviewWindow.lastFrameInclusive;
    if (currentFrameIndex >= endFrame) {
      const startFrame = artifact.manifest.reviewWindow.firstFrame;
      const startTime = ptsToSeconds(
        frameIndexToPts(startFrame, artifact.manifest.frames),
        artifact.manifest.timeBase,
      );
      videoRef.current.currentTime = startTime;
    }

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, [artifact, currentFrameIndex]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, pause, play]);

  const seekToFrame = useCallback(
    (index: number) => {
      if (!artifact) return;

      const first = artifact.manifest.reviewWindow.firstFrame;
      const last = artifact.manifest.reviewWindow.lastFrameInclusive;
      const clamped = Math.max(first, Math.min(last, index));

      pause();

      if (videoRef.current) {
        const time = ptsToSeconds(
          frameIndexToPts(clamped, artifact.manifest.frames),
          artifact.manifest.timeBase,
        );
        videoRef.current.currentTime = time;
      }

      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }

      seekTimeoutRef.current = window.setTimeout(() => {
        void loadAuthoritativeFrame(clamped, artifact.artifactId);
      }, 40);
    },
    [artifact, pause, loadAuthoritativeFrame],
  );

  const stepForward = useCallback(() => {
    if (!artifact) return;
    const next = currentFrameIndex + 1;
    seekToFrame(next);
  }, [artifact, currentFrameIndex, seekToFrame]);

  const stepBackward = useCallback(() => {
    if (!artifact) return;
    const prev = currentFrameIndex - 1;
    seekToFrame(prev);
  }, [artifact, currentFrameIndex, seekToFrame]);

  const replay = useCallback(() => {
    if (!artifact) {
      setIsPlaying(true);
      return;
    }
    const startFrame = artifact.manifest.reviewWindow.firstFrame;
    seekToFrame(startFrame);
    void play();
  }, [artifact, seekToFrame, play]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  useEffect(() => {
    if (playTrigger && playTrigger > 0) {
      replay();
    }
  }, [playTrigger, replay]);

  // Monitor video playback time & review window boundary
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !artifact) return;

    const handleTimeUpdate = () => {
      if (!isPlaying) return;

      const currentIdx = secondsToFrameIndex(
        video.currentTime,
        artifact.manifest.frames,
        artifact.manifest.timeBase,
      );
      setCurrentFrameIndex(currentIdx);

      const lastFrame = artifact.manifest.reviewWindow.lastFrameInclusive;
      if (currentIdx >= lastFrame) {
        if (isLooping) {
          const startFrame = artifact.manifest.reviewWindow.firstFrame;
          const startTime = ptsToSeconds(
            frameIndexToPts(startFrame, artifact.manifest.frames),
            artifact.manifest.timeBase,
          );
          video.currentTime = startTime;
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
  }, [artifact, isPlaying, isLooping, pause, replay, onComplete]);

  const formattedTime = formatFrameTime(currentFrameIndex, totalFrames, fpsVal);

  return {
    videoRef,
    isPlaying,
    isLooping,
    currentFrameIndex,
    totalFrames,
    formattedTime,
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
