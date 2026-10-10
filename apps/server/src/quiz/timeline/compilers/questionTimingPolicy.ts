import {
  QUIZ_GAMEPLAY_POLICIES,
  applyPacingProfile,
  gameplayTimingPolicy,
  resolveGameplayPolicy,
  timingPolicyForAgeBand,
  type QuizPacingProfile,
  type QuizQuestion,
  type QuizTimingPolicy,
} from "@studio/shared";
import type { TimelineCompileInput } from "../compileTimeline.types.js";

/** Base policy used outside question blocks (kickoff, interstitials, outro) before input overrides. */
export function baseTimingPolicy(input: TimelineCompileInput, pacingProfile: QuizPacingProfile): QuizTimingPolicy {
  const base =
    pacingProfile === "short"
      ? gameplayTimingPolicy(applyPacingProfile(QUIZ_GAMEPLAY_POLICIES.deep_trivia, "short"), input.quiz.age_band, 1, "short")
      : timingPolicyForAgeBand(input.quiz.age_band);
  return { ...base, ...input.timing };
}

/** Versioned director plans carry a gameplay per beat; older plans fall back to the age-band policy. */
export function questionTimingPolicy(
  input: TimelineCompileInput,
  question: QuizQuestion,
  pacingProfile: QuizPacingProfile,
  basePolicy: QuizTimingPolicy,
): QuizTimingPolicy {
  const beat = input.director.beats.find((item) => item.question_id === question.id);
  if (!input.director.gameplay_policy_version || !beat) return basePolicy;
  const policy = applyPacingProfile(resolveGameplayPolicy(beat), pacingProfile);
  return { ...gameplayTimingPolicy(policy, input.quiz.age_band, question.difficulty, pacingProfile), ...input.timing };
}
