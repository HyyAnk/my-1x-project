/**
 * Comprehensive Quiz Timing Policy and Phase Resolution Engine.
 *
 * Defines the canonical animation, narration, pause, and reveal pacing
 * for Quiz video composition across different target age bands.
 */

import type { QuizAgeBand } from "./enums.js";

export type QuizTimingPolicy = {
  /** Minimum duration (seconds) allocated for the hook and title intro card */
  intro_minimum_seconds: number;
  /** Duration (seconds) of the question banner entrance transition */
  question_entrance_seconds: number;
  /** Lead time (seconds) before question narration audio begins playing */
  question_narration_lead_seconds: number;
  /** Delay (seconds) before choices start entering after the question */
  choices_enter_delay_seconds: number;
  /** Duration (seconds) of each choice card entrance animation */
  choice_entrance_seconds: number;
  /** Stagger offset (seconds) between successive choice card appearances */
  choice_stagger_seconds: number;
  /** Settle duration (seconds) after all choice cards have appeared */
  choice_settle_seconds: number;
  /** Micro-gap (seconds) inserted between narration audio clips */
  narration_gap_seconds: number;
  /** Pause duration (seconds) between reading the question and reading the options */
  question_to_choices_pause_seconds: number;
  /** Settle time (seconds) before the thinking bar starts draining */
  thinking_settle_seconds: number;
  /** Post-prompt thinking buffer (seconds) */
  post_prompt_thinking_seconds: number;
  /** Delay (seconds) before the correct answer visual reveal pops */
  reveal_delay_seconds: number;
  /** Duration (seconds) of the answer reveal animation */
  reveal_seconds: number;
  /** Lead time (seconds) before the voice announcement for reveal plays */
  reveal_voice_lead_seconds: number;
  /** Hold duration (seconds) after reveal animation completes */
  reveal_hold_seconds: number;
  /** Confetti/star reward FX duration (seconds) mapped by reward intensity */
  reward_seconds: Record<"small" | "medium" | "big", number>;
  /** Lead time (seconds) before fact/explanation card appears */
  explanation_lead_seconds: number;
  /** Duration (seconds) to hold the explanation card on screen */
  explanation_hold_seconds: number;
  /** Duration (seconds) to hold the fun fact card on screen */
  fact_hold_seconds: number;
  /** Transition wipe duration (seconds) between consecutive questions */
  transition_seconds: number;
  /** Overlap duration (seconds) between scene transition layers */
  transition_overlap_seconds: number;
  /** Hold duration (seconds) for the outro recap and final score screen */
  outro_hold_seconds: number;
  /** Minimum thinking duration (seconds) tailored by age band */
  minimum_thinking_seconds: number;
  /** Maximum thinking duration (seconds) tailored by age band */
  maximum_thinking_seconds: number;
  /** Countdown timer duration (seconds), typically 5 seconds */
  countdown_seconds: number;
  /** Fallback reading rate (words per second) when audio file is not yet generated */
  fallback_words_per_second: number;
};

const MINIMUM_THINKING_BY_AGE: Record<QuizAgeBand, number> = {
  "4-6": 7.2,
  "7-9": 6.8,
  "10-12": 6.5,
  family: 6.8,
};

const MAXIMUM_THINKING_BY_AGE: Record<QuizAgeBand, number> = {
  "4-6": 8.5,
  "7-9": 8.0,
  "10-12": 7.8,
  family: 8.0,
};

/**
 * Returns the canonical timing policy tailored for a given Quiz age band.
 * Younger audiences receive slower pacing and longer thinking buffers.
 */
export function timingPolicyForAgeBand(ageBand: QuizAgeBand): QuizTimingPolicy {
  return {
    intro_minimum_seconds: 2.6,
    question_entrance_seconds: 0.95,
    question_narration_lead_seconds: 2.0,
    choices_enter_delay_seconds: 0.48,
    choice_entrance_seconds: 0.58,
    choice_stagger_seconds: 0.14,
    choice_settle_seconds: 0.08,
    narration_gap_seconds: 0.08,
    question_to_choices_pause_seconds: 1.0,
    thinking_settle_seconds: 0.1,
    post_prompt_thinking_seconds: 1.0,
    reveal_delay_seconds: 0.05,
    reveal_seconds: 0.58,
    reveal_voice_lead_seconds: 0,
    reveal_hold_seconds: 0.24,
    reward_seconds: { small: 0.42, medium: 0.58, big: 0.86 },
    explanation_lead_seconds: 0.08,
    explanation_hold_seconds: 2.0,
    fact_hold_seconds: 2.0,
    transition_seconds: 0.86,
    transition_overlap_seconds: 0,
    outro_hold_seconds: 5.0,
    minimum_thinking_seconds: MINIMUM_THINKING_BY_AGE[ageBand] ?? 6.8,
    maximum_thinking_seconds: MAXIMUM_THINKING_BY_AGE[ageBand] ?? 8.0,
    countdown_seconds: 5,
    fallback_words_per_second: 2.05,
  };
}

