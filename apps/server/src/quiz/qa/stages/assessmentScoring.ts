import type { QuizAssessment, QuizIssue } from "@studio/shared";

export function categoryScore(issues: QuizIssue[], stage: QuizIssue["stage"], weight: number): number {
  const relevant = issues.filter((issue) => issue.stage === stage);
  const penalty = relevant.reduce((sum, issue) => sum + (issue.severity === "blocker" ? 35 : issue.severity === "warning" ? 12 : 2), 0);
  return Math.max(0, Math.min(100, Math.round(100 - penalty * Math.max(1, weight / 10))));
}

export function candyArcadeVisualScore(issues: QuizIssue[]) {
  const penalty = (codes: string[], maximum: number, warning = 2, blocker = maximum) => {
    const related = issues.filter((issue) => codes.includes(issue.code));
    return Math.max(
      0,
      maximum -
        related.reduce((sum, issue) => sum + (issue.severity === "blocker" ? blocker : issue.severity === "warning" ? warning : 0), 0),
    );
  };
  const pacing = penalty(["pacing_question_cycle_outside_target", "voice_pace_fast", "voice_pace_unsafe"], 20, 2, 10);
  const hierarchy = penalty(
    ["layout_question_overflow", "layout_choice_overflow", "layout_question_long", "layout_choice_long", "layout_explanation_long"],
    15,
    3,
    15,
  );
  const assetConsistency = penalty(["VISUAL_ANSWER_LEAKAGE", "needs_visual_review"], 15, 1, 15);
  const motion = penalty(["visual_motion_budget", "visual_static_interval"], 15, 3, 15);
  const reveal = penalty(
    ["timeline_canonical_answer_mismatch", "timeline_reveal_before_thinking", "timeline_reward_before_reveal"],
    10,
    3,
    10,
  );
  const transition = penalty(["timeline_question_order"], 10, 2, 10);
  const readability = penalty(["layout_question_overflow", "layout_choice_overflow", "visual_palette_contrast"], 10, 3, 10);
  const visualVariety = penalty(["visual_palette_repeat", "director_repeated_archetype"], 5, 1, 5);
  return {
    pacing,
    hierarchy,
    asset_consistency: assetConsistency,
    motion,
    reveal,
    transition,
    readability,
    visual_variety: visualVariety,
    total: pacing + hierarchy + assetConsistency + motion + reveal + transition + readability + visualVariety,
  };
}

export function computeAssessmentRating(
  issues: QuizIssue[],
  score: number,
  candyArcadeVisual: { total: number },
): QuizAssessment["rating"] {
  const hasBlocker = issues.some((issue) => issue.severity === "blocker");
  return !hasBlocker && score >= 85 && candyArcadeVisual.total >= 85
    ? "production_ready"
    : score >= 70
      ? "needs_review"
      : "not_ready";
}
