import { useCallback, useEffect, useRef } from "react";
import { getSandboxPhaseAtTime, type SandboxPhase, type SandboxPhaseTimeline } from "@studio/shared";

export interface UseSandboxPlaybackLoopOptions {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isPlayingRef?: React.MutableRefObject<boolean>;
  timelineSecondsRef: React.MutableRefObject<number>;
  setTimelineSeconds: React.Dispatch<React.SetStateAction<number>>;
  setPhase: (phase: SandboxPhase) => void;
  totalDuration: number;
  timeline?: SandboxPhaseTimeline;
  seekIframe: (time: number) => void;
  playIframe: (time?: number) => void;
  pauseIframe: () => void;
  evaluateAndPlayCues: (prevSec: number, nextSec: number) => void;
  clearFiredCues: () => void;
  stopAudio: () => void;
}

/**
 * Manages requestAnimationFrame and setTimeout lifecycle for continuous playback
 * and animated preview rehearsal loops.
 */
export function useSandboxPlaybackLoop({
  isPlaying,
  setIsPlaying,
  isPlayingRef,
  timelineSecondsRef,
  setTimelineSeconds,
  setPhase,
  totalDuration,
  timeline,
  seekIframe,
  playIframe,
  pauseIframe,
  evaluateAndPlayCues,
  clearFiredCues,
  stopAudio,
}: UseSandboxPlaybackLoopOptions) {
  const rehearsalRafRef = useRef<number | null>(null);
  const rehearsalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelRehearsalAnimation = useCallback(() => {
    if (rehearsalRafRef.current !== null) {
      cancelAnimationFrame(rehearsalRafRef.current);
      rehearsalRafRef.current = null;
    }
    if (rehearsalTimeoutRef.current !== null) {
      clearTimeout(rehearsalTimeoutRef.current);
      rehearsalTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelRehearsalAnimation();
    };
  }, [cancelRehearsalAnimation]);

  // Main playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      pauseIframe();
      stopAudio();
      return;
    }

    playIframe(timelineSecondsRef.current);

    let animationFrameId: number | null = null;
    let lastStamp: number | null = null;

    const tick = (now: number) => {
      if (lastStamp === null) {
        lastStamp = now;
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      const deltaSec = (now - lastStamp) / 1000;
      lastStamp = now;

      setTimelineSeconds((prev) => {
        const next = Number((prev + deltaSec).toFixed(3));
        timelineSecondsRef.current = next;

        if (next >= totalDuration) {
          clearFiredCues();
          seekIframe(0);
          timelineSecondsRef.current = 0;
          setIsPlaying(false);
          if (isPlayingRef) {
            isPlayingRef.current = false;
          }
          setPhase(getSandboxPhaseAtTime(0, timeline));
          return 0;
        }

        evaluateAndPlayCues(prev, next);
        setPhase(getSandboxPhaseAtTime(next, timeline));
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    timeline,
    clearFiredCues,
    evaluateAndPlayCues,
    isPlaying,
    isPlayingRef,
    pauseIframe,
    playIframe,
    seekIframe,
    setIsPlaying,
    setPhase,
    setTimelineSeconds,
    stopAudio,
    timelineSecondsRef,
    totalDuration,
  ]);

  const startRevealAnimation = useCallback(
    (startSec: number, targetSec: number) => {
      cancelRehearsalAnimation();
      seekIframe(startSec);
      playIframe(startSec);

      const durationMs = Math.round((targetSec - startSec) * 1000);

      let lastStamp: number | null = null;
      const tickRehearsal = (now: number) => {
        if (lastStamp === null) {
          lastStamp = now;
          rehearsalRafRef.current = requestAnimationFrame(tickRehearsal);
          return;
        }
        const deltaSec = (now - lastStamp) / 1000;
        lastStamp = now;

        const next = Number((timelineSecondsRef.current + deltaSec).toFixed(3));
        if (next >= targetSec) {
          timelineSecondsRef.current = targetSec;
          setTimelineSeconds(targetSec);
          seekIframe(targetSec);
          pauseIframe();
          if (rehearsalTimeoutRef.current !== null) {
            clearTimeout(rehearsalTimeoutRef.current);
            rehearsalTimeoutRef.current = null;
          }
          rehearsalRafRef.current = null;
          return;
        }

        timelineSecondsRef.current = next;
        setTimelineSeconds(next);
        rehearsalRafRef.current = requestAnimationFrame(tickRehearsal);
      };

      rehearsalRafRef.current = requestAnimationFrame(tickRehearsal);

      rehearsalTimeoutRef.current = setTimeout(() => {
        if (rehearsalRafRef.current !== null) {
          cancelAnimationFrame(rehearsalRafRef.current);
          rehearsalRafRef.current = null;
        }
        timelineSecondsRef.current = targetSec;
        setTimelineSeconds(targetSec);
        seekIframe(targetSec);
        pauseIframe();
        rehearsalTimeoutRef.current = null;
      }, durationMs);
    },
    [cancelRehearsalAnimation, pauseIframe, playIframe, seekIframe, setTimelineSeconds, timelineSecondsRef],
  );

  return {
    cancelRehearsalAnimation,
    startRevealAnimation,
  };
}

export type SandboxPlaybackLoopState = ReturnType<typeof useSandboxPlaybackLoop>;
