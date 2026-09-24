import { getSandboxPhaseTimestamps, SETTLED_SANDBOX_PHASE_TIMESTAMPS, type SandboxPhase, type SandboxPhaseTimeline } from "@studio/shared";

/**
 * Resolves the canonical keyframe timestamp for a given sandbox phase.
 */
export function getPhaseTargetTime(phase: SandboxPhase, timeline?: SandboxPhaseTimeline): number {
  if (timeline?.countdownSeconds !== undefined) {
    const start = {
      question: timeline.questionStart,
      choices: timeline.choicesStart,
      thinking: timeline.thinkingStart,
      reveal: timeline.revealStart,
      explain: timeline.explainStart,
    }[phase];
    const end = {
      question: timeline.choicesStart || timeline.thinkingStart,
      choices: timeline.thinkingStart,
      thinking: timeline.timerHideAt ?? timeline.revealStart,
      reveal: timeline.explainStart,
      explain: timeline.totalDuration,
    }[phase];
    return Math.min(start + 0.65, Math.max(start, end - 0.05));
  }
  const timestamps = getSandboxPhaseTimestamps();
  return timestamps.find((t) => t.id === phase)?.time ?? SETTLED_SANDBOX_PHASE_TIMESTAMPS[phase] ?? 0;
}

/**
 * Computes snapped playback start time when toggling play, accounting for
 * phase snapshot resting keyframes and looping near the end.
 */
export function computePlaybackStartTime(
  currentTime: number,
  phase: SandboxPhase,
  timeline: SandboxPhaseTimeline,
): { startTime: number; isLoopRestart: boolean } {
  if (currentTime >= timeline.totalDuration - 0.1) {
    return { startTime: 0, isLoopRestart: true };
  }
  if (timeline.countdownSeconds !== undefined && Math.abs(currentTime - getPhaseTargetTime(phase, timeline)) < 0.15) {
    return {
      startTime: phase === "reveal" ? timeline.revealStart : phase === "thinking" ? timeline.thinkingStart : currentTime,
      isLoopRestart: false,
    };
  }

  const isThinkingSettled =
    Math.abs(currentTime - SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking) < 0.25 || (phase === "thinking" && Math.abs(currentTime - 3.5) < 0.3);

  if (isThinkingSettled) {
    return { startTime: timeline.thinkingStart, isLoopRestart: false };
  }

  const isRevealSettled = Math.abs(currentTime - SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal) < 0.15 && phase === "reveal";

  if (isRevealSettled) {
    return { startTime: timeline.revealStart, isLoopRestart: false };
  }

  return { startTime: currentTime, isLoopRestart: false };
}
