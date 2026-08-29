import { useEffect, useState } from "react";
import type { SandboxPhase } from "@studio/shared";

export type { SandboxPhase };

const PHASE_TIMES: Record<SandboxPhase, number> = {
  question: 0.5,
  choices: 1.8,
  thinking: 4.5,
  reveal: 8,
  explain: 9.2,
};

export function useSandboxTimelineState() {
  const [phase, setPhase] = useState<SandboxPhase>("thinking");
  const [timelineSeconds, setTimelineSeconds] = useState(3.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useScrubber, setUseScrubber] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimelineSeconds((previous) => {
        const next = Number((previous + 0.1).toFixed(1));
        if (next > 10) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePhaseChange = (newPhase: SandboxPhase) => {
    setUseScrubber(false);
    setIsPlaying(false);
    setPhase(newPhase);
    setTimelineSeconds(PHASE_TIMES[newPhase]);
  };

  const handleScrubberChange = (seconds: number) => {
    setUseScrubber(true);
    setTimelineSeconds(seconds);
  };

  return {
    phase,
    setPhase,
    timelineSeconds,
    setTimelineSeconds,
    isPlaying,
    setIsPlaying,
    useScrubber,
    setUseScrubber,
    handlePhaseChange,
    handleScrubberChange,
  };
}

export type SandboxTimelineState = ReturnType<typeof useSandboxTimelineState>;
