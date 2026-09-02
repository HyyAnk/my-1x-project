import { useCallback, useEffect, useRef, useState } from "react";
import { computeSandboxPhaseTimeline, getSandboxPhaseAtTime, getSandboxPhaseTimestamps, type SandboxPhase } from "@studio/shared";
import { buildSandboxRehearsalCues, SandboxAudioEngine } from "../utils/sandboxAudioEngine";

export type { SandboxPhase };

export function useSandboxTimelineState() {
  const timeline = computeSandboxPhaseTimeline();
  const [phase, setPhase] = useState<SandboxPhase>("thinking");
  const [timelineSeconds, setTimelineSeconds] = useState(3.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useScrubber, setUseScrubber] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const audioEngineRef = useRef<SandboxAudioEngine | null>(null);
  const firedCuesRef = useRef<Set<string>>(new Set());

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

  const sfxCues = buildSandboxRehearsalCues(timeline);

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

    playIframe(timelineSeconds);

    let animationFrameId: number | null = null;
    let lastStamp = performance.now();

    const tick = (now: number) => {
      const deltaSec = (now - lastStamp) / 1000;
      lastStamp = now;

      setTimelineSeconds((prev) => {
        const next = Number((prev + deltaSec).toFixed(3));
        if (next >= timeline.totalDuration) {
          // Finished rehearsal run -> loop to 0 or stop
          firedCuesRef.current.clear();
          seekIframe(0);
          setIsPlaying(false);
          setPhase(getSandboxPhaseAtTime(0));
          return 0;
        }

        // Trigger SFX cues
        for (const cue of sfxCues) {
          if (!firedCuesRef.current.has(cue.id) && prev <= cue.timeSeconds && next >= cue.timeSeconds) {
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
  }, [isPlaying, pauseIframe, playIframe, seekIframe, sfxCues, timeline.totalDuration, timelineSeconds]);

  const handlePhaseChange = useCallback(
    (newPhase: SandboxPhase) => {
      setUseScrubber(false);
      setIsPlaying(false);
      setPhase(newPhase);

      const timestamps = getSandboxPhaseTimestamps();
      let targetTime = timestamps.find((t) => t.id === newPhase)?.time ?? 0;
      if (newPhase === "thinking") {
        targetTime = timeline.thinkingStart;
      }
      setTimelineSeconds(targetTime);
      seekIframe(targetTime);
      pauseIframe();

      // Reset cues that are ahead of targetTime
      for (const cue of sfxCues) {
        if (cue.timeSeconds >= targetTime) {
          firedCuesRef.current.delete(cue.id);
        } else {
          firedCuesRef.current.add(cue.id);
        }
      }
    },
    [pauseIframe, seekIframe, sfxCues, timeline.thinkingStart],
  );

  const handleScrubberChange = useCallback(
    (seconds: number) => {
      setUseScrubber(true);
      const clamped = Math.max(0, Math.min(timeline.totalDuration, Number(seconds.toFixed(2))));
      setTimelineSeconds(clamped);
      setPhase(getSandboxPhaseAtTime(clamped));
      seekIframe(clamped);

      // Adjust fired cues based on scrubbed position
      for (const cue of sfxCues) {
        if (cue.timeSeconds >= clamped) {
          firedCuesRef.current.delete(cue.id);
        } else {
          firedCuesRef.current.add(cue.id);
        }
      }
    },
    [seekIframe, sfxCues, timeline.totalDuration],
  );

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        let startTime = timelineSeconds;
        if (startTime >= timeline.totalDuration - 0.1) {
          startTime = 0;
          setTimelineSeconds(0);
          seekIframe(0);
          firedCuesRef.current.clear();
        } else {
          // If starting around thinking snapshot time, snap to thinkingStart so tick 5 is guaranteed to play
          if (phase === "thinking" && Math.abs(startTime - 3.5) < 0.25) {
            startTime = timeline.thinkingStart;
            setTimelineSeconds(timeline.thinkingStart);
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
  }, [phase, seekIframe, sfxCues, timeline.thinkingStart, timeline.totalDuration, timelineSeconds]);

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
    totalDuration: timeline.totalDuration,
    isMuted,
    toggleMute,
    setMuted,
    iframeRef,
    seekIframe,
    playIframe,
    pauseIframe,
  };
}

export type SandboxTimelineState = ReturnType<typeof useSandboxTimelineState>;
