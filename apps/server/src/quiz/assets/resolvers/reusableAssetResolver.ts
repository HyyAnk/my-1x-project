import { readFile } from "node:fs/promises";
import type { QuizAssetPlan, QuizAssetResolution, QuizIssue } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { isValidQuizAsset } from "../assetValidator.js";
import { createQuizAssetIssue } from "./assetErrorClassifier.js";

export function hasExplicitAssetProvenance(meta?: {
  model?: string;
  provenance?: string;
  user_selected?: boolean;
} | null): boolean {
  if (!meta) return false;
  return (
    meta.model === "user_selected" ||
    meta.provenance === "explicit" ||
    meta.user_selected === true
  );
}

export async function tryReuseExplicitBundleAsset(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  request: QuizAssetPlan["assets"][number];
  fingerprint: string;
  bundleNumber: number;
}): Promise<QuizAssetResolution["assets"][number] | null> {
  if (input.request.purpose !== "hero_question_image" || input.bundleNumber <= 0) {
    return null;
  }
  const bundleTarget = await input.repository.getBundleImagePath(input.channelId, input.episodeId, input.bundleNumber);
  const existingBundleFile = await input.repository
    .getBundleImageFile(input.channelId, input.episodeId, bundleTarget.filename)
    .catch(() => null);
  if (!existingBundleFile || !hasExplicitAssetProvenance(existingBundleFile)) {
    return null;
  }

  const bundleBytes = new Uint8Array(await readFile(existingBundleFile.absolutePath));
  const quizAssetPath = await input.repository.writeQuizImageAsset(
    input.channelId,
    input.episodeId,
    input.request.asset_id,
    input.fingerprint,
    bundleBytes,
    {
      price_vnd: existingBundleFile.price_vnd,
      price_breakdown: existingBundleFile.price_breakdown,
      model: existingBundleFile.model,
      aspect_ratio: existingBundleFile.aspect_ratio,
      provenance: "explicit",
      user_selected: true,
    },
  );

  return {
    ...input.request,
    fingerprint: input.fingerprint,
    path: quizAssetPath,
    source: "explicit_episode",
  };
}

export async function tryReuseCachedAsset(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  request: QuizAssetPlan["assets"][number];
  fingerprint: string;
  cached?: QuizAssetResolution["assets"][number];
}): Promise<{ entry: QuizAssetResolution["assets"][number]; issue?: QuizIssue } | null> {
  const { cached, repository, channelId, episodeId, request, fingerprint } = input;
  if (!cached) return null;

  const valid = await isValidQuizAsset(repository, channelId, episodeId, cached.path, request);
  if (!valid) return null;

  const entry: QuizAssetResolution["assets"][number] = {
    ...request,
    fingerprint,
    path: cached.path,
    source: "cache",
    fallback_tier: cached.fallback_tier,
    degraded: cached.degraded,
    actual_dimensions: cached.actual_dimensions,
  };

  let issue: QuizIssue | undefined;
  if (cached.degraded || cached.fallback_tier === 3) {
    issue = createQuizAssetIssue(
      request,
      "asset_fallback_degraded",
      "warning",
      `Asset ${request.asset_id} used Tier 3 deterministic fallback. Visual review recommended.`,
      "Inspect the generated fallback card or replace with a dedicated image.",
    );
  }

  return { entry, issue };
}
