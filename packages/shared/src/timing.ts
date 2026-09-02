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
  revealStart: number;
  explainStart: number;
  totalDuration: number;
};

/**
 * Computes exact phase boundary timestamps based on a timing policy.
 */
export function computeSandboxPhaseTimeline(policy: QuizTimingPolicy = timingPolicyForAgeBand("7-9")): SandboxPhaseTimeline {
  const questionStart = 0;
  const choicesStart = policy.question_entrance_seconds + policy.choices_enter_delay_seconds;
  const choicesDuration =
    policy.choice_entrance_seconds +
    policy.choice_stagger_seconds * 2 +
    policy.choice_settle_seconds +
    policy.question_to_choices_pause_seconds;
  const thinkingStart = choicesStart + choicesDuration;
  const thinkingDuration = policy.countdown_seconds;
  const revealStart = thinkingStart + thinkingDuration;
  const revealDuration = policy.reveal_seconds + policy.reveal_hold_seconds + policy.reward_seconds.medium;
  const explainStart = revealStart + revealDuration;
  const totalDuration = explainStart + policy.explanation_hold_seconds;

  return {
    questionStart,
    choicesStart,
    thinkingStart,
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
 * Returns canonical preview timestamps for quick-jump buttons in the Sandbox inspector.
 */
export function getSandboxPhaseTimestamps(
  policy: QuizTimingPolicy = timingPolicyForAgeBand("7-9"),
): Array<{ id: SandboxPhase; time: number }> {
  const timeline = computeSandboxPhaseTimeline(policy);
  return [
    { id: "question", time: Number((timeline.questionStart + 0.3).toFixed(1)) },
    { id: "choices", time: Number((timeline.choicesStart + 0.3).toFixed(1)) },
    { id: "thinking", time: Number((timeline.thinkingStart + 1.0).toFixed(1)) },
    { id: "reveal", time: Number((timeline.revealStart + 0.2).toFixed(1)) },
    { id: "explain", time: Number((timeline.explainStart + 0.2).toFixed(1)) },
  ];
}
