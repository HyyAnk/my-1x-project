import {
  QuizAssetPlanSchema,
  type DirectorPlan,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizV2,
} from "@studio/shared";
import { planQuizAssets } from "./assetPlanner.js";

export type SizingChange = {
  assetId: string;
  kind: "metadata_only" | "render_only" | "generation_affecting";
  previousRatio: string;
  currentRatio: string;
};

export type AssetSizingReconciliation = {
  plan: QuizAssetPlan;
  changes: SizingChange[];
};

export function reconcileQuizAssetSizing(
  quiz: QuizV2,
  director: DirectorPlan,
  plan: QuizAssetPlan,
  resolution?: QuizAssetResolution | null,
): AssetSizingReconciliation {
  const targetPlan = planQuizAssets(quiz, director);
  const existingBySemanticKey = new Map(plan.assets.map((asset) => [asset.semantic_key, asset]));
  const existingById = new Map(plan.assets.map((asset) => [asset.asset_id, asset]));
  const resolvedById = resolution ? new Map(resolution.assets.map((a) => [a.asset_id, a])) : null;

  const changes: SizingChange[] = [];
  const reconciledAssets: QuizAssetPlan["assets"] = [];

  for (const planned of targetPlan.assets) {
    const existing = existingBySemanticKey.get(planned.semantic_key) ?? existingById.get(planned.asset_id);

    if (existing) {
      const previousRatio = existing.aspect_ratio;
      const currentRatio = planned.aspect_ratio;
      const previousSizing = existing.sizing;
      const currentSizing = planned.sizing;
      const resolved = resolvedById?.get(existing.asset_id);

      const isExplicit = resolved?.source === "explicit_episode";
      const hasInsufficientResolution =
        !isExplicit &&
        resolved?.actual_dimensions &&
        currentSizing &&
        (resolved.actual_dimensions.width < Math.floor(currentSizing.recommended_width / 1.5) - 1 ||
          resolved.actual_dimensions.height < Math.floor(currentSizing.recommended_height / 1.5) - 1);

      if (previousRatio !== currentRatio && !isExplicit) {
        changes.push({
          assetId: existing.asset_id,
          kind: "generation_affecting",
          previousRatio,
          currentRatio,
        });
      } else if (hasInsufficientResolution) {
        changes.push({
          assetId: existing.asset_id,
          kind: "generation_affecting",
          previousRatio,
          currentRatio,
        });
      } else if (
        previousSizing &&
        currentSizing &&
        (previousSizing.recommended_width !== currentSizing.recommended_width ||
          previousSizing.recommended_height !== currentSizing.recommended_height)
      ) {
        changes.push({
          assetId: existing.asset_id,
          kind: "render_only",
          previousRatio,
          currentRatio,
        });
      } else if (
        !previousSizing ||
        (currentSizing &&
          (previousSizing.geometry_key !== currentSizing.geometry_key ||
            previousSizing.policy_version !== currentSizing.policy_version))
      ) {
        changes.push({
          assetId: existing.asset_id,
          kind: "metadata_only",
          previousRatio,
          currentRatio,
        });
      }

      // Preserve user-authored subject and semantic properties while updating sizing & ratio
      reconciledAssets.push({
        ...existing,
        aspect_ratio: currentRatio,
        sizing: currentSizing,
      });
    } else {
      changes.push({
        assetId: planned.asset_id,
        kind: "generation_affecting",
        previousRatio: planned.aspect_ratio,
        currentRatio: planned.aspect_ratio,
      });
      reconciledAssets.push(planned);
    }
  }

  // Reconcile consistency groups
  const existingGroups = new Map(plan.consistency_groups.map((g) => [g.group_id, g]));
  const reconciledGroups: QuizAssetPlan["consistency_groups"] = targetPlan.consistency_groups.map((targetGroup) => {
    const existingGroup = existingGroups.get(targetGroup.group_id);
    if (!existingGroup) return targetGroup;

    // If choices ratio changed, update subject_scale from target
    const groupAssetChanged = changes.some(
      (c) => targetGroup.asset_ids.includes(c.assetId) && c.previousRatio !== c.currentRatio,
    );

    return {
      ...existingGroup,
      subject_scale: groupAssetChanged ? targetGroup.subject_scale : existingGroup.subject_scale,
      asset_ids: targetGroup.asset_ids,
    };
  });

  const reconciledPlan = QuizAssetPlanSchema.parse({
    schema_version: 2,
    episode_id: quiz.episode_id,
    assets: reconciledAssets,
    consistency_groups: reconciledGroups,
  });

  return {
    plan: reconciledPlan,
    changes,
  };
}
