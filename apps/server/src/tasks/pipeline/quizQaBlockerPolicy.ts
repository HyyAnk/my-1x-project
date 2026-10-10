import type { QuizIssue } from "@studio/shared";

/**
 * Quiz Short contract blockers. None of them can be healed by retrying assets or re-pacing voice:
 * they need a new voice plan, a shorter question set or a regenerated Director plan, so the gate
 * fails immediately instead of burning healing cycles.
 */
export const QUIZ_SHORT_UNHEALABLE_BLOCKER_CODES: readonly string[] = [
  "quiz_short_choice_narration",
  "timeline_short_duration_exceeded",
  "timeline_short_choice_narration",
];

const QUIZ_SHORT_UNHEALABLE_BLOCKER_PREFIXES: readonly string[] = ["qa_portrait_layout_"];

export function isUnhealableQuizBlocker(issue: Pick<QuizIssue, "code" | "severity">): boolean {
  if (issue.severity !== "blocker") return false;
  if (QUIZ_SHORT_UNHEALABLE_BLOCKER_CODES.includes(issue.code)) return true;
  return QUIZ_SHORT_UNHEALABLE_BLOCKER_PREFIXES.some((prefix) => issue.code.startsWith(prefix));
}

export function findUnhealableQuizBlocker<T extends Pick<QuizIssue, "code" | "severity">>(blockers: readonly T[]): T | undefined {
  return blockers.find((issue) => isUnhealableQuizBlocker(issue));
}
