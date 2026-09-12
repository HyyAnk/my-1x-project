import type { QuizAssetPlan, QuizAssetResolution, QuizImageStyle } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { assetFingerprint } from "../assetFingerprint.js";
import { compileQuizAssetPrompt } from "../promptCompiler.js";
import { isValidQuizAsset, resolveQuizImageProviderName } from "../assetValidator.js";

export async function preloadValidExistingAssets(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  plan: QuizAssetPlan;
  existingResolution: QuizAssetResolution | null;
  consistencyGroups: Map<string, QuizAssetPlan["consistency_groups"][number]>;
  visualStyle: QuizImageStyle;
  activeEngine: "codex" | "antigravity";
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "gpti2" | "shopaikey" | "custom" | "imgstudio";
    base_url?: string;
    quality?: string;
  };
}): Promise<Map<string, QuizAssetResolution["assets"][number]>> {
  const resolvedMap = new Map<string, QuizAssetResolution["assets"][number]>();
  if (!input.existingResolution?.assets) return resolvedMap;

  const providerName = resolveQuizImageProviderName({
    imageConfig: input.imageConfig,
    activeEngine: input.activeEngine,
  });

  for (const asset of input.existingResolution.assets) {
    const request = input.plan.assets.find((r) => r.asset_id === asset.asset_id);
    if (!request || asset.semantic_key !== request.semantic_key) continue;

    const isExplicit = asset.source === "explicit_episode";
    const valid = await isValidQuizAsset(
      input.repository,
      input.channelId,
      input.episodeId,
      asset.path,
      request,
      isExplicit ? "explicit" : "generated",
    );
    if (!valid) continue;

    const compiled = compileQuizAssetPrompt(
      request,
      request.consistency_group_id ? input.consistencyGroups.get(request.consistency_group_id) : undefined,
      input.visualStyle,
    );
    const expectedFingerprint = assetFingerprint(request, providerName, compiled.cacheVersion);

    if (asset.fingerprint === expectedFingerprint || asset.source === "explicit_episode") {
      resolvedMap.set(asset.asset_id, asset);
    }
  }

  return resolvedMap;
}
