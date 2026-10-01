import type { QuizAssetPlan, QuizAssetResolution, QuizImageStyle, QuizIssue } from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import { createImgStudioRunId } from "../../providers/imgstudio/idempotency.js";
import { isValidQuizAsset, isQuizAssetResolutionComplete, resolveQuizImageProviderName } from "./assetValidator.js";
import type { AntigravityClient } from "../../antigravity.js";
import { preloadValidExistingAssets } from "./resolvers/existingAssetPreloader.js";
import { hasExplicitAssetProvenance } from "./resolvers/reusableAssetResolver.js";
import { validateConsistencyGroups } from "./resolvers/consistencyGroupValidator.js";
import { createProviderCircuitBreaker, ProviderCircuitBreaker } from "./resolvers/circuitBreaker.js";
import { resolveSingleAsset } from "./resolvers/singleAssetResolver.js";
import { executeResolutionRounds } from "./resolvers/resolutionRoundExecutor.js";

export {
  isValidQuizAsset,
  isQuizAssetResolutionComplete,
  resolveQuizImageProviderName,
  hasExplicitAssetProvenance,
  resolveSingleAsset,
};

export type ResolveQuizAssetsInput = {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  plan: QuizAssetPlan;
  visualStyle?: QuizImageStyle;
  activeEngine?: "codex" | "antigravity";
  antigravityClient?: AntigravityClient;
  imageConfig?: {
    api_key?: string;
    model?: string;
    provider?: "gpti2" | "shopaikey" | "custom" | "imgstudio";
    base_url?: string;
    quality?: string;
  };
  imageFallbackConfig?: {
    enabled?: boolean;
    provider?: "imgstudio";
    base_url?: string;
    api_key?: string;
    model?: string;
    resolution?: "1K" | "2K" | "4K";
    quality?: "standard" | "high";
  };
  circuitBreaker?: ProviderCircuitBreaker;
  onProgress?: (progress: { completed: number; total: number; reused: boolean }) => Promise<void> | void;
  maxRounds?: number;
  cancellationSignal?: AbortSignal;
};

/**
 * Resolves all quiz visual assets across a 3-round execution flow with circuit breaker resilience.
 *
 * Coordinates provider resolution with a single ProviderCircuitBreaker instance maintained
 * across all rounds, enabling early bypass of failing tiers and direct fallback execution.
 */
export async function resolveQuizAssets(
  input: ResolveQuizAssetsInput,
): Promise<{ resolution: QuizAssetResolution; issues: QuizIssue[] }> {
  input.cancellationSignal?.throwIfAborted();
  const circuitBreaker = input.circuitBreaker ?? createProviderCircuitBreaker({ failureThreshold: 5 });
  const imgStudioRunId = createImgStudioRunId();
  const existing = await input.repository.readQuizAssetResolution(input.channelId, input.episodeId);
  const byFingerprint = new Map(existing?.assets.map((asset) => [asset.fingerprint, asset]) ?? []);
  const issues: QuizIssue[] = [];
  const logger = new StudioLogger(input.repository.rootDirectory);
  const consistencyGroups = new Map(input.plan.consistency_groups.map((group) => [group.group_id, group]));
  const activeEngine = input.activeEngine ?? "codex";
  const maxRounds = input.maxRounds ?? 3;

  const resolvedMap = await preloadValidExistingAssets({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    plan: input.plan,
    existingResolution: existing,
    consistencyGroups,
    visualStyle: input.visualStyle ?? "pixar_3d",
    activeEngine,
    imageConfig: input.imageConfig,
  });

  await executeResolutionRounds({
    input,
    resolvedMap,
    byFingerprint,
    consistencyGroups,
    logger,
    activeEngine,
    imgStudioRunId,
    circuitBreaker,
    maxRounds,
    issues,
  });

  const assets = input.plan.assets
    .map((req) => resolvedMap.get(req.asset_id))
    .filter((asset): asset is QuizAssetResolution["assets"][number] => Boolean(asset));

  issues.push(...validateConsistencyGroups(input.plan, assets));

  const resolution: QuizAssetResolution = {
    schema_version: 2,
    episode_id: input.episodeId,
    template_id: "candy_arcade",
    assets,
  };
  await input.repository.writeQuizAssetResolution(input.channelId, input.episodeId, resolution);
  return { resolution, issues };
}
