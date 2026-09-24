import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import { ImgStudioQuizImageProvider } from "../../../../providers/imgstudio/index.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../types/providerAsset.types.js";

export interface ImgStudioAssetOptions {
  modelOverride?: string;
  fallbackTier?: 1 | 2;
  idempotencyScope?: string;
}

/**
 * Strategy for generating quiz image assets using ImgStudio (primary or tier fallback).
 */
export async function generateImgStudioAsset(
  input: ProviderAssetInput,
  options: ImgStudioAssetOptions = {},
): Promise<ProviderAssetOutput> {
  const {
    repository,
    channelId,
    episodeId,
    request,
    fingerprint,
    compiledPrompt,
    imageFallbackConfig,
    imageConfig,
  } = input;
  const isFallback = options.fallbackTier !== undefined;
  const primaryImgStudioConfig = input.configuredProvider === "imgstudio" ? imageConfig : undefined;
  const preferredConfig = isFallback ? imageFallbackConfig : primaryImgStudioConfig;
  const secondaryConfig = isFallback ? primaryImgStudioConfig : imageFallbackConfig;
  const apiKey = preferredConfig?.api_key || secondaryConfig?.api_key || process.env.IMGSTUDIO_API_KEY || "";
  const model = options.modelOverride || preferredConfig?.model || secondaryConfig?.model || IMGSTUDIO_DEFAULT_MODEL_ID;
  const baseUrl = preferredConfig?.base_url || secondaryConfig?.base_url || "https://imgstudio.site";
  const quality = preferredConfig?.quality || secondaryConfig?.quality || "standard";

  const provider = new ImgStudioQuizImageProvider(
    repository,
    { channelId, episodeId },
    {
      apiKey,
      baseUrl,
      model,
      resolution: isFallback ? imageFallbackConfig?.resolution : undefined,
      quality,
      runId: input.imgStudioRunId,
      idempotencyScope: options.idempotencyScope || (options.fallbackTier ? `fallback-level-${options.fallbackTier}` : "primary"),
    },
  );

  const generated = await provider.generateAsset(
    {
      assetId: request.asset_id,
      fingerprint,
      prompt: compiledPrompt,
      aspect_ratio: request.aspect_ratio,
      referenceImageBase64: input.referenceImageBase64,
    },
    input.cancellationSignal,
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
