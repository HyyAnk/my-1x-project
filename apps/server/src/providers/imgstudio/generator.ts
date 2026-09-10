import { RepositoryError } from "../../repository.js";
import { compactImagePrompt } from "../../utils/promptSanitizer.js";
import { IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";
import { downloadImageUrl, generateIdempotencyKey } from "../gpti2Dimensions.js";
import { callImgStudioApi } from "./client.js";
import { resolveImgStudioAspectRatio, resolveImgStudioResolution } from "./dimensions.js";
import type { ImgStudioGenerationOptions, ImgStudioImageResult } from "./types.js";

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

  const idempotencySeed = `${model}:${aspectRatio}:${resolution}:${prompt}:${options.referenceImage ? options.referenceImage.slice(0, 64) : ""}`;
  const idempotencyKey = options.idempotencyKey || generateIdempotencyKey("imgstd", idempotencySeed);

  const response = await callImgStudioApi(
    {
      model,
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
  const priceVnd = options.priceVnd ?? dataItem?.price_vnd ?? response.price_vnd ?? 100;

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
    const bytes = await downloadImageUrl(imageUrl, options.cancellationSignal);
    return {
      bytes,
      model,
      aspect_ratio: aspectRatio,
      resolution,
      price_vnd: priceVnd,
      url: imageUrl,
    };
  }

  throw new RepositoryError("ImgStudio API returned no image payload", "IMAGE_PROVIDER_EMPTY");
}
