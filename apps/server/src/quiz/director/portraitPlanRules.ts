import { isQuizPortraitLayoutId, type DirectorPlan, type QuizIssue } from "@studio/shared";

export const QUIZ_SHORT_MAX_DISTINCT_LAYOUTS = 2;

export function hasPortraitDirectorBeats(plan: Pick<DirectorPlan, "beats">): boolean {
  return plan.beats.some((beat) => isQuizPortraitLayoutId(beat.layout_id));
}

/** A Quiz Short plan alternates at most two layouts and never mixes in a landscape layout. */
export function portraitDirectorPlanIssues(plan: Pick<DirectorPlan, "beats">): QuizIssue[] {
  const issues: QuizIssue[] = [];
  const landscapeBeats = plan.beats.filter((beat) => !isQuizPortraitLayoutId(beat.layout_id));
  if (landscapeBeats.length)
    issues.push({
      code: "director_portrait_layout_required",
      severity: "blocker",
      message: "A portrait plan assigns non-portrait layouts: " + landscapeBeats.map((beat) => beat.layout_id).join(", ") + ".",
      next_action: "Assign only short_* portrait layouts to Quiz Short beats.",
      question_ids: landscapeBeats.map((beat) => beat.question_id),
      stage: "director",
    });
  const distinct = new Set(plan.beats.map((beat) => beat.layout_id));
  if (distinct.size > QUIZ_SHORT_MAX_DISTINCT_LAYOUTS)
    issues.push({
      code: "director_portrait_layout_pair_exceeded",
      severity: "blocker",
      message: "A Quiz Short plan uses " + distinct.size + " layouts; at most " + QUIZ_SHORT_MAX_DISTINCT_LAYOUTS + " are allowed.",
      next_action: "Alternate the configured layout pair instead of mixing more layouts.",
      question_ids: plan.beats.map((beat) => beat.question_id),
      stage: "director",
    });
  return issues;
}
