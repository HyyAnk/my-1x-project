import { useCallback, useMemo, useRef, useState } from "react";
import type { SandboxPhaseTimeline } from "@studio/shared";
import { buildSandboxRehearsalCues, SandboxAudioEngine } from "../utils/sandboxAudioEngine";

const DEFAULT_PRELOAD_SFX = [
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
];

export interface UseSandboxAudioCuesOptions {
  timeline: SandboxPhaseTimeline;
  initialPlayheadSeconds?: number;
}

/**
 * Manages audio engine lifecycle, SFX preloading, fired cue tracking,
 * and synchronized sound cue playback.
 */
export function useSandboxAudioCues({ timeline, initialPlayheadSeconds = 3.5 }: UseSandboxAudioCuesOptions) {
  const audioEngineRef = useRef<SandboxAudioEngine | null>(null);
  const firedCuesRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize audio engine once in browser environment
  if (!audioEngineRef.current && typeof window !== "undefined") {
    audioEngineRef.current = new SandboxAudioEngine();
    void audioEngineRef.current.preloadSfx(DEFAULT_PRELOAD_SFX);
  }

  const sfxCues = useMemo(() => buildSandboxRehearsalCues(timeline), [timeline]);

  // Ensure cues before initial playhead are marked elapsed on initial mount
  if (!isInitializedRef.current) {
    isInitializedRef.current = true;
    for (const cue of sfxCues) {
      if (cue.timeSeconds < initialPlayheadSeconds) {
        firedCuesRef.current.add(cue.id);
      }
    }
  }

  const evaluateAndPlayCues = useCallback(
    (prevSec: number, nextSec: number = prevSec) => {
      for (const cue of sfxCues) {
        if (!firedCuesRef.current.has(cue.id) && cue.timeSeconds >= prevSec - 0.015 && cue.timeSeconds <= nextSec + 0.015) {
          firedCuesRef.current.add(cue.id);
          audioEngineRef.current?.playSfx(cue.filename, cue.volume);
        }
      }
    },
    [sfxCues],
  );

  const syncCuesToTime = useCallback(
    (targetTime: number) => {
      for (const cue of sfxCues) {
        if (cue.timeSeconds >= targetTime) {
          firedCuesRef.current.delete(cue.id);
        } else {
          firedCuesRef.current.add(cue.id);
        }
      }
    },
    [sfxCues],
  );

  const resetCuesForReveal = useCallback(
    (startSec: number) => {
      for (const cue of sfxCues) {
        if (cue.timeSeconds > startSec) {
          firedCuesRef.current.delete(cue.id);
        } else {
          firedCuesRef.current.add(cue.id);
        }
      }
      audioEngineRef.current?.getContext();
      audioEngineRef.current?.playRevealSfx("correct");
      firedCuesRef.current.add("answer-reveal");
      firedCuesRef.current.add("cd-final");
    },
    [sfxCues],
  );

  const clearFiredCues = useCallback(() => {
    firedCuesRef.current.clear();
  }, []);

  const stopAudio = useCallback(() => {
    audioEngineRef.current?.stopAll();
  }, []);

  const ensureAudioContext = useCallback(() => {
    return audioEngineRef.current?.getContext();
  }, []);

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
    audioEngineRef,
    firedCuesRef,
    isMuted,
    setIsMuted,
    toggleMute,
    setMuted,
    sfxCues,
    evaluateAndPlayCues,
    syncCuesToTime,
    resetCuesForReveal,
    clearFiredCues,
    stopAudio,
    ensureAudioContext,
  };
}

export type SandboxAudioCuesState = ReturnType<typeof useSandboxAudioCues>;
