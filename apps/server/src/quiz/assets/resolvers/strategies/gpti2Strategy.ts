import { DEFAULT_GPTI2_MODEL } from "@studio/shared";
import { RepositoryError } from "../../../../repository.js";
import { Gpti2QuizImageProvider } from "../../../../providers/gpti2Image.js";
import { isContentFilterError } from "../../../../utils/promptSanitizer.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";
import { trackGpti2Usage } from "../utils/assetPricingTracker.js";

const MAX_GENERATION_ATTEMPTS = 2; // Initial attempt + max 1 retry

export interface Gpti2AssetOptions {
  fallbackTier?: number;
}

type GeneratedGpti2Asset = { path: string; price_vnd?: number; model?: string };

function resolveGpti2Credentials(input: ProviderAssetInput, isFallback: boolean): { apiKey: string; model: string } {
  const { imageConfig, imageFallbackConfig } = input;
  const apiKey =
    (isFallback ? imageFallbackConfig?.gpti2_api_key : undefined) ||
    imageConfig?.gpti2_api_key ||
    imageConfig?.api_key ||
    process.env.GPTI2_API_KEY ||
    process.env.SHOPAIKEY_API_KEY ||
    "";
  const model =
    (isFallback ? imageFallbackConfig?.gpti2_model : undefined) ||
    imageConfig?.gpti2_model ||
    imageConfig?.model ||
    DEFAULT_GPTI2_MODEL;
  return { apiKey, model };
}

function isNonRetryableGenerationError(err: unknown): boolean {
  return isContentFilterError(err) || (err instanceof RepositoryError && err.code === "image_request_size_conflict");
}

async function generateWithRetry(
  input: ProviderAssetInput,
  provider: Gpti2QuizImageProvider,
): Promise<GeneratedGpti2Asset | null> {
  const { channelId, episodeId, request, fingerprint, compiledPrompt, logger } = input;
  let generated: GeneratedGpti2Asset | null = null;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    input.cancellationSignal?.throwIfAborted();
    try {
      const assetInput = {
        assetId: request.asset_id,
        fingerprint,
        prompt: compiledPrompt,
        aspect_ratio: request.aspect_ratio,
        referenceImageBase64: input.referenceImageBase64,
      };
      generated = input.cancellationSignal
        ? await provider.generateAsset(assetInput, input.cancellationSignal)
        : await provider.generateAsset(assetInput);
      break;
    } catch (err) {
      input.cancellationSignal?.throwIfAborted();
      if (isNonRetryableGenerationError(err)) {
        throw err;
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        logger?.warn?.(
          `Quiz asset ${request.asset_id} generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`,
          { profileId: channelId, workerId: episodeId },
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }
  return generated;
}

/**
 * Strategy for generating quiz image assets using the GPT-I2 provider.
 */
export async function generateGpti2Asset(
  input: ProviderAssetInput,
  options: Gpti2AssetOptions = {},
): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, imageConfig } = input;
  input.cancellationSignal?.throwIfAborted();

  const provider = new Gpti2QuizImageProvider(
    repository,
    { channelId, episodeId },
    resolveGpti2Credentials(input, options.fallbackTier !== undefined),
  );

  const generated = await generateWithRetry(input, provider);

  if (!generated) {
    throw new Error(`Failed to generate asset ${request.asset_id}`);
  }

  const gpti2PriceVnd = generated.price_vnd ?? 50;
  const modelName = imageConfig?.model || generated.model || DEFAULT_GPTI2_MODEL;

  await trackGpti2Usage(
    repository,
    channelId,
    episodeId,
    request.asset_id,
    request.purpose,
    modelName,
    gpti2PriceVnd,
  );

  return {
    entry: {
      ...request,
      fingerprint,
      path: generated.path,
      source: options.fallbackTier ? "fallback" : "provider",
      fallback_tier: options.fallbackTier,
    },
    tier3Fallback: false,
  };
}
