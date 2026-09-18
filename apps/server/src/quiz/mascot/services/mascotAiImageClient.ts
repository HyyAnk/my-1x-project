import type { AppConfig } from "@studio/shared";
import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import { generateGpti2ImageBytes } from "../../../providers/gpti2Image.js";
import { generateShopAiKeyImageBytes } from "../../../providers/shopAiKeyImage.js";
import { generateImgStudioImageBytes } from "../../../providers/imgstudio/generator.js";
import type { StudioLogger } from "../../../logger.js";
import { removeImageBackground } from "../../../utils/imageMatting.js";
import { retryWithBackoff } from "../../../utils/retryWithBackoff.js";
import { validateMascotPromptContract } from "../../mascotPromptContract.js";

/**
 * Enforces the studio isolation prompt contract before spending an AI call.
 * A violated contract reliably produces matted-unfriendly or multi-character
 * output, so it is treated as a configuration bug rather than a soft warning.
 */
export function assertMascotPromptContract(prompt: string, hasReferenceImage: boolean): void {
  if (!validateMascotPromptContract(prompt, hasReferenceImage)) {
    throw new Error(`Mascot prompt violates the studio isolation contract: "${prompt.slice(0, 120)}..."`);
  }
}

export async function generateMascotAiImageBytes(
  prompt: string,
  imageConfig: AppConfig["image_generation"],
  options: {
    aspectRatio?: "1:1" | "16:9";
    size?: string;
    referenceImageBase64?: string;
    background?: "transparent" | "opaque" | "auto";
    cancellationSignal?: AbortSignal;
    idempotencyKey?: string;
  } = {},
  logger?: StudioLogger,
): Promise<Uint8Array> {
  const apiKey = (
    imageConfig.api_key ||
    process.env.SHOPAIKEY_API_KEY ||
    process.env.GPTI2_API_KEY ||
    process.env.CUSTOM_IMAGE_API_KEY ||
    ""
  ).trim();
  if (!apiKey) {
    throw new Error("No image generation API key configured in Settings or Environment.");
  }

  const provider =
    imageConfig.provider ||
    (imageConfig.base_url?.includes("shopaikey") ? "shopaikey" : process.env.SHOPAIKEY_API_KEY ? "shopaikey" : "gpti2");

  if (provider === "shopaikey" || provider === "custom" || (provider !== "gpti2" && Boolean(imageConfig.base_url))) {
    const baseUrl = imageConfig.base_url || (provider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "https://api.openai.com/v1");
    logger?.info(`Calling ShopAiKey/OpenAI-compatible image generation (${baseUrl})`, { model: imageConfig.model });
    return await generateShopAiKeyImageBytes(prompt, options.cancellationSignal, {
      apiKey,
      baseUrl,
      model: imageConfig.model || "gpt-image-2",
      size: options.size || (options.aspectRatio === "1:1" ? "1024x1024" : "1536x1024"),
      quality: imageConfig.quality || "low",
    });
  }

  logger?.info("Calling gpti2.store image generation", { model: imageConfig.model, hasRef: Boolean(options.referenceImageBase64) });
  const result = await generateGpti2ImageBytes(prompt, {
    apiKey,
    aspect_ratio: options.aspectRatio || "1:1",
    size: options.size || (options.aspectRatio === "1:1" ? "1024x1024" : "1280x720"),
    model: imageConfig.model || "gpt-image-2",
    referenceImageBase64: options.referenceImageBase64,
    referenceStrength: 0.75,
    background: options.background || "transparent",
    cancellationSignal: options.cancellationSignal || AbortSignal.timeout(90_000),
    idempotencyKey: options.idempotencyKey,
  });
  return result.bytes;
}

export interface MascotArtFallbackParams {
  prompt: string;
  hasReferenceImage?: boolean;
  imageConfig: AppConfig["image_generation"];
  imageFallbackConfig?: AppConfig["image_fallback"];
  options?: {
    aspectRatio?: "1:1" | "16:9";
    size?: string;
    referenceImageBase64?: string;
    background?: "transparent" | "opaque" | "auto";
    cancellationSignal?: AbortSignal;
    idempotencyKey?: string;
  };
  logger?: StudioLogger;
  logContext?: Record<string, unknown>;
  actionLabel?: string;
  fallbackArt: () => Uint8Array;
}

/**
 * Unified helper that asserts the prompt contract, executes AI image generation with backoff retry,
 * performs matting / background removal with fallback to raw bytes, attempts ImgStudio fallback if primary fails,
 * and falls back to procedural art when all AI services are disabled or fail.
 */
