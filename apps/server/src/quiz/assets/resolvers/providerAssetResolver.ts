import { Gpti2QuizImageProvider } from "../../../providers/gpti2Image.js";
import { ShopAiKeyQuizImageProvider } from "../../../providers/shopAiKeyImage.js";
import { ImgStudioQuizImageProvider } from "../../../providers/imgstudio/index.js";
import {
  describeImgStudioModel,
  resolveImgStudioFallbackModels,
} from "../../../providers/imgstudio/fallbackModels.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "./types/providerAsset.types.js";
import {
  generateGpti2Asset,
  generateShopAiKeyAsset,
  generateGoogleImagenAsset,
  generateImgStudioAsset,
  generateAntigravityAsset,
} from "./strategies/index.js";
import { validateAndEnrichAsset } from "./assetEnricher.js";
import { executeFallbackTiers } from "./fallbackTierResolver.js";

// Re-export types and strategies for 100% backward compatibility
export type {
  ProviderAssetInput,
  ProviderAssetOutput,
  ProviderAssetImageConfig,
  ProviderAssetImageFallbackConfig,
  AssetGenerationStrategy,
} from "./types/providerAsset.types.js";
export * from "./strategies/index.js";
export { validateAndEnrichAsset } from "./assetEnricher.js";
export {
  attemptFallbackLevel1,
  attemptFallbackLevel2,
  attemptFallbackLevel3,
  executeFallbackTiers,
} from "./fallbackTierResolver.js";

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
 * Resolves a quiz asset with the configured primary provider and two-tier ImgStudio fallback,
 * protected by an optional circuit breaker.
 */
export async function resolveProviderAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { channelId, episodeId, request, imageConfig, imageFallbackConfig, logger } = input;
  const fallbackModels = resolveImgStudioFallbackModels(
    imageFallbackConfig?.level2_model,
    imageFallbackConfig?.level3_model,
  );
  const imgStudioFallbackKey = imageFallbackConfig?.api_key;
  const gpti2FallbackKey = imageFallbackConfig?.gpti2_api_key;
  const isFallbackEnabled =
    Boolean(imageFallbackConfig) &&
    imageFallbackConfig?.enabled !== false &&
    (ImgStudioQuizImageProvider.isConfigured(imgStudioFallbackKey) ||
      Gpti2QuizImageProvider.isConfigured(gpti2FallbackKey));
  input.cancellationSignal?.throwIfAborted();

  const isPrimaryBypassed = Boolean(input.circuitBreaker?.isBypassed("primary"));

  if (isPrimaryBypassed) {
    logger.warn(
      `Primary image provider circuit breaker tripped for asset ${request.asset_id}. Bypassing primary tier.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_PROVIDER_BYPASS" },
    );
  } else {
    try {
      const primaryResult = await attemptPrimaryProvider(input);
      input.cancellationSignal?.throwIfAborted();
      const validated = await validateAndEnrichAsset(input, primaryResult);
      input.circuitBreaker?.recordSuccess("primary");
      return validated;
    } catch (primaryError) {
      if (input.cancellationSignal?.aborted) throw primaryError;
      input.circuitBreaker?.recordFailure("primary", request.asset_id);
      if (!isFallbackEnabled) {
        throw primaryError;
      }
      const reason = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const nextStepDesc = input.configuredProvider === "gpti2"
        ? `Starting Level 2 with ${describeImgStudioModel(fallbackModels.level2)}`
        : "Starting Level 1 with GPTi2";
      logger.warn(
        `Primary image provider failed for asset ${request.asset_id} (${reason}). ${nextStepDesc}.`,
        { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_TRIGGERED" },
      );
    }
  }

  if (!isFallbackEnabled) {
    throw new Error(`Primary provider bypassed and fallback disabled for asset ${request.asset_id}`);
  }

  return executeFallbackTiers(input, fallbackModels);
}

/**
 * Backward compatibility alias for resolveProviderAsset.
 */
export async function generateAssetWithProvider(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  return resolveProviderAsset(input);
}
