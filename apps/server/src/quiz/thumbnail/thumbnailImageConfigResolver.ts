import {
  DEFAULT_GPTI2_MODEL,
  IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
  IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
  resolveImgStudioFallbackLevel3Model,
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

function resolveGpti2ApiKey(
  imageConfig?: ProviderAssetImageConfig,
  imageFallbackConfig?: ProviderAssetImageFallbackConfig,
): string {
  return (
    imageConfig?.gpti2_api_key ||
    imageFallbackConfig?.gpti2_api_key ||
    (imageConfig?.provider === "gpti2" ? imageConfig?.api_key : undefined) ||
    process.env.GPTI2_API_KEY ||
    process.env.SHOPAIKEY_API_KEY ||
    ""
  );
}

function resolveGpti2Model(
  imageConfig?: ProviderAssetImageConfig,
  imageFallbackConfig?: ProviderAssetImageFallbackConfig,
): string {
  return (
    imageConfig?.gpti2_model ||
    imageFallbackConfig?.gpti2_model ||
    (imageConfig?.provider === "gpti2" ? imageConfig?.model : undefined) ||
    DEFAULT_GPTI2_MODEL
  );
}

function resolveImgStudioApiKey(
  imageConfig?: ProviderAssetImageConfig,
  imageFallbackConfig?: ProviderAssetImageFallbackConfig,
): string {
  return (
    imageFallbackConfig?.api_key ||
    (imageConfig?.provider === "imgstudio" ? imageConfig?.api_key : undefined) ||
    process.env.IMGSTUDIO_API_KEY ||
    ""
  );
}

function buildThumbnailFallbackConfig(
  imageFallbackConfig: ProviderAssetImageFallbackConfig | undefined,
  credentials: { imgStudioApiKey: string; gpti2ApiKey: string; gpti2Model: string },
): ProviderAssetImageFallbackConfig {
  return {
    enabled: imageFallbackConfig?.enabled !== false,
    provider: "imgstudio",
    api_key: credentials.imgStudioApiKey,
    base_url: imageFallbackConfig?.base_url || "https://imgstudio.site",
    model: IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
    level1_model: imageFallbackConfig?.level1_model || IMGSTUDIO_QWEN_IMAGE_3_PRO_MODEL_ID,
    level2_model: imageFallbackConfig?.level2_model || IMGSTUDIO_GEMINI_3_1_FLASH_MODEL_ID,
    level3_model: resolveImgStudioFallbackLevel3Model(imageFallbackConfig?.level3_model),
    resolution: imageFallbackConfig?.resolution || "2K",
    quality: imageFallbackConfig?.quality || "standard",
    gpti2_api_key: credentials.gpti2ApiKey,
    gpti2_model: credentials.gpti2Model,
  };
}

/**
 * Resolves image generation and fallback configurations specifically for YouTube thumbnails.
 *
 * Operational contract:
 * - Primary provider is strictly GPTi2 due to superior fidelity for complex thumbnail compositions.
 * - Fallback cascade: Tier 1 Qwen Image 3.0 Pro -> Tier 2 Gemini 3.1 Flash -> Tier 3 Krea 2 Turbo.
 * - Custom provider with an explicit base URL (e.g., in unit test harnesses) is preserved if specified.
 */
export function resolveThumbnailImageConfigs(
  imageConfig?: ProviderAssetImageConfig,
  imageFallbackConfig?: ProviderAssetImageFallbackConfig,
): ResolvedThumbnailImageConfigs {
  const isCustomMock = imageConfig?.provider === "custom" && Boolean(imageConfig?.base_url);

  // 1. Resolve GPTi2 API Key for Primary Thumbnail generation
  const gpti2ApiKey = resolveGpti2ApiKey(imageConfig, imageFallbackConfig);

  // 2. Resolve GPTi2 Model for Primary Thumbnail generation
  const gpti2Model = resolveGpti2Model(imageConfig, imageFallbackConfig);

  // 3. Resolve ImgStudio API Key for Fallback Thumbnail generation
  const imgStudioApiKey = resolveImgStudioApiKey(imageConfig, imageFallbackConfig);

  const resolvedImageConfig: ProviderAssetImageConfig = {
    ...imageConfig,
    provider: isCustomMock ? "custom" : "gpti2",
    api_key: isCustomMock ? imageConfig?.api_key : gpti2ApiKey,
    model: isCustomMock ? imageConfig?.model : gpti2Model,
    gpti2_api_key: gpti2ApiKey,
    gpti2_model: gpti2Model,
  };

  const resolvedFallbackConfig = buildThumbnailFallbackConfig(imageFallbackConfig, { imgStudioApiKey, gpti2ApiKey, gpti2Model });

  return {
    configuredProvider: resolvedImageConfig.provider || "gpti2",
    imageConfig: resolvedImageConfig,
    imageFallbackConfig: resolvedFallbackConfig,
  };
}
