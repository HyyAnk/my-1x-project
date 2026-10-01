import type { QuizAssetPlan, QuizAssetResolution, QuizIssue } from "@studio/shared";
import type { StudioLogger } from "../../../logger.js";
import { assetFingerprint } from "../assetFingerprint.js";
import { compileQuizAssetPrompt } from "../promptCompiler.js";
import { resolveQuizImageProviderName } from "../assetValidator.js";
import { syncHeroImageToBundle } from "./bundleAssetSync.js";
import { generateAssetWithProvider } from "./providerAssetResolver.js";
import { createQuizAssetIssue } from "./assetErrorClassifier.js";
import {
  tryReuseCachedAsset,
  tryReuseExplicitBundleAsset,
} from "./reusableAssetResolver.js";
import type { ProviderCircuitBreaker } from "./circuitBreaker.js";
import type { ResolveQuizAssetsInput } from "../resolveQuizAssets.js";

export interface SingleAssetResolveParams {
  request: QuizAssetPlan["assets"][number];
  round: number;
  maxRounds: number;
  input: ResolveQuizAssetsInput;
  byFingerprint: Map<string, QuizAssetResolution["assets"][number]>;
  consistencyGroups: Map<string, QuizAssetPlan["consistency_groups"][number]>;
  logger: StudioLogger;
  activeEngine: "codex" | "antigravity";
  imgStudioRunId: string;
  circuitBreaker: ProviderCircuitBreaker;
}

export interface SingleAssetResolveOutput {
  entry?: QuizAssetResolution["assets"][number];
  issue?: QuizIssue;
  reused: boolean;
}

/**
 * Attempts to reuse an existing asset from the explicit bundle or fingerprint cache.
 */
async function findReusableAsset(params: {
  input: ResolveQuizAssetsInput;
  request: QuizAssetPlan["assets"][number];
  fingerprint: string;
  bundleNumber: number;
  byFingerprint: Map<string, QuizAssetResolution["assets"][number]>;
}): Promise<{ entry: QuizAssetResolution["assets"][number]; issue?: QuizIssue } | null> {
  const { input, request, fingerprint, bundleNumber, byFingerprint } = params;

  const explicitEntry = await tryReuseExplicitBundleAsset({
    repository: input.repository,
    channelId: input.channelId,
    episodeId: input.episodeId,
    request,
    fingerprint,
    bundleNumber,
  });
  if (explicitEntry) {
    return { entry: explicitEntry };
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
    return { entry: cachedResult.entry, issue: cachedResult.issue };
  }

  return null;
}

/**
 * Handles post-generation tasks such as issuing degraded fallback warnings
 * or synchronizing hero images to bundle directories.
 */
async function handlePostGeneration(params: {
  input: ResolveQuizAssetsInput;
  request: QuizAssetPlan["assets"][number];
  bundleNumber: number;
  generated: { entry: QuizAssetResolution["assets"][number]; tier3Fallback: boolean };
}): Promise<QuizIssue | undefined> {
  const { input, request, bundleNumber, generated } = params;

  if (generated.tier3Fallback) {
    return createQuizAssetIssue(
      request,
      "asset_fallback_degraded",
      "warning",
      `Asset ${request.asset_id} used Tier 3 deterministic fallback. Visual review recommended.`,
      "Inspect the generated fallback card or replace with a dedicated image.",
    );
  }

  if (request.purpose === "hero_question_image") {
    await syncHeroImageToBundle(input.repository, input.channelId, input.episodeId, bundleNumber, generated.entry.path);
  }

  return undefined;
}

/**
 * Resolves a single quiz asset through prompt compilation, cache reuse,
 * provider generation with circuit breaker forwarding, and bundle synchronization.
 */
export async function resolveSingleAsset(params: SingleAssetResolveParams): Promise<SingleAssetResolveOutput> {
  const {
    request,
    round,
    maxRounds,
    input,
    byFingerprint,
    consistencyGroups,
    logger,
    activeEngine,
    imgStudioRunId,
    circuitBreaker,
  } = params;

  input.cancellationSignal?.throwIfAborted();

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

  const reusable = await findReusableAsset({ input, request, fingerprint, bundleNumber, byFingerprint });
  if (reusable) {
    return { entry: reusable.entry, issue: reusable.issue, reused: true };
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
    imgStudioRunId,
    circuitBreaker,
    cancellationSignal: input.cancellationSignal,
    logger,
  });
  input.cancellationSignal?.throwIfAborted();

  const issue = await handlePostGeneration({ input, request, bundleNumber, generated });
  return { entry: generated.entry, issue, reused: false };
}