async function tryPrimaryGeneration(
  params: MascotArtFallbackParams,
  isPrimaryEnabled: boolean,
  isFallbackConfigured: boolean,
): Promise<Uint8Array | null> {
  const { prompt, imageConfig, options = {}, logger, logContext = {}, actionLabel = "mascot art" } = params;
  if (!isPrimaryEnabled) return null;

  try {
    logger?.info(`Generating ${actionLabel}`, logContext);
    return await retryWithBackoff(() => {
      const attemptSignal = options.cancellationSignal
        ? AbortSignal.any([options.cancellationSignal, AbortSignal.timeout(90_000)])
        : AbortSignal.timeout(90_000);
      return generateMascotAiImageBytes(
        prompt,
        imageConfig,
        {
          aspectRatio: options.aspectRatio ?? "1:1",
          size: options.size ?? "1024x1024",
          referenceImageBase64: options.referenceImageBase64,
          background: options.background ?? "opaque",
          cancellationSignal: attemptSignal,
          idempotencyKey: options.idempotencyKey,
        },
        logger,
      );
    });
  } catch (primaryErr) {
    if (options.cancellationSignal?.aborted) {
      throw primaryErr;
    }
    const reason = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    if (isFallbackConfigured) {
      logger?.warn(
        `Primary image provider failed for ${actionLabel} (${reason}). Initiating automatic fallback to ImgStudio...`,
        { ...logContext, step: "IMAGE_FALLBACK_TRIGGERED" },
      );
    } else {
      logger?.warn(`${actionLabel} API failed, using procedural fallback: ${reason}`, logContext);
    }
    return null;
  }
}

async function tryFallbackGeneration(
  params: MascotArtFallbackParams,
  isFallbackConfigured: boolean,
): Promise<Uint8Array | null> {
  const { prompt, imageFallbackConfig, options = {}, logger, logContext = {}, actionLabel = "mascot art" } = params;
  if (!isFallbackConfigured || options.cancellationSignal?.aborted) return null;

  try {
    const fallbackSignal = options.cancellationSignal
      ? AbortSignal.any([options.cancellationSignal, AbortSignal.timeout(90_000)])
      : AbortSignal.timeout(90_000);

    const fallbackModel = (imageFallbackConfig?.model || IMGSTUDIO_DEFAULT_MODEL_ID).trim();
    const fallbackApiKey = (imageFallbackConfig?.api_key || process.env.IMGSTUDIO_API_KEY || "").trim();
    const fallbackBaseUrl = imageFallbackConfig?.base_url || "https://imgstudio.site";
    const fallbackResolution = imageFallbackConfig?.resolution || "2K";
    const fallbackQuality = imageFallbackConfig?.quality || "standard";

    const fallbackResult = await generateImgStudioImageBytes(prompt, {
      apiKey: fallbackApiKey,
      baseUrl: fallbackBaseUrl,
      model: fallbackModel,
      resolution: fallbackResolution,
      quality: fallbackQuality,
      aspect_ratio: options.aspectRatio ?? "1:1",
      referenceImage: options.referenceImageBase64,
      idempotencyKey: options.idempotencyKey ? `${options.idempotencyKey}_fallback` : undefined,
      cancellationSignal: fallbackSignal,
    });
    logger?.info(`Successfully recovered ${actionLabel} via ImgStudio fallback`, {
      ...logContext,
      step: "IMAGE_FALLBACK_SUCCESS",
    });
    return fallbackResult.bytes;
  } catch (fallbackErr) {
    if (options.cancellationSignal?.aborted) {
      throw fallbackErr;
    }
    const reason = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
    logger?.warn(
      `ImgStudio fallback generation also failed for ${actionLabel} (${reason}), using procedural fallback`,
      logContext,
    );
    return null;
  }
}

async function applyMattingWithFallback(
  raw: Uint8Array,
  actionLabel: string,
  logger: MascotArtFallbackParams["logger"],
  logContext: Record<string, unknown>,
): Promise<Uint8Array> {
  try {
    return await removeImageBackground(raw);
  } catch (mattingErr) {
    logger?.warn(
      `${actionLabel} background removal failed, using raw AI image: ${mattingErr instanceof Error ? mattingErr.message : String(mattingErr)}`,
      logContext,
    );
    return raw;
  }
}

/**
 * Unified helper that asserts the prompt contract, executes AI image generation with backoff retry,
 * performs matting / background removal with fallback to raw bytes, attempts ImgStudio fallback if primary fails,
 * and falls back to procedural art when all AI services are disabled or fail.
 */
export async function generateMascotArtWithFallback(params: MascotArtFallbackParams): Promise<{
  mattedBytes: Uint8Array;
  rawBytes: Uint8Array;
  placeholder: boolean;
}> {
  const {
    prompt,
    hasReferenceImage = false,
    imageConfig,
    imageFallbackConfig,
    logger,
    logContext = {},
    actionLabel = "mascot art",
    fallbackArt,
  } = params;

  assertMascotPromptContract(prompt, hasReferenceImage);

  const hasPrimaryApiKey = Boolean(
    imageConfig.api_key ||
      process.env.SHOPAIKEY_API_KEY ||
      process.env.GPTI2_API_KEY ||
      process.env.CUSTOM_IMAGE_API_KEY,
  );
  const isPrimaryEnabled = imageConfig.enabled && hasPrimaryApiKey;

  const isFallbackConfigured =
    imageFallbackConfig?.enabled !== false &&
    Boolean((imageFallbackConfig?.api_key || process.env.IMGSTUDIO_API_KEY || "").trim());

  let raw = await tryPrimaryGeneration(params, isPrimaryEnabled, isFallbackConfigured);
  if (!raw) {
    raw = await tryFallbackGeneration(params, isFallbackConfigured);
  }

  if (raw) {
    const matted = await applyMattingWithFallback(raw, actionLabel, logger, logContext);
    return { mattedBytes: matted, rawBytes: raw, placeholder: false };
  }

  const fallback = fallbackArt();
  return { mattedBytes: fallback, rawBytes: fallback, placeholder: true };
}
