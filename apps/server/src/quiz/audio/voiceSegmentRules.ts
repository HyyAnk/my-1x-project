import {
  applyPacingProfile,
  gameplayTimingPolicy,
  resolveGameplayPolicy,
  type DirectorBeat,
  type DirectorPlan,
  type GameplayPolicy,
  type QuizPacingProfile,
  type QuizQuestion,
  type QuizV2,
} from "@studio/shared";
import { shouldCompileExplanationBeat } from "../timeline/compilers/question/explanationRule.js";

/**
 * Legacy plans without a gameplay version narrate every beat. Versioned plans, questions
 * with an explicit gameplay and the short profile resolve the gameplay policy, which then
 * decides whether choices and the thinking prompt are spoken.
 */
export function resolveVoiceGameplayPolicy(
  question: QuizQuestion,
  director: DirectorPlan | undefined,
  beat: DirectorBeat | undefined,
  pacingProfile?: QuizPacingProfile,
): GameplayPolicy | undefined {
  const versioned = Boolean(director?.gameplay_policy_version || question.gameplay_id || pacingProfile === "short");
  if (!versioned) return undefined;
  const policy = resolveGameplayPolicy({ ...question, ...beat });
  return pacingProfile ? applyPacingProfile(policy, pacingProfile) : policy;
}

/** Episodes always carry an explanation segment; the short profile follows the shared explanation rule. */
export function includesExplanationSegment(
  quiz: QuizV2,
  question: QuizQuestion,
  policy: GameplayPolicy | undefined,
  pacingProfile?: QuizPacingProfile,
): boolean {
  if (!policy || pacingProfile !== "short") return true;
  const timing = gameplayTimingPolicy(policy, quiz.age_band, question.difficulty, "short");
  return shouldCompileExplanationBeat(question, "short", timing);
}
