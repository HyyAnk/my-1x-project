import type { AppConfig } from "@studio/shared";
import { generateGpti2ImageBytes } from "../../../providers/gpti2Image.js";
import { generateShopAiKeyImageBytes } from "../../../providers/shopAiKeyImage.js";
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
 * performs matting / background removal with fallback to raw bytes, and falls back to procedural art
 * when the service is disabled or errors occur.
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
    options = {},
    logger,
    logContext = {},
    actionLabel = "mascot art",
    fallbackArt,
  } = params;

  assertMascotPromptContract(prompt, hasReferenceImage);

  const hasApiKey = Boolean(
    imageConfig.api_key ||
      process.env.SHOPAIKEY_API_KEY ||
      process.env.GPTI2_API_KEY ||
      process.env.CUSTOM_IMAGE_API_KEY,
  );

  if (imageConfig.enabled && hasApiKey) {
    try {
      logger?.info(`Generating ${actionLabel}`, logContext);
      const raw = await retryWithBackoff(() =>
        generateMascotAiImageBytes(
          prompt,
          imageConfig,
          {
            aspectRatio: options.aspectRatio ?? "1:1",
            size: options.size ?? "1024x1024",
            referenceImageBase64: options.referenceImageBase64,
            background: options.background ?? "opaque",
            cancellationSignal: options.cancellationSignal ?? AbortSignal.timeout(90_000),
            idempotencyKey: options.idempotencyKey,
          },
          logger,
        ),
      );

      let matted: Uint8Array;
      try {
        matted = await removeImageBackground(raw);
      } catch (mattingErr) {
        logger?.warn(
          `${actionLabel} background removal failed, using raw AI image: ${mattingErr instanceof Error ? mattingErr.message : String(mattingErr)}`,
          logContext,
        );
        matted = raw;
      }

      return { mattedBytes: matted, rawBytes: raw, placeholder: false };
    } catch (err) {
      logger?.warn(
        `${actionLabel} API failed, using procedural fallback: ${err instanceof Error ? err.message : String(err)}`,
        logContext,
      );
      const fallback = fallbackArt();
      return { mattedBytes: fallback, rawBytes: fallback, placeholder: true };
    }
  }

  const fallback = fallbackArt();
  return { mattedBytes: fallback, rawBytes: fallback, placeholder: true };
}
