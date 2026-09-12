import type { QuizAssetPlan, QuizAssetResolution, QuizIssue } from "@studio/shared";

export function validateConsistencyGroups(
  plan: QuizAssetPlan,
  assets: QuizAssetResolution["assets"],
): QuizIssue[] {
  const issues: QuizIssue[] = [];

  for (const group of plan.consistency_groups) {
    const groupAssets = assets.filter((asset) => asset.consistency_group_id === group.group_id);
    if (groupAssets.length !== group.asset_ids.length) continue;
    issues.push({
      code: "needs_visual_review",
      severity: "warning",
      message: `Visual answer set ${group.group_id} is technically resolved but needs a human fairness review.`,
      next_action:
        "Review the generated options together for matching medium, framing, lighting, saturation, and no pre-reveal answer cue.",
      question_ids: [group.question_id],
      stage: "assets",
    });
  }

  return issues;
}
