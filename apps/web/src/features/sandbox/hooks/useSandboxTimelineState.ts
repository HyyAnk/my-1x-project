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

  const playIframe = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "REHEARSAL_PLAY" }, "*");
      const win = frame.contentWindow as unknown as {
        __hyperframesRehearsal?: { play: () => void };
      };
      win.__hyperframesRehearsal?.play();
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

    playIframe();

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
  }, [isPlaying, pauseIframe, playIframe, seekIframe, sfxCues, timeline.totalDuration]);

  const handlePhaseChange = useCallback(
    (newPhase: SandboxPhase) => {
      setUseScrubber(false);
      setIsPlaying(false);
      setPhase(newPhase);

      const timestamps = getSandboxPhaseTimestamps();
      const targetTime = timestamps.find((t) => t.id === newPhase)?.time ?? 0;
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
    [pauseIframe, seekIframe, sfxCues],
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
        if (timelineSeconds >= timeline.totalDuration - 0.1) {
          setTimelineSeconds(0);
          seekIframe(0);
          firedCuesRef.current.clear();
        } else {
          seekIframe(timelineSeconds);
        }
      }
      return next;
    });
  }, [seekIframe, timeline.totalDuration, timelineSeconds]);

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
