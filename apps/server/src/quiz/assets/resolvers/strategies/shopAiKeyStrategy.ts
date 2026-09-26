import { RepositoryError } from "../../../../repository.js";
import { ShopAiKeyQuizImageProvider } from "../../../../providers/shopAiKeyImage.js";
import { isContentFilterError } from "../../../../utils/promptSanitizer.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";
import { trackShopAiKeyUsage } from "../utils/assetPricingTracker.js";

const MAX_GENERATION_ATTEMPTS = 2; // Initial attempt + max 1 retry

/**
 * Strategy for generating quiz image assets using the ShopAiKey / Custom OpenAI-compatible provider.
 */
export async function generateShopAiKeyAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, configuredProvider, imageConfig, logger } = input;
  const provider = new ShopAiKeyQuizImageProvider(
    repository,
    { channelId, episodeId },
    {
      apiKey: imageConfig?.api_key || process.env.SHOPAIKEY_API_KEY,
      baseUrl:
        imageConfig?.base_url ||
        (configuredProvider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "https://api.openai.com/v1"),
      model: imageConfig?.model || "gpt-image-2",
      quality: imageConfig?.quality,
    },
  );

  let generated: Awaited<ReturnType<typeof provider.generateAsset>> | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    input.cancellationSignal?.throwIfAborted();
    try {
      generated = await provider.generateAsset({
        assetId: request.asset_id,
        fingerprint,
        prompt: compiledPrompt,
        aspect_ratio: request.aspect_ratio,
      }, input.cancellationSignal);
      break;
    } catch (err) {
      input.cancellationSignal?.throwIfAborted();
      if (
        isContentFilterError(err) ||
        (err instanceof RepositoryError && err.code === "image_request_size_conflict")
      ) {
        throw err;
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        logger.warn(
          `Quiz asset ${request.asset_id} ${configuredProvider} generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`,
          { profileId: channelId, workerId: episodeId },
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }

  if (!generated) {
    throw new Error(`Failed to generate ${configuredProvider} asset ${request.asset_id}`);
  }

  await trackShopAiKeyUsage(
    repository,
    channelId,
    episodeId,
    request.asset_id,
    request.purpose,
    configuredProvider || "shopaikey",
    imageConfig?.model || "gpt-image-2",
  );

  return {
    entry: { ...request, fingerprint, path: generated.path, source: "provider" },
    tier3Fallback: false,
  };
}
