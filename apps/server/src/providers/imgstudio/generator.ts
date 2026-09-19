import { RepositoryError } from "../../repository.js";
import { compactImagePrompt } from "../../utils/promptSanitizer.js";
import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import { downloadImageUrl } from "../gpti2Dimensions.js";
import { callImgStudioApi, DEFAULT_IMGSTUDIO_BASE_URL } from "./client.js";
import { resolveImgStudioAspectRatio, resolveImgStudioResolution } from "./dimensions.js";
import { createImgStudioIdempotencyKey, createImgStudioRunId } from "./idempotency.js";
import type { ImgStudioGenerationOptions, ImgStudioImageResult } from "./types.js";

function resolveSameOriginImageUrl(url: string, baseUrl: string): string {
  let resolvedUrl: URL;
  try {
    resolvedUrl = new URL(url, `${baseUrl}/`);
  } catch {
    throw new RepositoryError("ImgStudio returned an invalid image URL", "IMAGE_PROVIDER_UNSAFE_URL");
  }
  if (resolvedUrl.origin !== new URL(baseUrl).origin) {
    throw new RepositoryError("ImgStudio returned an image URL outside the configured API origin", "IMAGE_PROVIDER_UNSAFE_URL");
  }
  return resolvedUrl.toString();
}

/**
 * Generates an image using the ImgStudio provider and retrieves the resulting image bytes.
 */
export async function generateImgStudioImageBytes(
  rawPrompt: string,
  options: ImgStudioGenerationOptions = {},
): Promise<ImgStudioImageResult> {
  const apiKey = (options.apiKey || process.env.IMGSTUDIO_API_KEY || "").trim();
  if (!apiKey) {
    throw new RepositoryError(
      "API key for ImgStudio is not configured. Please enter your API key in Settings.",
      "IMAGE_PROVIDER_NOT_CONFIGURED",
    );
  }

  const model = options.model?.trim() || IMGSTUDIO_DEFAULT_MODEL_ID;
  const aspectRatio = resolveImgStudioAspectRatio(options.aspect_ratio);
  const resolution = resolveImgStudioResolution(model, options.resolution);
  const quality = options.quality || "standard";
  const prompt = compactImagePrompt(rawPrompt, aspectRatio);

  const idempotencyKey =
    options.idempotencyKey ||
    createImgStudioIdempotencyKey({
      workflow: "direct-image",
      runId: createImgStudioRunId(),
      resource: `${aspectRatio}:${resolution}:${prompt}:${options.referenceImage ? options.referenceImage.slice(0, 64) : ""}`,
      tier: "direct",
      model,
    });

  const response = await callImgStudioApi(
    {
      provider_id: model,
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      quality,
      image: options.referenceImage,
    },
    {
      apiKey,
      baseUrl: options.baseUrl,
      idempotencyKey,
      cancellationSignal: options.cancellationSignal,
    },
  );

  const dataItem = Array.isArray(response.data) ? response.data[0] : response.data;
  const b64Json = dataItem?.b64_json || response.b64_json;
  const imageUrl = dataItem?.url || response.url;
  const priceVnd = options.priceVnd ?? response.cost_vnd ?? dataItem?.price_vnd ?? response.price_vnd ?? 150;

  if (b64Json) {
    const rawBase64 = b64Json.replace(/^data:image\/[^;]+;base64,/i, "");
    const bytes = new Uint8Array(Buffer.from(rawBase64, "base64"));
    return {
      bytes,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      price_vnd: priceVnd,
      url: imageUrl,
    };
  }

  if (imageUrl) {
    const baseUrl = (options.baseUrl?.trim() || DEFAULT_IMGSTUDIO_BASE_URL).replace(/\/+$/, "");
    const fullImageUrl = resolveSameOriginImageUrl(imageUrl, baseUrl);
    const bytes = await downloadImageUrl(fullImageUrl, options.cancellationSignal, { Authorization: `Bearer ${apiKey}` });
    return {
      bytes,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      price_vnd: priceVnd,
      url: fullImageUrl,
    };
  }

  throw new RepositoryError("ImgStudio API returned no image payload", "IMAGE_PROVIDER_EMPTY");
}
