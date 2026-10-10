import type { QuizPacingProfile, QuizV2, VoicePlan } from "@studio/shared";

/** One pacing step: the short profile speaks one step faster than the age band default. */
export const QUIZ_VOICE_WORDS_PER_SECOND_STEP = 0.1;

const AGE_BAND_WORDS_PER_SECOND: Record<QuizV2["age_band"], number> = { "4-6": 2.4, "7-9": 2.5, "10-12": 2.6, family: 2.5 };

/**
 * The QA gate measures only the duration of spoken voice segments. Keep this
 * policy in one place so synthesis, cache invalidation, and QA use the same
 * age-band contract.
 */
export function quizVoiceTargetWordsPerSecond(ageBand: QuizV2["age_band"], pacingProfile: QuizPacingProfile = "standard"): number {
  const base = AGE_BAND_WORDS_PER_SECOND[ageBand];
  return pacingProfile === "short" ? Number((base + QUIZ_VOICE_WORDS_PER_SECOND_STEP).toFixed(3)) : base;
}

/** Leave a small measurement/rounding margin below the hard QA target. */
export function quizVoicePacingLimit(targetWordsPerSecond: number): number {
  return Number((targetWordsPerSecond * 0.97).toFixed(3));
}

export function quizVoiceWordsPerSecond(voicePlan: VoicePlan): number {
  const spoken = voicePlan.segments.filter((segment) => segment.role !== "countdown");
  const words = spoken.reduce((total, segment) => total + countQuizVoiceWords(segment.text), 0);
  const duration = spoken.reduce((total, segment) => total + (segment.duration_seconds ?? 0), 0);
  return words / Math.max(0.1, duration);
}

export function quizVoicePlanNeedsRegeneration(input: {
  voicePlan: VoicePlan | null;
  ageBand: QuizV2["age_band"];
  assessmentIssueCodes?: Iterable<string>;
  pacingProfile?: QuizPacingProfile;
}): boolean {
  if (!input.voicePlan) return true;
  const issueCodes = new Set(input.assessmentIssueCodes ?? []);
  return (
    quizVoiceWordsPerSecond(input.voicePlan) > quizVoiceTargetWordsPerSecond(input.ageBand, input.pacingProfile) ||
    issueCodes.has("voice_pace_fast") ||
    issueCodes.has("voice_pace_unsafe")
  );
}

export function countQuizVoiceWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
