import type { ChannelMascotConfig, MascotProfile, QuizAssetPlan, QuizIssue } from "@studio/shared";

export interface AssessAssetQaInput {
  assetPlan?: QuizAssetPlan | null;
  resolvedAssets?: Array<{
    asset_id: string;
    path: string;
    source: string;
    degraded?: boolean;
    fallback_tier?: number;
    question_id?: string | null;
  }>;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
}

export function assessAssetQa(input: AssessAssetQaInput): QuizIssue[] {
  const issues: QuizIssue[] = [];

  if (input.assetPlan) {
    const resolved = new Set((input.resolvedAssets ?? []).map((asset) => asset.asset_id));
    for (const asset of input.assetPlan.assets) {
      if (!resolved.has(asset.asset_id)) {
        issues.push({
          code: "asset_required_unresolved",
          severity: "blocker",
          message: "Required asset " + asset.asset_id + " is unresolved.",
          next_action: "Resolve the exact semantic asset before rendering.",
          question_ids: asset.question_id ? [asset.question_id] : [],
          stage: "assets",
        });
      }
    }
  }

  if (input.resolvedAssets) {
    for (const asset of input.resolvedAssets) {
      if (asset.degraded || asset.fallback_tier === 3 || asset.source === "fallback") {
        issues.push({
          code: "asset_fallback_degraded",
          severity: "warning",
          message: `Asset ${asset.asset_id} used Tier 3 deterministic fallback.`,
          next_action: "Operator review recommended: check placeholder visual readability or regenerate image with an AI provider.",
          question_ids: asset.question_id ? [asset.question_id] : [],
          stage: "assets",
        });
      }
    }
  }

  if (input.mascotConfig?.enabled && !input.mascot) {
    issues.push({
      code: "mascot_unresolved",
      severity: "warning",
      message: "Channel has mascot enabled but no mascot profile could be loaded.",
      next_action: "Verify channel mascot configuration in Mascot Studio.",
      question_ids: [],
      stage: "assets",
    });
  } else if (input.mascot && input.mascotConfig?.enabled !== false) {
    const hasIdle = Boolean(input.mascot.actions.idle?.sprite_url || input.mascot.master_image_url);
    if (!hasIdle) {
      issues.push({
        code: "mascot_idle_missing",
        severity: "warning",
        message: `Mascot "${input.mascot.name}" has neither an idle sprite nor a master concept image.`,
        next_action: "Generate master concept art or an idle action image in Mascot Studio.",
        question_ids: [],
        stage: "assets",
      });
    }

    const missingPoses: string[] = [];
    if (!input.mascot.actions.thinking?.sprite_url) missingPoses.push("thinking");
    if (!input.mascot.actions.celebrate?.sprite_url) missingPoses.push("celebrate");
    if (!input.mascot.actions.point?.sprite_url) missingPoses.push("point");

    if (missingPoses.length > 0) {
      issues.push({
        code: "mascot_pose_incomplete",
        severity: "warning",
        message: `Mascot "${input.mascot.name}" is missing key animation poses (${missingPoses.join(", ")}). Fallback to idle will be used.`,
        next_action: "Generate the missing action images in Mascot Studio for best video engagement.",
        question_ids: [],
        stage: "assets",
      });
    }
  }

  return issues;
}