export type SandboxPhase = "question" | "choices" | "thinking" | "reveal" | "explain";

export type SandboxPhaseTimeline = {
  questionStart: number;
  choicesStart: number;
  thinkingStart: number;
  timerHideAt?: number;
  revealStart: number;
  explainStart: number;
  totalDuration: number;
};

/**
 * Computes exact phase boundary timestamps based on a timing policy.
 */
export function computeSandboxPhaseTimeline(
  policyOrOptions?: QuizTimingPolicy | { isSingleReveal?: boolean },
  maybeOptions?: { isSingleReveal?: boolean },
): SandboxPhaseTimeline {
  const options = policyOrOptions && "isSingleReveal" in policyOrOptions ? policyOrOptions : maybeOptions;
  const policy = policyOrOptions && "countdown_seconds" in policyOrOptions ? policyOrOptions : timingPolicyForAgeBand("7-9");
  const isSingleReveal = options?.isSingleReveal ?? false;
  const questionStart = 0;
  const choicesStart = isSingleReveal ? 0 : 0.85;
  const thinkingStart = isSingleReveal ? 1.0 : 2.47;
  const timerHideAt = isSingleReveal ? 7.47 : undefined;
  const revealStart = isSingleReveal ? 7.97 : 7.47;
  // In production candyArcadeComposition, rewardStart = revealStart + 0.8s,
  // at which point the fact card enters and reward celebration plays.
  const revealDuration = 0.8;
  const explainStart = Number((revealStart + revealDuration).toFixed(3));
  const totalDuration = Number((explainStart + policy.explanation_hold_seconds).toFixed(3));

  return {
    questionStart,
    choicesStart,
    thinkingStart,
    timerHideAt,
    revealStart,
    explainStart,
    totalDuration,
  };
}

/**
 * Resolves the active visual phase for a given timestamp in the Sandbox preview.
 */
export function getSandboxPhaseAtTime(timeSeconds: number, policy: QuizTimingPolicy = timingPolicyForAgeBand("7-9")): SandboxPhase {
  const timeline = computeSandboxPhaseTimeline(policy);
  if (timeSeconds < timeline.choicesStart) return "question";
  if (timeSeconds < timeline.thinkingStart) return "choices";
  if (timeSeconds < timeline.revealStart) return "thinking";
  if (timeSeconds < timeline.explainStart) return "reveal";
  return "explain";
}

/**
 * Canonical settled preview keyframe timestamps for quick-jump buttons in the Sandbox inspector.
 * Values are calibrated so UI elements have completely finished their entrance/reveal animations
 * and are fully resting in their settled steady state:
 * - question: 0.6s (resting in steady float after question-card-enter 0.52s completes)
 * - choices: 2.0s (all 4 staggered choices have fully landed and settled before thinkingStart at 2.47s)
 * - thinking: 3.5s (active countdown running)
 * - reveal: 8.1s (after correct-card-reveal 0.62s completes; green border #22C55E is settled, before explainStart at 8.27s)
 * - explain: 8.8s (fact card settled with opacity 1, reward celebration active)
 */
export const SETTLED_SANDBOX_PHASE_TIMESTAMPS: Record<SandboxPhase, number> = {
  question: 0.6,
  choices: 2.0,
  thinking: 3.5,
  reveal: 8.1,
  explain: 8.8,
} as const;

/**
 * Visual reveal animation duration in seconds (correct-card-reveal duration: 0.62s).
 */
export const REVEAL_ANIMATION_DURATION_SECONDS = 0.62;

/**
 * Canonical start timestamps for rehearsal playback and animation triggers in the Sandbox preview.
 */
export const REHEARSAL_PHASE_START_TIMESTAMPS: Record<SandboxPhase, number> = {
  question: 0,
  choices: 0.85,
  thinking: 2.47,
  reveal: 7.47,
  explain: 8.27,
} as const;

/**
 * Returns canonical preview timestamps for quick-jump buttons in the Sandbox inspector.
 * Calibrated to settled keyframe values where UI animations are fully in steady state.
 */
export function getSandboxPhaseTimestamps(
  _policy: QuizTimingPolicy = timingPolicyForAgeBand("7-9"),
): Array<{ id: SandboxPhase; time: number }> {
  return [
    { id: "question", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.question },
    { id: "choices", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices },
    { id: "thinking", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking },
    { id: "reveal", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal },
    { id: "explain", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain },
  ];
}
