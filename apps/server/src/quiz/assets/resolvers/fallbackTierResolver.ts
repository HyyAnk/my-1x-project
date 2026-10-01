import {
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  IMGSTUDIO_KREA_2_TURBO_MODEL_ID,
} from "@studio/shared";
import { describeImgStudioModel } from "../../../providers/imgstudio/fallbackModels.js";
import { Gpti2QuizImageProvider } from "../../../providers/gpti2Image.js";
import { generateGpti2Asset, generateImgStudioAsset } from "./strategies/index.js";
import { validateAndEnrichAsset } from "./assetEnricher.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "./types/providerAsset.types.js";

/**
 * Attempts Level 1 fallback with GPTi2, short-circuiting if bypassed or not configured.
 */
export async function attemptFallbackLevel1(
  input: ProviderAssetInput,
  nextModel: string = IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
): Promise<ProviderAssetOutput | null> {
  const { channelId, episodeId, request, logger, configuredProvider, imageConfig, imageFallbackConfig } = input;

  if (input.circuitBreaker?.isBypassed("fallback-level-1")) {
    logger.warn(
      `GPTi2 Level 1 circuit breaker tripped for asset ${request.asset_id}. Bypassing Level 1 fallback.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_BYPASS" },
    );
    return null;
  }

  // If primary was already GPTi2 and failed, do not retry GPTi2 in Level 1
  if (configuredProvider === "gpti2") {
    return null;
  }

  const gpti2ApiKey =
    imageFallbackConfig?.gpti2_api_key ||
    imageConfig?.gpti2_api_key ||
    process.env.GPTI2_API_KEY ||
    process.env.SHOPAIKEY_API_KEY ||
    "";

  if (!Gpti2QuizImageProvider.isConfigured(gpti2ApiKey)) {
    return null;
  }

  try {
    const fallbackResult = await generateGpti2Asset(input, { fallbackTier: 1 });
    input.cancellationSignal?.throwIfAborted();
    const validatedFallback = await validateAndEnrichAsset(input, fallbackResult);
    input.circuitBreaker?.recordSuccess("fallback-level-1");
    logger.info(
      `Asset ${request.asset_id} successfully recovered via GPTi2 Level 1 fallback (${validatedFallback.entry.path}).`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_SUCCESS" },
    );
    return validatedFallback;
  } catch (fallback1Error) {
    if (input.cancellationSignal?.aborted) throw fallback1Error;
    input.circuitBreaker?.recordFailure("fallback-level-1", request.asset_id);
    const fb1Reason = fallback1Error instanceof Error ? fallback1Error.message : String(fallback1Error);
    logger.warn(
      `GPTi2 Level 1 failed for asset ${request.asset_id} (${fb1Reason}). Starting Level 2 with ${describeImgStudioModel(nextModel)}.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_L2_TRIGGERED" },
    );
    return null;
  }
}

/**
 * Attempts Level 2 fallback with ImgStudio Gemini-3.1-Flash-Image, short-circuiting if bypassed.
 */
export async function attemptFallbackLevel2(
  input: ProviderAssetInput,
  model: string = IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  nextModel: string = IMGSTUDIO_KREA_2_TURBO_MODEL_ID,
): Promise<ProviderAssetOutput | null> {
  const { channelId, episodeId, request, logger } = input;

  if (input.circuitBreaker?.isBypassed("fallback-level-2")) {
    logger.warn(
      `ImgStudio Level 2 circuit breaker tripped for asset ${request.asset_id}. Bypassing Level 2 fallback.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_BYPASS" },
    );
    return null;
  }

  try {
    const fallback2Result = await generateImgStudioAsset(input, {
      modelOverride: model,
      fallbackTier: 2,
      idempotencyScope: "fallback-level-2",
    });
    input.cancellationSignal?.throwIfAborted();
    const validatedFallback2 = await validateAndEnrichAsset(input, fallback2Result);
    input.circuitBreaker?.recordSuccess("fallback-level-2");
    logger.info(
      `Asset ${request.asset_id} successfully recovered via ImgStudio Level 2 fallback (${validatedFallback2.entry.path}).`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_L2_SUCCESS" },
    );
    return validatedFallback2;
  } catch (fallback2Error) {
    if (input.cancellationSignal?.aborted) throw fallback2Error;
    input.circuitBreaker?.recordFailure("fallback-level-2", request.asset_id);
    const fb2Reason = fallback2Error instanceof Error ? fallback2Error.message : String(fallback2Error);
    logger.warn(
      `ImgStudio Level 2 failed for asset ${request.asset_id} (${fb2Reason}). Starting Level 3 with ${describeImgStudioModel(nextModel)}.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_L3_TRIGGERED" },
    );
    return null;
  }
}

/**
 * Attempts Level 3 fallback with ImgStudio Krea 2 Turbo, short-circuiting if bypassed.
 */
export async function attemptFallbackLevel3(
  input: ProviderAssetInput,
  model: string = IMGSTUDIO_KREA_2_TURBO_MODEL_ID,
): Promise<ProviderAssetOutput> {
  const { channelId, episodeId, request, logger } = input;

  if (input.circuitBreaker?.isBypassed("fallback-level-3")) {
    logger.warn(
      `ImgStudio Level 3 circuit breaker tripped for asset ${request.asset_id}. Bypassing Level 3 fallback.`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_BYPASS" },
    );
    throw new Error(`ImgStudio Level 3 circuit breaker tripped for asset ${request.asset_id}`);
  }

  try {
    const fallback3Result = await generateImgStudioAsset(input, {
      modelOverride: model,
      fallbackTier: 3,
      idempotencyScope: "fallback-level-3",
    });
    input.cancellationSignal?.throwIfAborted();
    const validatedFallback3 = await validateAndEnrichAsset(input, fallback3Result);
    input.circuitBreaker?.recordSuccess("fallback-level-3");
    logger.info(
      `Asset ${request.asset_id} successfully recovered via ImgStudio Level 3 fallback (${validatedFallback3.entry.path}).`,
      { profileId: channelId, workerId: episodeId, step: "IMAGE_FALLBACK_L3_SUCCESS" },
    );
    return validatedFallback3;
  } catch (fallback3Error) {
    if (input.cancellationSignal?.aborted) throw fallback3Error;
    input.circuitBreaker?.recordFailure("fallback-level-3", request.asset_id);
    logger.error(
      `ImgStudio Level 3 failed for asset ${request.asset_id}: ${fallback3Error instanceof Error ? fallback3Error.message : String(fallback3Error)}`,
      { profileId: channelId, workerId: episodeId },
    );
    throw fallback3Error;
  }
}

/**
 * Executes 3-tier fallback cascade (Level 1: GPTi2 -> Level 2: Gemini -> Level 3: Krea 2 Turbo).
 */
export async function executeFallbackTiers(
  input: ProviderAssetInput,
  fallbackModels: { level1?: string; level2: string; level3?: string },
): Promise<ProviderAssetOutput> {
  const level2Model = fallbackModels.level2 || IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID;
  const level3Model = fallbackModels.level3 || IMGSTUDIO_KREA_2_TURBO_MODEL_ID;

  const level1Result = await attemptFallbackLevel1(input, level2Model);
  if (level1Result) {
    return level1Result;
  }

  const level2Result = await attemptFallbackLevel2(input, level2Model, level3Model);
  if (level2Result) {
    return level2Result;
  }

  return attemptFallbackLevel3(input, level3Model);
}
