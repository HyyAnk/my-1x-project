import {
  applyPacingProfile,
  gameplayTimingPolicy,
  resolveGameplayPolicy,
  type DirectorBeat,
  type DirectorPlan,
  type MascotRenderAspectRatio,
  type QuizIssue,
  type QuizPacingProfile,
  type QuizV2,
} from "@studio/shared";
import { layoutResolutionIssues, resolveQuestionLayout } from "../layoutCompatibility.js";

const minimumThinkingSeconds: Record<QuizV2["age_band"], number> = { "4-6": 7.2, "7-9": 6.8, "10-12": 6.5, family: 6.8 };

function beatIssue(code: string, severity: QuizIssue["severity"], message: string, nextAction: string, questionId: string): QuizIssue {
  return { code, severity, message, next_action: nextAction, question_ids: [questionId], stage: "director" };
}

function minimumThinkingFor(plan: DirectorPlan, beat: DirectorBeat, quiz: QuizV2, difficulty: number, pacing: QuizPacingProfile): number {
  if (!plan.gameplay_policy_version) return minimumThinkingSeconds[quiz.age_band];
  const policy = applyPacingProfile(resolveGameplayPolicy(beat), pacing);
  return gameplayTimingPolicy(policy, quiz.age_band, difficulty, pacing).minimum_thinking_seconds;
}

export function directorBeatIssues(
  quiz: QuizV2,
  plan: DirectorPlan,
  pacingProfile: QuizPacingProfile,
  aspectRatio?: MascotRenderAspectRatio,
): QuizIssue[] {
  const issues: QuizIssue[] = [];
  for (const beat of plan.beats) {
    const question = quiz.questions.find((candidate) => candidate.id === beat.question_id);
    if (!question) continue;
    const layoutResolution = resolveQuestionLayout(question, beat, aspectRatio);
    if (!layoutResolution.ok) issues.push(...layoutResolutionIssues(layoutResolution, question.id, "director", "director"));
    const minimum = minimumThinkingFor(plan, beat, quiz, question.difficulty, pacingProfile);
    if (beat.thinking_seconds < minimum)
      issues.push(
        beatIssue(
          "director_thinking_too_short",
          "blocker",
          "Question " + question.number + " has " + beat.thinking_seconds + "s of thinking time for age band " + quiz.age_band + ".",
          "Increase thinking time to at least " + minimum + " seconds.",
          question.id,
        ),
      );
    if (beat.thinking_seconds > 20)
      issues.push(
        beatIssue(
          "director_thinking_too_long",
          "warning",
          "Question " + question.number + " has " + beat.thinking_seconds + "s of thinking time.",
          "Shorten the thinking beat unless the question needs a deliberate pause.",
          question.id,
        ),
      );
    if (!beat.beat_intents.includes("answer_reveal"))
      issues.push(
        beatIssue(
          "director_reveal_missing",
          "blocker",
          "Question " + question.number + " has no answer reveal intent.",
          "Add an answer_reveal beat intent before rendering.",
          question.id,
        ),
      );
  }
  return issues;
}
