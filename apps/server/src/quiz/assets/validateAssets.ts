import { access, readFile, stat } from "node:fs/promises";
import type { QuizAssetRequirement, QuizIssue } from "@studio/shared";
import type { ResolvedQuizAsset } from "./assetResolver.js";
import {
  getRecommendationForAssetRequirement,
  validateQuizImageBytes,
} from "./imageMetadataValidator.js";

export async function validateResolvedAssets(
  requirements: QuizAssetRequirement[],
  assets: ResolvedQuizAsset[],
): Promise<QuizIssue[]> {
  const issues: QuizIssue[] = [];
  const resolved = new Map(assets.map((asset) => [asset.asset_id, asset]));

  for (const requirement of requirements) {
    const asset = resolved.get(requirement.asset_id);
    if (!asset) continue;

    try {
      await access(asset.path);
      const metadata = await stat(asset.path);
      if (!metadata.isFile() || metadata.size === 0) throw new Error("empty");

      const bytes = new Uint8Array(await readFile(asset.path));
      const recommendation = getRecommendationForAssetRequirement(requirement);
      const provenance = asset.source === "explicit_episode" ? "explicit" : "generated";

      const validation = await validateQuizImageBytes({
        bytes,
        recommendation,
        provenance,
        required: requirement.required,
      });

      if (validation.actual && !asset.actual_dimensions) {
        asset.actual_dimensions = validation.actual;
      }

      for (const issue of validation.issues) {
        issues.push({
          code: issue.code === "image_undecodable" ? "asset_file_invalid" : issue.code,
          severity: issue.severity,
          message: `Asset ${requirement.asset_id}: ${issue.code} (requested ${requirement.aspect_ratio}${validation.actual ? `, actual ${validation.actual.width}x${validation.actual.height}` : ""}).`,
          next_action: "Resolve the asset again through the repository or provider boundary.",
          question_ids: requirement.question_id ? [requirement.question_id] : [],
          stage: "assets",
        });
      }
    } catch {
      issues.push({
        code: "asset_file_invalid",
        severity: requirement.required ? "blocker" : "warning",
        message: `Asset ${requirement.asset_id} cannot be decoded or accessed on disk.`,
        next_action: "Resolve the asset again through the repository or provider boundary.",
        question_ids: requirement.question_id ? [requirement.question_id] : [],
        stage: "assets",
      });
    }
  }

  return issues;
}
