import type { DirectorPlan, QuizIssue, QuizTimeline, QuizV2, VoicePlan } from "@studio/shared";
import { quizShortTimelineIssues } from "../../timeline/quizShortTimelineRules.js";
import { portraitDirectorPlanIssues } from "../../director/portraitPlanRules.js";

/** A short question cycle: entrance, tight thinking window, reveal and transition. */
export const QUIZ_SHORT_QUESTION_CYCLE_RANGE_SECONDS: readonly [number, number] = [6, 16];

export interface AssessQuizShortQaInput {
  quiz: QuizV2;
  director?: DirectorPlan | null;
  voicePlan?: VoicePlan | null;
  timeline?: QuizTimeline | null;
}

function voiceChoiceNarrationIssues(voicePlan: VoicePlan): QuizIssue[] {
  const choiceSegments = voicePlan.segments.filter((segment) => segment.role === "choice");
  if (!choiceSegments.length) return [];
  return [
    {
      code: "quiz_short_choice_narration",
      severity: "blocker",
      message:
        "The short pacing profile never narrates choices, but the voice plan contains " + choiceSegments.length + " choice segments.",
      next_action: 'Rebuild the voice plan with pacingProfile "short".',
      question_ids: [...new Set(choiceSegments.flatMap((segment) => (segment.question_id ? [segment.question_id] : [])))],
      stage: "voice",
    },
  ];
}

/** Same rules as the director validator, reported under QA codes so the stage is visible in the assessment. */
function portraitLayoutIssues(director: DirectorPlan): QuizIssue[] {
  return portraitDirectorPlanIssues(director).map((issue) => ({ ...issue, code: issue.code.replace(/^director_/, "qa_") }));
}

/**
 * Quiz Short contract checks, layered on top of the Episode QA stages:
 * no choice narration, the duration budget and portrait-only layouts.
 */
export function assessQuizShortQa(input: AssessQuizShortQaInput): QuizIssue[] {
  const issues: QuizIssue[] = [];
  if (input.voicePlan) issues.push(...voiceChoiceNarrationIssues(input.voicePlan));
  if (input.timeline) issues.push(...quizShortTimelineIssues(input.timeline));
  if (input.director) issues.push(...portraitLayoutIssues(input.director));
  return issues;
}
