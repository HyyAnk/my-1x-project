import { useCallback, useRef, useState } from "react";
import { computeSandboxPhaseTimeline, getSandboxPhaseAtTime, SETTLED_SANDBOX_PHASE_TIMESTAMPS, type SandboxPhase } from "@studio/shared";
import { useSandboxAudioCues } from "./useSandboxAudioCues";
import { useSandboxIframeBridge } from "./useSandboxIframeBridge";
import { useSandboxPlaybackLoop } from "./useSandboxPlaybackLoop";
import { computePlaybackStartTime, getPhaseTargetTime } from "./useSandboxTimelineHelpers";

export type { SandboxPhase };

export function useSandboxTimelineState() {
  const [timeline, setTimeline] = useState(() => computeSandboxPhaseTimeline());
  const [phase, setPhase] = useState<SandboxPhase>("thinking");
  const [timelineSeconds, setTimelineSeconds] = useState<number>(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useScrubber, setUseScrubber] = useState(false);

  const timelineSecondsRef = useRef(timelineSeconds);
  timelineSecondsRef.current = timelineSeconds;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const { iframeRef, seekIframe, playIframe, pauseIframe } = useSandboxIframeBridge();

  const {
    audioEngineRef,
    firedCuesRef,
    isMuted,
    toggleMute,
    setMuted,
    evaluateAndPlayCues,
    syncCuesToTime,
    resetCuesForReveal,
    clearFiredCues,
    stopAudio,
    ensureAudioContext,
  } = useSandboxAudioCues({ timeline, initialPlayheadSeconds: SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking });

  const { cancelRehearsalAnimation, startRevealAnimation } = useSandboxPlaybackLoop({
    isPlaying,
    setIsPlaying,
    isPlayingRef,
    timelineSecondsRef,
    setTimelineSeconds,
    setPhase,
    totalDuration: timeline.totalDuration,
    timeline,
    seekIframe,
    playIframe,
    pauseIframe,
    evaluateAndPlayCues,
    clearFiredCues,
    stopAudio,
  });

  const handlePhaseChange = useCallback(
    (newPhase: SandboxPhase, options?: { previewAnimation?: boolean }) => {
      cancelRehearsalAnimation();
      setUseScrubber(false);
      setPhase(newPhase);
      setIsPlaying(false);
      isPlayingRef.current = false;
      stopAudio();

      if (newPhase === "reveal" && options?.previewAnimation) {
        const startSec = timeline.revealStart;
        timelineSecondsRef.current = startSec;
        setTimelineSeconds(startSec);
        resetCuesForReveal(startSec);
        startRevealAnimation(startSec, Math.min(timeline.explainStart, startSec + 0.63));
        return;
      }

      const targetTime = getPhaseTargetTime(newPhase, timeline);
      timelineSecondsRef.current = targetTime;
      setTimelineSeconds(targetTime);
      seekIframe(targetTime);
      pauseIframe();
      syncCuesToTime(targetTime);
    },
    [cancelRehearsalAnimation, pauseIframe, resetCuesForReveal, seekIframe, startRevealAnimation, stopAudio, syncCuesToTime, timeline],
  );

  const handleScrubberChange = useCallback(
    (seconds: number) => {
      cancelRehearsalAnimation();
      setUseScrubber(true);
      const clamped = Math.max(0, Math.min(timeline.totalDuration, Number(seconds.toFixed(2))));
      timelineSecondsRef.current = clamped;
      setTimelineSeconds(clamped);
      setPhase(getSandboxPhaseAtTime(clamped, timeline));
      seekIframe(clamped);
      setIsPlaying(false);
      isPlayingRef.current = false;
      pauseIframe();
      stopAudio();
      syncCuesToTime(clamped);
    },
    [cancelRehearsalAnimation, pauseIframe, seekIframe, stopAudio, syncCuesToTime, timeline],
  );

  const handleTogglePlay = useCallback(() => {
    cancelRehearsalAnimation();
    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      if (next) {
        ensureAudioContext();
        const { startTime, isLoopRestart } = computePlaybackStartTime(timelineSecondsRef.current, phase, timeline);
        timelineSecondsRef.current = startTime;
        setTimelineSeconds(startTime);
        setPhase(getSandboxPhaseAtTime(startTime, timeline));
        seekIframe(startTime);
        if (isLoopRestart) clearFiredCues();
        else syncCuesToTime(startTime);
      }
      return next;
    });
  }, [cancelRehearsalAnimation, clearFiredCues, ensureAudioContext, phase, seekIframe, syncCuesToTime, timeline]);

  const rehearseReveal = useCallback(() => handlePhaseChange("reveal", { previewAnimation: true }), [handlePhaseChange]);

  return {
    setTimeline,
    phase,
    setPhase,
    timelineSeconds,
    setTimelineSeconds,
    isPlaying,
    setIsPlaying,
    handleTogglePlay,
    useScrubber,
    setUseScrubber,
    handlePhaseChange,
    handleScrubberChange,
    rehearseReveal,
    totalDuration: timeline.totalDuration,
    isMuted,
    toggleMute,
    setMuted,
    iframeRef,
    seekIframe,
    playIframe,
    pauseIframe,
    audioEngineRef,
    firedCuesRef,
  };
}

export type SandboxTimelineState = ReturnType<typeof useSandboxTimelineState>;
