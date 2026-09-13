import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeSandboxPhaseTimeline,
  getSandboxPhaseAtTime,
  getSandboxPhaseTimestamps,
  SETTLED_SANDBOX_PHASE_TIMESTAMPS,
  type SandboxPhase,
} from "@studio/shared";
import { buildSandboxRehearsalCues, SandboxAudioEngine } from "../utils/sandboxAudioEngine";

export type { SandboxPhase };

export function useSandboxTimelineState() {
  const timeline = useMemo(() => computeSandboxPhaseTimeline(), []);
  const [phase, setPhase] = useState<SandboxPhase>("thinking");
  const [timelineSeconds, setTimelineSeconds] = useState<number>(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useScrubber, setUseScrubber] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const audioEngineRef = useRef<SandboxAudioEngine | null>(null);
  const firedCuesRef = useRef<Set<string>>(new Set());
  const rehearsalRafRef = useRef<number | null>(null);
  const rehearsalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineSecondsRef = useRef(timelineSeconds);
  timelineSecondsRef.current = timelineSeconds;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

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

  // Initialize audio engine once
  if (!audioEngineRef.current && typeof window !== "undefined") {
    audioEngineRef.current = new SandboxAudioEngine();
    void audioEngineRef.current.preloadSfx([
      "ui_pop.wav",
      "countdown_5.wav",
      "countdown_4.wav",
      "countdown_3.wav",
      "countdown_2.wav",
      "countdown_1.wav",
      "countdown_tick.wav",
      "countdown_final.wav",
      "correct_triumph.wav",
      "streak.wav",
    ]);
  }

  const sfxCues = useMemo(() => buildSandboxRehearsalCues(timeline), [timeline]);

  // Ensure cues before initial playhead (3.5s) are marked elapsed on initial mount
  if (firedCuesRef.current.size === 0) {
    for (const cue of sfxCues) {
      if (cue.timeSeconds < timelineSeconds) {
        firedCuesRef.current.add(cue.id);
      }
    }
  }

  const seekIframe = useCallback((time: number) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_SEEK", time }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { seek: (t: number) => void };
      };
      win.__hyperframesRehearsal?.seek(time);
    } catch {
      // Ignored
    }
  }, []);

  const playIframe = useCallback((time?: number) => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_PLAY", time }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { play: (t?: number) => void };
      };
      win.__hyperframesRehearsal?.play(time);
    } catch {
      // Ignored
    }
  }, []);

  const pauseIframe = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_PAUSE" }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { pause: () => void };
      };
      win.__hyperframesRehearsal?.pause();
    } catch {
      // Ignored
    }
  }, []);

  // Main playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      pauseIframe();
      audioEngineRef.current?.stopAll();
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

        if (next >= timeline.totalDuration) {
          // Finished rehearsal run -> loop to 0 or stop
          firedCuesRef.current.clear();
          seekIframe(0);
          timelineSecondsRef.current = 0;
          setIsPlaying(false);
          isPlayingRef.current = false;
          setPhase(getSandboxPhaseAtTime(0));
          return 0;
        }

        // Trigger SFX cues with calibrated tolerance window
        for (const cue of sfxCues) {
          if (
            !firedCuesRef.current.has(cue.id) &&
            cue.timeSeconds >= prev - 0.015 &&
            cue.timeSeconds <= next + 0.015
          ) {
            firedCuesRef.current.add(cue.id);
            audioEngineRef.current?.playSfx(cue.filename, cue.volume);
          }
        }

        setPhase(getSandboxPhaseAtTime(next));
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
  }, [isPlaying, pauseIframe, playIframe, seekIframe, sfxCues, timeline.totalDuration]);

  const handlePhaseChange = useCallback(
    (newPhase: SandboxPhase, options?: { previewAnimation?: boolean }) => {
      cancelRehearsalAnimation();
      setUseScrubber(false);
      setPhase(newPhase);

      // Lively animated preview when reveal phase is selected with previewAnimation
      if (newPhase === "reveal" && options?.previewAnimation) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        audioEngineRef.current?.stopAll();

        const startSec = timeline.revealStart;
        const targetSec = SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal;

        timelineSecondsRef.current = startSec;
        setTimelineSeconds(startSec);

        // Reset cues ahead of revealStart and mark prior cues elapsed
        for (const cue of sfxCues) {
          if (cue.timeSeconds > startSec) {
            firedCuesRef.current.delete(cue.id);
          } else {
            firedCuesRef.current.add(cue.id);
          }
        }

        // Trigger reveal SFX cleanly at revealStart in harmony with correct-card-reveal
        audioEngineRef.current?.getContext();
        audioEngineRef.current?.playRevealSfx("correct");
        firedCuesRef.current.add("answer-reveal");
        firedCuesRef.current.add("cd-final");

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

        return;
      }

      setIsPlaying(false);
      isPlayingRef.current = false;

      const timestamps = getSandboxPhaseTimestamps();
      const targetTime =
        timestamps.find((t) => t.id === newPhase)?.time ?? SETTLED_SANDBOX_PHASE_TIMESTAMPS[newPhase] ?? 0;
      timelineSecondsRef.current = targetTime;
      setTimelineSeconds(targetTime);
      seekIframe(targetTime);
      pauseIframe();
      audioEngineRef.current?.stopAll();

      // Reset cues that are ahead of targetTime and mark elapsed cues
      for (const cue of sfxCues) {
        if (cue.timeSeconds >= targetTime) {
          firedCuesRef.current.delete(cue.id);
        } else {
          firedCuesRef.current.add(cue.id);
        }
      }
    },
    [cancelRehearsalAnimation, pauseIframe, playIframe, seekIframe, sfxCues, timeline.revealStart],
  );

  const handleScrubberChange = useCallback(
    (seconds: number) => {
      cancelRehearsalAnimation();
      setUseScrubber(true);
      const clamped = Math.max(0, Math.min(timeline.totalDuration, Number(seconds.toFixed(2))));
      timelineSecondsRef.current = clamped;
      setTimelineSeconds(clamped);
      setPhase(getSandboxPhaseAtTime(clamped));
      seekIframe(clamped);

      if (isPlayingRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
      pauseIframe();
      audioEngineRef.current?.stopAll();

      // Adjust fired cues based on scrubbed position: reset cues ahead, mark elapsed cues
      for (const cue of sfxCues) {
        if (cue.timeSeconds >= clamped) {
          firedCuesRef.current.delete(cue.id);
        } else {
          firedCuesRef.current.add(cue.id);
        }
      }
    },
    [cancelRehearsalAnimation, pauseIframe, seekIframe, sfxCues, timeline.totalDuration],
  );

  const handleTogglePlay = useCallback(() => {
    cancelRehearsalAnimation();
    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      if (next) {
        audioEngineRef.current?.getContext();
        let startTime = timelineSecondsRef.current;
        if (startTime >= timeline.totalDuration - 0.1) {
          startTime = 0;
          timelineSecondsRef.current = 0;
          setTimelineSeconds(0);
          setPhase(getSandboxPhaseAtTime(0));
          seekIframe(0);
          firedCuesRef.current.clear();
        } else {
          // If starting around thinking snapshot time, snap to thinkingStart so tick 5 is guaranteed to play
          const isThinkingSettled =
            Math.abs(startTime - SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking) < 0.25 ||
            (phase === "thinking" && Math.abs(startTime - 3.5) < 0.3);
          if (isThinkingSettled) {
            startTime = timeline.thinkingStart;
            timelineSecondsRef.current = startTime;
            setTimelineSeconds(startTime);
            setPhase(getSandboxPhaseAtTime(startTime));
          } else {
            // If starting around reveal settled time (8.1s) and phase is reveal, snap to revealStart
            const isRevealSettled =
              Math.abs(startTime - SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal) < 0.15 && phase === "reveal";
            if (isRevealSettled) {
              startTime = timeline.revealStart;
              timelineSecondsRef.current = startTime;
              setTimelineSeconds(startTime);
              setPhase(getSandboxPhaseAtTime(startTime));
            }
          }
          seekIframe(startTime);
          for (const cue of sfxCues) {
            if (cue.timeSeconds >= startTime) {
              firedCuesRef.current.delete(cue.id);
            } else {
              firedCuesRef.current.add(cue.id);
            }
          }
        }
      }
      return next;
    });
  }, [cancelRehearsalAnimation, phase, seekIframe, sfxCues, timeline.revealStart, timeline.thinkingStart, timeline.totalDuration]);

  const rehearseReveal = useCallback(() => {
    handlePhaseChange("reveal", { previewAnimation: true });
  }, [handlePhaseChange]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    audioEngineRef.current?.setMuted(muted);
  }, []);

  return {
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
