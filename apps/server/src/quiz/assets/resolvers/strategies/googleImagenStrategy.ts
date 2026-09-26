import { GoogleImagenProvider } from "../../../../providers/googleImagen.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";
import { trackGoogleUsage } from "../utils/assetPricingTracker.js";

/**
 * Strategy for generating quiz image assets using Google Imagen / Gemini Flash Image provider.
 */
export async function generateGoogleImagenAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, imageConfig } = input;
  const model = imageConfig?.model || "gemini-3.1-flash-image";
  const provider = new GoogleImagenProvider(
    repository,
    { channelId, episodeId, assetId: request.asset_id, fingerprint, aspectRatio: request.aspect_ratio },
    imageConfig?.api_key || process.env.GEMINI_API_KEY || "",
    model,
    imageConfig?.base_url,
  );

  const result = await provider.generateReference(compiledPrompt, input.cancellationSignal);

  await trackGoogleUsage(
    repository,
    channelId,
    episodeId,
    request.asset_id,
    request.purpose,
    model,
  );

  return {
    entry: {
      ...request,
      fingerprint,
      path: result.asset_path,
      source: "provider",
      fallback_tier: result.fallback_tier,
      degraded: result.degraded,
    },
    tier3Fallback: false,
  };
}

export const generateGoogleAsset = generateGoogleImagenAsset;
