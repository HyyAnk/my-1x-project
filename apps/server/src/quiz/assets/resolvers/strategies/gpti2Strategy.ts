import { RepositoryError } from "../../../../repository.js";
import { Gpti2QuizImageProvider } from "../../../../providers/gpti2Image.js";
import { isContentFilterError } from "../../../../utils/promptSanitizer.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";
import { trackGpti2Usage } from "../utils/assetPricingTracker.js";

const MAX_GENERATION_ATTEMPTS = 2; // Initial attempt + max 1 retry

/**
 * Strategy for generating quiz image assets using the GPT-I2 provider.
 */
export async function generateGpti2Asset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, imageConfig, logger } = input;
  const provider = new Gpti2QuizImageProvider(
    repository,
    { channelId, episodeId },
    { apiKey: imageConfig?.api_key, model: imageConfig?.model },
  );

  let generated: { path: string; price_vnd?: number; model?: string } | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      generated = await provider.generateAsset({
        assetId: request.asset_id,
        fingerprint,
        prompt: compiledPrompt,
        aspect_ratio: request.aspect_ratio,
      });
      break;
    } catch (err) {
      if (
        isContentFilterError(err) ||
        (err instanceof RepositoryError && err.code === "image_request_size_conflict")
      ) {
        throw err;
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        logger.warn(
          `Quiz asset ${request.asset_id} generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`,
          { profileId: channelId, workerId: episodeId },
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }

  if (!generated) {
    throw new Error(`Failed to generate asset ${request.asset_id}`);
  }

  const gpti2PriceVnd = generated.price_vnd ?? 50;
  const modelName = imageConfig?.model || generated.model || "gpt-image-2";

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
    entry: { ...request, fingerprint, path: generated.path, source: "provider" },
    tier3Fallback: false,
  };
}
