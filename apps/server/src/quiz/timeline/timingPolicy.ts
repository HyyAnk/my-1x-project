/**
 * Re-export canonical QuizTimingPolicy and timingPolicyForAgeBand from @studio/shared
 * for server-side backwards compatibility.
 */

export {
  timingPolicyForAgeBand,
  type QuizTimingPolicy,
  type SandboxPhase,
  type SandboxPhaseTimeline,
  computeSandboxPhaseTimeline,
  getSandboxPhaseAtTime,
  getSandboxPhaseTimestamps,
} from "@studio/shared";
