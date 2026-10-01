import { AntigravityImageChainProvider } from "../../../../providers/antigravityImageChain.js";
import { ShopAiKeyQuizImageProvider } from "../../../../providers/shopAiKeyImage.js";
import { isContentFilterError } from "../../../../utils/promptSanitizer.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";
import { trackAntigravityUsage } from "../utils/assetPricingTracker.js";
import { generateShopAiKeyAsset } from "./shopAiKeyStrategy.js";
import { generateGoogleImagenAsset } from "./googleImagenStrategy.js";

/**
 * Fallback to alternative provider when Antigravity client is unsupported or unavailable.
 */
async function fallbackFromAntigravity(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { channelId, episodeId, request, imageConfig, logger } = input;
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

/**
 * Strategy for generating quiz image assets using the Antigravity multi-step image chain (single attempt).
 * Falls back to ShopAiKey or Google Imagen if Antigravity is unsupported.
 */
export async function generateAntigravityAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, antigravityClient, logger } = input;
  input.cancellationSignal?.throwIfAborted();

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

  let result: Awaited<ReturnType<typeof chainProvider.generateReference>>;
  try {
    result = await chainProvider.generateReference(compiledPrompt, input.cancellationSignal);
  } catch (err) {
    input.cancellationSignal?.throwIfAborted();
    if (isContentFilterError(err)) {
      throw err;
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    const isClientUnsupported = /startThread is not a function|ANTIGRAVITY_CLIENT_UNSUPPORTED/i.test(errMsg);
    if (isClientUnsupported) {
      logger.warn(
        `Antigravity client unsupported for ${request.asset_id}: ${errMsg}. Falling back to alternative provider.`,
        { profileId: channelId, workerId: episodeId },
      );
      return fallbackFromAntigravity(input);
    }
    throw err;
  }

  if (!result) {
    return fallbackFromAntigravity(input);
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
