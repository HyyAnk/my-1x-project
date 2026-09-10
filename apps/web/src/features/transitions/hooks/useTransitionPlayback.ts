import { useCallback, useEffect, useRef, useState } from "react";
import type { TransitionPlaybackState, UseTransitionPlaybackOptions } from "../types/transitionPreview.types";

/**
 * Custom hook managing playback lifecycle, RAF tick, loop, and scrubbing.
 */
export function useTransitionPlayback({
  durationSeconds,
  autoPlay = false,
  isLooping: initialLooping = false,
  onComplete,
  playTrigger,
  progress: externalProgress,
  onProgressChange,
  isPlaying: externalIsPlaying,
  onPlayingChange,
  onLoopingChange,
}: UseTransitionPlaybackOptions): TransitionPlaybackState {
  const [isPlaying, setIsPlaying] = useState(externalIsPlaying ?? autoPlay);
  const [progress, setProgress] = useState(externalProgress ?? 0);
  const [isLooping, setIsLooping] = useState(initialLooping);

  const startTimeRef = useRef<number | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;

  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  const onLoopingChangeRef = useRef(onLoopingChange);
  onLoopingChangeRef.current = onLoopingChange;

  const durationRef = useRef(durationSeconds);
  durationRef.current = durationSeconds;

  const seek = useCallback((newProgress: number) => {
    const clamped = Math.max(0, Math.min(1, newProgress));
    setProgress(clamped);
    onProgressChangeRef.current?.(clamped);
    if (isPlayingRef.current) {
      const dur = durationRef.current;
      startTimeRef.current = performance.now() - clamped * dur * 1000;
    }
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    onPlayingChangeRef.current?.(false);
    startTimeRef.current = null;
  }, []);

  const play = useCallback(() => {
    if (durationRef.current <= 0) {
      setProgress(1);
      onProgressChangeRef.current?.(1);
      onCompleteRef.current?.();
      return;
    }
    if (progressRef.current >= 1) {
      setProgress(0);
      onProgressChangeRef.current?.(0);
      startTimeRef.current = performance.now();
    } else {
      startTimeRef.current = performance.now() - progressRef.current * durationRef.current * 1000;
    }
    setIsPlaying(true);
    onPlayingChangeRef.current?.(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const replay = useCallback(() => {
    setProgress(0);
    onProgressChangeRef.current?.(0);
    if (durationRef.current <= 0) {
      setProgress(1);
      onProgressChangeRef.current?.(1);
      onCompleteRef.current?.();
      return;
    }
    startTimeRef.current = performance.now();
    setIsPlaying(true);
    onPlayingChangeRef.current?.(true);
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      onLoopingChangeRef.current?.(next);
      return next;
    });
  }, []);

  const playTriggerRef = useRef(playTrigger);
  useEffect(() => {
    if (playTrigger !== undefined && playTrigger !== playTriggerRef.current) {
      playTriggerRef.current = playTrigger;
      replay();
    }
  }, [playTrigger, replay]);

  useEffect(() => {
    if (externalProgress !== undefined && Math.abs(externalProgress - progressRef.current) > 0.0001) {
      setProgress(externalProgress);
      progressRef.current = externalProgress;
      if (isPlayingRef.current) {
        startTimeRef.current = performance.now() - externalProgress * durationRef.current * 1000;
      }
    }
  }, [externalProgress]);

  useEffect(() => {
    if (externalIsPlaying !== undefined && externalIsPlaying !== isPlayingRef.current) {
      if (externalIsPlaying) {
        play();
      } else {
        pause();
      }
    }
  }, [externalIsPlaying, play, pause]);

  useEffect(() => {
    if (!isPlaying) return;

    let rafId: number;

    const tick = (now: number) => {
      const dur = durationRef.current;
      if (dur <= 0) {
        setProgress(1);
        onProgressChangeRef.current?.(1);
        setIsPlaying(false);
        onPlayingChangeRef.current?.(false);
        onCompleteRef.current?.();
        return;
      }

      if (startTimeRef.current === null) {
        startTimeRef.current = now - progressRef.current * dur * 1000;
      }

      const elapsedMs = now - startTimeRef.current;
      const currentSec = elapsedMs / 1000;
      const nextProgress = Math.min(1, currentSec / dur);

      setProgress(nextProgress);
      onProgressChangeRef.current?.(nextProgress);

      if (nextProgress >= 1) {
        if (isLoopingRef.current) {
          startTimeRef.current = now;
          setProgress(0);
          onProgressChangeRef.current?.(0);
          rafId = requestAnimationFrame(tick);
        } else {
          setIsPlaying(false);
          onPlayingChangeRef.current?.(false);
          onCompleteRef.current?.();
        }
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const currentTime = progress * durationSeconds;

  return {
    isPlaying,
    progress,
    currentTime,
    isLooping,
    play,
    pause,
    togglePlay,
    replay,
    seek,
    toggleLoop,
  };
}
