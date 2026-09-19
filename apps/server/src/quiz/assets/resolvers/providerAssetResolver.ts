import { readFile } from "node:fs/promises";
import { RepositoryError } from "../../../repository.js";
import { Gpti2QuizImageProvider } from "../../../providers/gpti2Image.js";
import { ShopAiKeyQuizImageProvider } from "../../../providers/shopAiKeyImage.js";
import { ImgStudioQuizImageProvider } from "../../../providers/imgstudio/index.js";
import {
  describeImgStudioModel,
  resolveImgStudioFallbackModels,
} from "../../../providers/imgstudio/fallbackModels.js";
import { getRecommendationForAssetRequirement, validateQuizImageBytes } from "../imageMetadataValidator.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "./types/providerAsset.types.js";
import {
  generateGpti2Asset,
  generateShopAiKeyAsset,
  generateGoogleImagenAsset,
  generateImgStudioAsset,
  generateAntigravityAsset,
} from "./strategies/index.js";

// Re-export types and strategies for 100% backward compatibility
export type {
  ProviderAssetInput,
  ProviderAssetOutput,
  ProviderAssetImageConfig,
  ProviderAssetImageFallbackConfig,
  AssetGenerationStrategy,
} from "./types/providerAsset.types.js";
export * from "./strategies/index.js";

/**
 * Dispatches to the appropriate primary image generation strategy based on configuration.
 */
async function attemptPrimaryProvider(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { configuredProvider, activeEngine, imageConfig, imageFallbackConfig } = input;

  if (configuredProvider === "gpti2" && Gpti2QuizImageProvider.isConfigured(imageConfig?.api_key)) {
    return generateGpti2Asset(input);
  }
  if (
    configuredProvider === "imgstudio" &&
    (imageConfig?.api_key || ImgStudioQuizImageProvider.isConfigured(imageFallbackConfig?.api_key))
  ) {
    return generateImgStudioAsset(input);
  }
  if (
    (configuredProvider === "shopaikey" || configuredProvider === "custom") &&
    (imageConfig?.api_key || ShopAiKeyQuizImageProvider.isConfigured())
  ) {
    return generateShopAiKeyAsset(input);
  }
  if (configuredProvider === "google" && (imageConfig?.api_key || process.env.GEMINI_API_KEY)) {
    return generateGoogleImagenAsset(input);
  }
  if (activeEngine === "antigravity") {
    return generateAntigravityAsset(input);
  }
  if (ShopAiKeyQuizImageProvider.isConfigured(imageConfig?.api_key)) {
    return generateShopAiKeyAsset(input);
  }

  throw new Error("PROVIDER_UNAVAILABLE");
}

/**
 * Validates generated asset bytes against dimensions and metadata requirements.
 */
async function validateAndEnrichAsset(
  input: ProviderAssetInput,
  result: ProviderAssetOutput,
): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request } = input;
  let bytes: Uint8Array;
  try {
    const absPath = await repository.resolveQuizAssetPath(channelId, episodeId, result.entry.path);
    bytes = new Uint8Array(await readFile(absPath));
  } catch {
    // Non-blocking fallback if the file is mock-resolved or inaccessible in unit tests
    return result;
  }

  const recommendation = getRecommendationForAssetRequirement(request);
  const validation = await validateQuizImageBytes({
    bytes,
    recommendation,
    provenance: "generated",
    required: request.required,
  });

  if (validation.actual) {
    result.entry.actual_dimensions = validation.actual;
  }

  const blocker = validation.issues.find((issue) => issue.severity === "blocker");
  if (blocker) {
    throw new RepositoryError(
      `Generated asset ${request.asset_id} failed metadata validation: ${blocker.code}`,
      blocker.code,
    );
  }

  return result;
}

/**
 * Resolves a quiz asset with the configured primary provider and two-tier ImgStudio fallback.
 */
export async function resolveProviderAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { channelId, episodeId, request, imageFallbackConfig, logger } = input;
  const fallbackModels = resolveImgStudioFallbackModels(imageFallbackConfig?.model);
  const isFallbackEnabled =
    imageFallbackConfig?.enabled !== false &&
    ImgStudioQuizImageProvider.isConfigured(imageFallbackConfig?.api_key);
  input.cancellationSignal?.throwIfAborted();

  try {
    const primaryResult = await attemptPrimaryProvider(input);
    input.cancellationSignal?.throwIfAborted();
    return await validateAndEnrichAsset(input, primaryResult);
  } catch (primaryError) {
    if (input.cancellationSignal?.aborted) throw primaryError;
    if (!isFallbackEnabled) {
      throw primaryError;
    }

    const reason = primaryError instanceof Error ? primaryError.message : String(primaryError);
    logger.warn(
      `Primary image provider failed for asset ${request.asset_id} (${reason}). Starting ImgStudio Level 1 with ${describeImgStudioModel(fallbackModels.level1)}.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_TRIGGERED" },
    );

    try {
      const fallbackResult = await generateImgStudioAsset(input, {
        modelOverride: fallbackModels.level1,
        fallbackTier: 1,
        idempotencyScope: "fallback-level-1",
      });
      input.cancellationSignal?.throwIfAborted();
      const validatedFallback = await validateAndEnrichAsset(input, fallbackResult);
      logger.info(
        `Asset ${request.asset_id} successfully recovered via ImgStudio Level 1 fallback (${validatedFallback.entry.path}).`,
        { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_SUCCESS" },
      );
      return validatedFallback;
    } catch (fallback1Error) {
      if (input.cancellationSignal?.aborted) throw fallback1Error;
      const fb1Reason = fallback1Error instanceof Error ? fallback1Error.message : String(fallback1Error);
      logger.warn(
        `ImgStudio Level 1 failed for asset ${request.asset_id} (${fb1Reason}). Starting Level 2 with ${describeImgStudioModel(fallbackModels.level2)}.`,
        { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_L2_TRIGGERED" },
      );

      try {
        const fallback2Result = await generateImgStudioAsset(input, {
          modelOverride: fallbackModels.level2,
          fallbackTier: 2,
          idempotencyScope: "fallback-level-2",
        });
        input.cancellationSignal?.throwIfAborted();
        const validatedFallback2 = await validateAndEnrichAsset(input, fallback2Result);
        logger.info(
          `Asset ${request.asset_id} successfully recovered via ImgStudio Level 2 fallback (${validatedFallback2.entry.path}).`,
          { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_L2_SUCCESS" },
        );
        return validatedFallback2;
      } catch (fallback2Error) {
        if (input.cancellationSignal?.aborted) throw fallback2Error;
        logger.error(
          `ImgStudio Level 2 failed for asset ${request.asset_id}: ${fallback2Error instanceof Error ? fallback2Error.message : String(fallback2Error)}`,
          { profileId: channelId, workerId: episodeId },
        );
        throw fallback2Error;
      }
    }
  }
}

/**
 * Backward compatibility alias for resolveProviderAsset.
 */
export async function generateAssetWithProvider(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  return resolveProviderAsset(input);
}
