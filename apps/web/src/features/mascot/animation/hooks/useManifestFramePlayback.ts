import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  resolveAnimationFrameAtTime,
  type MascotPublishedAnimationAsset,
  type ResolvedAnimationFrame,
} from "@studio/shared";

export interface UseManifestFramePlaybackOptions {
  animation?: MascotPublishedAnimationAsset | null;
  fps?: number;
  initialLoop?: boolean;
  initialTimeSeconds?: number;
}

export function useManifestFramePlayback(options?: UseManifestFramePlaybackOptions) {
  const { animation } = options || {};
  const fps = options?.fps ?? animation?.fps ?? REQUIRED_FPS;
  const frameCount = animation?.frame_count ?? REQUIRED_FRAME_COUNT;
  const frameDurationSeconds = 1 / fps;
  const frameDurationMs = Math.round(1000 / fps);
  const cycleSeconds = animation?.duration_ms ? animation.duration_ms / 1000 : frameCount / fps;

  const defaultLoop = animation?.loop ?? animation?.state === "thinking";
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(options?.initialLoop ?? defaultLoop);
  const [timeSeconds, setTimeSeconds] = useState(options?.initialTimeSeconds ?? 0);

  // Sync default loop policy when animation state changes
  useEffect(() => {
    if (options?.initialLoop === undefined && animation) {
      setIsLooping(animation.loop ?? animation.state === "thinking");
    }
  }, [animation, options?.initialLoop]);

  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  const resolvedFrame = useMemo<ResolvedAnimationFrame | null>(() => {
    if (!animation) return null;
    return resolveAnimationFrameAtTime(
      {
        ...animation,
        loop: isLooping,
        loop_policy: isLooping ? "loop" : "one_shot_rest",
      },
      timeSeconds,
    );
  }, [animation, isLooping, timeSeconds]);

  const currentFrameIndex = resolvedFrame?.frameIndex ?? 0;

  const stepForward = useCallback(() => {
    setTimeSeconds((prev) => {
      const next = prev + frameDurationSeconds;
      if (next >= cycleSeconds) {
        if (isLoopingRef.current) {
          return 0;
        }
        return cycleSeconds;
      }
      return Number(next.toFixed(3));
    });
  }, [cycleSeconds, frameDurationSeconds]);

  const stepBackward = useCallback(() => {
    setTimeSeconds((prev) => {
      const prevTime = prev - frameDurationSeconds;
      if (prevTime < 0) {
        return isLoopingRef.current ? (frameCount - 1) * frameDurationSeconds : 0;
      }
      return Number(prevTime.toFixed(3));
    });
  }, [frameCount, frameDurationSeconds]);

  const seekFrame = useCallback(
    (frameIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(frameCount - 1, Math.floor(frameIndex)));
      setTimeSeconds(Number((clampedIndex * frameDurationSeconds).toFixed(3)));
    },
    [frameCount, frameDurationSeconds],
  );

  const seekTime = useCallback((seconds: number) => {
    const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    setTimeSeconds(Number(clamped.toFixed(3)));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && timeSeconds >= cycleSeconds && !isLoopingRef.current) {
        setTimeSeconds(0);
      }
      return !prev;
    });
  }, [cycleSeconds, timeSeconds]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  // Frame tick timer at exact FPS
  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setTimeSeconds((prev) => {
        const next = prev + frameDurationSeconds;
        if (next >= cycleSeconds) {
          if (!isLoopingRef.current) {
            setIsPlaying(false);
            return cycleSeconds;
          }
          return 0;
        }
        return Number(next.toFixed(3));
      });
    }, frameDurationMs);

    if (typeof (timer as unknown as { unref?: () => void }).unref === "function") {
      (timer as unknown as { unref: () => void }).unref();
    }

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, frameDurationMs, frameDurationSeconds, cycleSeconds]);

  return {
    isPlaying,
    setIsPlaying,
    isLooping,
    setIsLooping,
    timeSeconds,
    currentFrameIndex,
    resolvedFrame,
    fps,
    frameCount,
    frameDurationMs,
    cycleSeconds,
    togglePlay,
    toggleLoop,
    stepForward,
    stepBackward,
    seekFrame,
    seekTime,
  };
}
