import {
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
} from "@studio/shared";
import type {
  ProviderAssetImageConfig,
  ProviderAssetImageFallbackConfig,
} from "../assets/resolvers/types/providerAsset.types.js";

export interface ResolvedThumbnailImageConfigs {
  configuredProvider: string;
  imageConfig: ProviderAssetImageConfig;
  imageFallbackConfig: ProviderAssetImageFallbackConfig;
}

/**
 * Resolves image generation and fallback configurations specifically for YouTube thumbnails.
 *
 * Operational contract:
 * - Primary provider is strictly GPTi2 due to superior fidelity for complex thumbnail compositions.
 * - Fallback 1 is ImgStudio with Qwen Image 3.0 Pro (2d059365-a09a-4fd5-aa9e-b5335d09bbe9).
 * - Custom provider with an explicit base URL (e.g., in unit test harnesses) is preserved if specified.
 */
export function resolveThumbnailImageConfigs(
  imageConfig?: ProviderAssetImageConfig,
  imageFallbackConfig?: ProviderAssetImageFallbackConfig,
): ResolvedThumbnailImageConfigs {
  const isCustomMock = imageConfig?.provider === "custom" && Boolean(imageConfig?.base_url);

  // 1. Resolve GPTi2 API Key for Primary Thumbnail generation
  const gpti2ApiKey =
    imageConfig?.gpti2_api_key ||
    imageFallbackConfig?.gpti2_api_key ||
    (imageConfig?.provider === "gpti2" ? imageConfig?.api_key : undefined) ||
    process.env.GPTI2_API_KEY ||
    process.env.SHOPAIKEY_API_KEY ||
    "";

  // 2. Resolve GPTi2 Model for Primary Thumbnail generation
  const gpti2Model =
    imageConfig?.gpti2_model ||
    imageFallbackConfig?.gpti2_model ||
    (imageConfig?.provider === "gpti2" ? imageConfig?.model : undefined) ||
    "gpt-image-2.5-flare";

  // 3. Resolve ImgStudio API Key for Fallback Thumbnail generation
  const imgStudioApiKey =
    imageFallbackConfig?.api_key ||
    (imageConfig?.provider === "imgstudio" ? imageConfig?.api_key : undefined) ||
    process.env.IMGSTUDIO_API_KEY ||
    "";

  const resolvedImageConfig: ProviderAssetImageConfig = {
    ...imageConfig,
    provider: isCustomMock ? "custom" : "gpti2",
    api_key: isCustomMock ? imageConfig?.api_key : gpti2ApiKey,
    model: isCustomMock ? imageConfig?.model : gpti2Model,
    gpti2_api_key: gpti2ApiKey,
    gpti2_model: gpti2Model,
  };

  const resolvedFallbackConfig: ProviderAssetImageFallbackConfig = {
    enabled: imageFallbackConfig?.enabled !== false,
    provider: "imgstudio",
    api_key: imgStudioApiKey,
    base_url: imageFallbackConfig?.base_url || "https://imgstudio.site",
    // In our 3-tier cascade, when primary is GPTi2, Level 1 (GPTi2) is skipped,
    // so level2_model is the first fallback tier executed.
    // For thumbnail, this must be ImgStudio Qwen Image 3.0 Pro.
    model: IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
    level2_model: IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
    level3_model: imageFallbackConfig?.level3_model || IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
    resolution: imageFallbackConfig?.resolution || "2K",
    quality: imageFallbackConfig?.quality || "standard",
    gpti2_api_key: gpti2ApiKey,
    gpti2_model: gpti2Model,
  };

  return {
    configuredProvider: resolvedImageConfig.provider || "gpti2",
    imageConfig: resolvedImageConfig,
    imageFallbackConfig: resolvedFallbackConfig,
  };
}
