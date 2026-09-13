import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import { ImgStudioQuizImageProvider } from "../../../../providers/imgstudio/index.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";

const MAX_GENERATION_ATTEMPTS = 3;

/**
 * Strategy for generating quiz image assets using ImgStudio (primary or tier-1 fallback).
 */
export async function generateImgStudioAsset(input: ProviderAssetInput): Promise<ProviderAssetOutput> {
  const { repository, channelId, episodeId, request, fingerprint, compiledPrompt, imageFallbackConfig, imageConfig, logger } = input;
  const apiKey =
    imageFallbackConfig?.api_key ||
    (input.configuredProvider === "imgstudio" ? imageConfig?.api_key : "") ||
    process.env.IMGSTUDIO_API_KEY ||
    "";

  const provider = new ImgStudioQuizImageProvider(
    repository,
    { channelId, episodeId },
    {
      apiKey,
      baseUrl: imageFallbackConfig?.base_url || imageConfig?.base_url || "https://imgstudio.site",
      model: imageFallbackConfig?.model || imageConfig?.model || IMGSTUDIO_DEFAULT_MODEL_ID,
      resolution: imageFallbackConfig?.resolution || "2K",
      quality: imageFallbackConfig?.quality || "standard",
    },
  );

  let generated: Awaited<ReturnType<typeof provider.generateAsset>> | null = null;

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
      if (attempt < MAX_GENERATION_ATTEMPTS) {
        logger.warn(
          `ImgStudio asset ${request.asset_id} generation attempt ${attempt} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${attempt * 500}ms...`,
          { profileId: channelId, workerId: episodeId },
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        continue;
      }
      throw err;
    }
  }

  if (!generated) {
    throw new Error(`Failed to generate ImgStudio asset ${request.asset_id}`);
  }

  return {
    entry: {
      ...request,
      fingerprint,
      path: generated.path,
      source: "fallback",
      fallback_tier: 1,
    },
    tier3Fallback: false,
  };
}
