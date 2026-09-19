import { AntigravityImageChainProvider } from "../../../../providers/antigravityImageChain.js";
import { ShopAiKeyQuizImageProvider } from "../../../../providers/shopAiKeyImage.js";
import { isContentFilterError } from "../../../../utils/promptSanitizer.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";
import { trackAntigravityUsage } from "../utils/assetPricingTracker.js";
import { generateShopAiKeyAsset } from "./shopAiKeyStrategy.js";
import { generateGoogleImagenAsset } from "./googleImagenStrategy.js";

const MAX_GENERATION_ATTEMPTS = 2; // Initial attempt + max 1 retry

/**
 * Strategy for generating quiz image assets using the Antigravity multi-step image chain.
 * Falls back to ShopAiKey or Google Imagen if Antigravity is unavailable or unsupported.
 */
export async function generateAntigravityAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, antigravityClient, logger, imageConfig } = input;
  const episode = await repository.getEpisode(channelId, episodeId);
  const chainProvider = new AntigravityImageChainProvider(
    repository,
    {
      channelId,
      episodeId,
      assetId: request.asset_id,
      fingerprint,
      theme: episode.quiz_config.visual_theme,
      aspectRatio: request.aspect_ratio,
    },
    antigravityClient,
    { allowTier3Fallback: false },
  );

  let result: Awaited<ReturnType<typeof chainProvider.generateReference>> | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      result = await chainProvider.generateReference(compiledPrompt);
      break;
    } catch (err) {
      if (isContentFilterError(err)) {
        throw err;
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      const isClientUnsupported = /startThread is not a function|ANTIGRAVITY_CLIENT_UNSUPPORTED/i.test(errMsg);
      if (isClientUnsupported) {
        logger.warn(
          `Antigravity client unsupported for ${request.asset_id}: ${errMsg}. Skipping further Antigravity attempts.`,
          { profileId: channelId, workerId: episodeId },
        );
        break;
      }
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        logger.warn(
          `Quiz asset ${request.asset_id} Antigravity generation attempt ${attempt} failed (${errMsg}). Retrying in ${attempt * 500}ms...`,
          { profileId: channelId, workerId: episodeId },
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }

  if (!result) {
    if (ShopAiKeyQuizImageProvider.isConfigured(imageConfig?.api_key)) {
      logger.info(`Antigravity generation unavailable for ${request.asset_id}, falling back to ShopAiKey...`, {
        profileId: channelId,
        workerId: episodeId,
      });
      return generateShopAiKeyAsset(input);
    }
    if (imageConfig?.api_key || process.env.GEMINI_API_KEY) {
      logger.info(`Antigravity generation unavailable for ${request.asset_id}, falling back to Google Imagen...`, {
        profileId: channelId,
        workerId: episodeId,
      });
      return generateGoogleImagenAsset(input);
    }
    throw new Error(`Failed to generate Antigravity asset ${request.asset_id}`);
  }

  const isTier3 = Boolean(result.degraded || result.fallback_tier === 3);
  if (!isTier3) {
    await trackAntigravityUsage(repository, channelId, episodeId, request.asset_id, request.purpose);
  }

  return {
    entry: {
      ...request,
      fingerprint,
      path: result.asset_path,
      source: result.fallback_tier === 3 ? "fallback" : "provider",
      fallback_tier: result.fallback_tier,
      degraded: result.degraded,
    },
    tier3Fallback: isTier3,
  };
}
