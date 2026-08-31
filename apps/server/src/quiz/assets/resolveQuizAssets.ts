import { readFile } from "node:fs/promises";
import type { QuizAssetPlan, QuizAssetResolution, QuizImageStyle, QuizIssue } from "@studio/shared";
import { StudioLogger } from "../../logger.js";
import type { RepositoryService } from "../../repository.js";
import { Gpti2QuizImageProvider } from "../../providers/gpti2Image.js";
import { ShopAiKeyQuizImageProvider } from "../../providers/shopAiKeyImage.js";
import { assetFingerprint } from "./assetFingerprint.js";
import { compileQuizAssetPrompt } from "./promptCompiler.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { isValidQuizAsset, isQuizAssetResolutionComplete } from "./assetValidator.js";
import { syncHeroImageToBundle } from "./resolvers/bundleAssetSync.js";
import { generateAssetWithProvider } from "./resolvers/providerAssetResolver.js";
import type { AntigravityClient } from "../../antigravity.js";

export { isValidQuizAsset, isQuizAssetResolutionComplete };

export async function resolveQuizAssets(input: {
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
    provider?: "gpti2" | "shopaikey" | "custom";
    base_url?: string;
    quality?: string;
  };
  onProgress?: (progress: { completed: number; total: number; reused: boolean }) => Promise<void> | void;
  maxRounds?: number;
}): Promise<{ resolution: QuizAssetResolution; issues: QuizIssue[] }> {
  const existing = await input.repository.readQuizAssetResolution(input.channelId, input.episodeId);
  const byFingerprint = new Map(existing?.assets.map((asset) => [asset.fingerprint, asset]) ?? []);
  const resolvedMap = new Map<string, QuizAssetResolution["assets"][number]>();
  const issues: QuizIssue[] = [];
  const logger = new StudioLogger(input.repository.rootDirectory);
  const consistencyGroups = new Map(input.plan.consistency_groups.map((group) => [group.group_id, group]));
  const activeEngine = input.activeEngine ?? "codex";
  const maxRounds = input.maxRounds ?? 3;

  // Pre-load valid existing assets
  if (existing?.assets) {
    for (const asset of existing.assets) {
      if (await isValidQuizAsset(input.repository, input.channelId, input.episodeId, asset.path)) {
        resolvedMap.set(asset.asset_id, asset);
      }
    }
  }

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

  for (let round = 1; round <= maxRounds; round++) {
    const pendingRequests = input.plan.assets.filter((req) => !resolvedMap.has(req.asset_id));
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
      const providerName =
        configuredProvider === "gpti2" && Gpti2QuizImageProvider.isConfigured(input.imageConfig?.api_key)
          ? "gpti2"
          : configuredProvider === "shopaikey" && (input.imageConfig?.api_key || ShopAiKeyQuizImageProvider.isConfigured())
          ? "shopaikey"
          : configuredProvider === "custom" && input.imageConfig?.api_key
          ? "custom"
          : activeEngine === "antigravity"
          ? "antigravity-chain"
          : ShopAiKeyQuizImageProvider.isConfigured(input.imageConfig?.api_key)
          ? "shopaikey"
          : "inline-fallback";
      const fingerprint = assetFingerprint(request, providerName, compiled.cacheVersion);
      const cached = byFingerprint.get(fingerprint);
      const bundleNumber = request.question_id ? Number(/^question-(\d+)$/i.exec(request.question_id)?.[1] ?? 0) : 0;
      let existingBundleFile: Awaited<ReturnType<RepositoryService["getBundleImageFile"]>> | null = null;
      if (request.purpose === "hero_question_image" && bundleNumber > 0) {
        const bundleTarget = await input.repository.getBundleImagePath(input.channelId, input.episodeId, bundleNumber);
        existingBundleFile = await input.repository.getBundleImageFile(input.channelId, input.episodeId, bundleTarget.filename).catch(() => null);
      }

      try {
        if (existingBundleFile) {
          const bundleBytes = new Uint8Array(await readFile(existingBundleFile.absolutePath));
          const quizAssetPath = await input.repository.writeQuizImageAsset(
            input.channelId,
            input.episodeId,
            request.asset_id,
            fingerprint,
            bundleBytes,
            {
              price_vnd: existingBundleFile.price_vnd,
              price_breakdown: existingBundleFile.price_breakdown,
              model: existingBundleFile.model,
              aspect_ratio: existingBundleFile.aspect_ratio,
            },
          );
          resolvedMap.set(request.asset_id, {
            ...request,
            fingerprint,
            path: quizAssetPath,
            source: "explicit_episode",
          });
          reused = true;
        } else if (cached && (await isValidQuizAsset(input.repository, input.channelId, input.episodeId, cached.path))) {
          resolvedMap.set(request.asset_id, {
            ...request,
            fingerprint,
            path: cached.path,
            source: "cache",
            fallback_tier: cached.fallback_tier,
            degraded: cached.degraded,
          });
          if (cached.degraded || cached.fallback_tier === 3) {
            issues.push(issue(request, "asset_fallback_degraded", "warning", `Asset ${request.asset_id} used Tier 3 deterministic fallback. Visual review recommended.`, "Inspect the generated fallback card or replace with a dedicated image."));
          }
          reused = true;
        } else {
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
            logger,
          });
          resolvedMap.set(request.asset_id, generated.entry);
          if (generated.tier3Fallback) {
            issues.push(issue(request, "asset_fallback_degraded", "warning", `Asset ${request.asset_id} used Tier 3 deterministic fallback. Visual review recommended.`, "Inspect the generated fallback card or replace with a dedicated image."));
          } else if (request.purpose === "hero_question_image") {
            await syncHeroImageToBundle(input.repository, input.channelId, input.episodeId, bundleNumber, generated.entry.path);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === "PROVIDER_UNAVAILABLE") {
          issues.push(issue(request, "asset_provider_unavailable", "blocker", "A semantically critical visual asset needs image generation, but no image provider is configured.", "Configure an image provider (gpti2.store, ShopAiKey, or Custom) in Settings or switch to Antigravity engine before rendering."));
        } else if (round === maxRounds) {
          issues.push(issue(request, "asset_generation_failed", "blocker", `Image generation failed for ${request.asset_id} after ${maxRounds} retry rounds: ${error instanceof Error ? error.message : "unknown error"}`, "Retry generation or attach the exact semantic asset before rendering."));
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

  for (const group of input.plan.consistency_groups) {
    const groupAssets = assets.filter((asset) => asset.consistency_group_id === group.group_id);
    if (groupAssets.length !== group.asset_ids.length) continue;
    issues.push({
      code: "needs_visual_review",
      severity: "warning",
      message: `Visual answer set ${group.group_id} is technically resolved but needs a human fairness review.`,
      next_action: "Review the generated options together for matching medium, framing, lighting, saturation, and no pre-reveal answer cue.",
      question_ids: [group.question_id],
      stage: "assets",
    });
  }

  const resolution: QuizAssetResolution = { schema_version: 2, episode_id: input.episodeId, template_id: "candy_arcade", assets };
  await input.repository.writeQuizAssetResolution(input.channelId, input.episodeId, resolution);
  return { resolution, issues };
}

function issue(request: QuizAssetPlan["assets"][number], code: string, severity: "blocker" | "warning", message: string, nextAction: string): QuizIssue {
  return { code, severity, message, next_action: nextAction, question_ids: request.question_id ? [request.question_id] : [], stage: "assets" };
}
