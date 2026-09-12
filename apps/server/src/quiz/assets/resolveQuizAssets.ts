import type { QuizAssetPlan, QuizAssetResolution, QuizImageStyle, QuizIssue } from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import { assetFingerprint } from "./assetFingerprint.js";
import { compileQuizAssetPrompt } from "./promptCompiler.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { isValidQuizAsset, isQuizAssetResolutionComplete, resolveQuizImageProviderName } from "./assetValidator.js";
import { syncHeroImageToBundle } from "./resolvers/bundleAssetSync.js";
import { generateAssetWithProvider } from "./resolvers/providerAssetResolver.js";
import type { AntigravityClient } from "../../antigravity.js";
import { classifyAssetError, createQuizAssetIssue } from "./resolvers/assetErrorClassifier.js";
import { preloadValidExistingAssets } from "./resolvers/existingAssetPreloader.js";
import {
  hasExplicitAssetProvenance,
  tryReuseCachedAsset,
  tryReuseExplicitBundleAsset,
} from "./resolvers/reusableAssetResolver.js";
import { validateConsistencyGroups } from "./resolvers/consistencyGroupValidator.js";

export { isValidQuizAsset, isQuizAssetResolutionComplete, resolveQuizImageProviderName, hasExplicitAssetProvenance };

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
  onProgress?: (progress: { completed: number; total: number; reused: boolean }) => Promise<void> | void;
  maxRounds?: number;
};

async function resolveSingleAsset(params: {
  request: QuizAssetPlan["assets"][number];
  round: number;
  maxRounds: number;
  input: ResolveQuizAssetsInput;
  byFingerprint: Map<string, QuizAssetResolution["assets"][number]>;
  consistencyGroups: Map<string, QuizAssetPlan["consistency_groups"][number]>;
  logger: StudioLogger;
  activeEngine: "codex" | "antigravity";
}): Promise<{
  entry?: QuizAssetResolution["assets"][number];
  issue?: QuizIssue;
  reused: boolean;
}> {
  const { request, round, maxRounds, input, byFingerprint, consistencyGroups, logger, activeEngine } = params;
  const compiled = compileQuizAssetPrompt(
    request,
    request.consistency_group_id ? consistencyGroups.get(request.consistency_group_id) : undefined,
    input.visualStyle ?? "pixar_3d",
  );
  logger.info(`Compiled prompt for ${request.asset_id}: ${JSON.stringify(compiled.prompt)} (round ${round}/${maxRounds})`, {
    profileId: input.channelId,
    workerId: input.episodeId,
    step: "compile_asset_prompt",
  });

  const configuredProvider = input.imageConfig?.provider ?? "gpti2";
  const providerName = resolveQuizImageProviderName({ imageConfig: input.imageConfig, activeEngine });
  const fingerprint = assetFingerprint(request, providerName, compiled.cacheVersion);
  const bundleNumber = request.question_id ? Number(/^question-(\d+)$/i.exec(request.question_id)?.[1] ?? 0) : 0;

  const explicitEntry = await tryReuseExplicitBundleAsset({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    request,
    fingerprint,
    bundleNumber,
  });
  if (explicitEntry) {
    return { entry: explicitEntry, reused: true };
  }

  const cached = byFingerprint.get(fingerprint);
  const cachedResult = await tryReuseCachedAsset({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    request,
    fingerprint,
    cached,
  });
  if (cachedResult) {
    return { entry: cachedResult.entry, issue: cachedResult.issue, reused: true };
  }

  const generated = await generateAssetWithProvider({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    request,
    fingerprint,
    compiledPrompt: compiled.prompt,
    configuredProvider,
    activeEngine,
    antigravityClient: input.antigravityClient,
    imageConfig: input.imageConfig,
    imageFallbackConfig: input.imageFallbackConfig,
    logger,
  });

  let issue: QuizIssue | undefined;
  if (generated.tier3Fallback) {
    issue = createQuizAssetIssue(
      request,
      "asset_fallback_degraded",
      "warning",
      `Asset ${request.asset_id} used Tier 3 deterministic fallback. Visual review recommended.`,
      "Inspect the generated fallback card or replace with a dedicated image.",
    );
  } else if (request.purpose === "hero_question_image") {
    await syncHeroImageToBundle(input.repository, input.channelId, input.episodeId, bundleNumber, generated.entry.path);
  }

  return { entry: generated.entry, issue, reused: false };
}

export async function resolveQuizAssets(
  input: ResolveQuizAssetsInput,
): Promise<{ resolution: QuizAssetResolution; issues: QuizIssue[] }> {
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

  const persistIncrementalResolution = async () => {
    const currentAssets = input.plan.assets
      .map((req) => resolvedMap.get(req.asset_id))
      .filter((asset): asset is QuizAssetResolution["assets"][number] => Boolean(asset));
    const partialResolution: QuizAssetResolution = {
      schema_version: 2,
      episode_id: input.episodeId,
      template_id: "candy_arcade",
      assets: currentAssets,
    };
    await input.repository.writeQuizAssetResolution(input.channelId, input.episodeId, partialResolution);
  };

  const ASSET_CONCURRENCY = 4;
  const terminalFailed = new Set<string>();

  for (let round = 1; round <= maxRounds; round++) {
    const pendingRequests = input.plan.assets.filter(
      (req) => !resolvedMap.has(req.asset_id) && !terminalFailed.has(req.asset_id),
    );
    if (pendingRequests.length === 0) break;

    if (round > 1) {
      logger.warn(`Quiz assets retry round ${round}/${maxRounds}: regenerating ${pendingRequests.length} missing assets...`, {
        profileId: input.channelId,
        workerId: input.episodeId,
        step: "retry_quiz_assets",
      });
      await new Promise((resolve) => setTimeout(resolve, round * 500));
    } else if (resolvedMap.size > 0) {
      await input.onProgress?.({ completed: resolvedMap.size, total: input.plan.assets.length, reused: true });
    }

    let persistQueue = Promise.resolve();
    const safePersistIncrementalResolution = () => {
      persistQueue = persistQueue.then(() => persistIncrementalResolution()).catch(() => undefined);
      return persistQueue;
    };

    await runConcurrent(pendingRequests, ASSET_CONCURRENCY, async (request) => {
      let reused = false;
      try {
        const result = await resolveSingleAsset({
          request,
          round,
          maxRounds,
          input,
          byFingerprint,
          consistencyGroups,
          logger,
          activeEngine,
        });
        if (result.entry) {
          resolvedMap.set(request.asset_id, result.entry);
        }
        if (result.issue) {
          issues.push(result.issue);
        }
        reused = result.reused;
      } catch (error) {
        const classified = classifyAssetError(request, error, round, maxRounds);
        if (classified) {
          if (classified.terminal) {
            terminalFailed.add(request.asset_id);
          }
          issues.push(classified.issue);
        }
      } finally {
        if (resolvedMap.has(request.asset_id)) {
          void safePersistIncrementalResolution();
        }
        await input.onProgress?.({ completed: resolvedMap.size, total: input.plan.assets.length, reused });
      }
    });

    await safePersistIncrementalResolution();
  }

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
