import { RepositoryError } from "../../repository.js";
import { compactImagePrompt } from "../../utils/promptSanitizer.js";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_SIZE,
  REQUEST_TIMEOUT_MS,
  downloadImageUrl,
  generateIdempotencyKey,
  resolveImageDimensions,
} from "../gpti2Dimensions.js";
import { generateNanoBananaImage, type Gpti2GenerationOptions, type Gpti2ImageResult } from "../gpti2NanoBanana.js";
import { pollGptJob } from "./jobPoller.js";

export async function generateGpti2ImageBytes(prompt: string, options: Gpti2GenerationOptions = {}): Promise<Gpti2ImageResult> {
  const apiKey = (options.apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim();
  if (!apiKey) {
    throw new RepositoryError(
      "API key for gpti2.store is not configured. Please enter your API key in Settings.",
      "IMAGE_PROVIDER_NOT_CONFIGURED",
    );
  }

  const model = options.model?.trim() || DEFAULT_MODEL;
  const isNano = model.startsWith("nano-banana");
  const dimensions = resolveImageDimensions(options.aspect_ratio || "16:9", model);
  const idempotencySeed = `${model}:${dimensions.aspect_ratio}:${prompt}:${options.referenceImageUrl || (options.referenceImageBase64 ? options.referenceImageBase64.slice(0, 64) : "")}`;
  const idempotencyKey = options.idempotencyKey || generateIdempotencyKey("img", idempotencySeed);

  if (isNano) {
    return generateNanoBananaImage(apiKey, prompt, model, { ...options, aspect_ratio: dimensions.aspect_ratio }, idempotencyKey);
  } else {
    return generateGptImage(
      apiKey,
      prompt,
      model,
      { ...options, size: options.size || dimensions.size, aspect_ratio: dimensions.aspect_ratio },
      idempotencyKey,
    );
  }
}

async function generateGptImage(
  apiKey: string,
  rawPrompt: string,
  model: string,
  options: Gpti2GenerationOptions,
  idempotencyKey: string,
): Promise<Gpti2ImageResult> {
  const prompt = compactImagePrompt(rawPrompt, options.aspect_ratio);
  const size = options.size || DEFAULT_SIZE;
  const quality = "low";

  const requestSignal = options.cancellationSignal
    ? AbortSignal.any([options.cancellationSignal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    if (options.referenceImageBase64) {
      const rawBase64 = options.referenceImageBase64.replace(/^data:image\/[^;]+;base64,/i, "");
      const rawBytes = Buffer.from(rawBase64, "base64");
      const blob = new Blob([rawBytes], { type: "image/png" });
      const formData = new FormData();
      formData.append("image[]", blob, "reference.png");
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("quality", quality);
      if (options.background) {
        formData.append("background", options.background);
      }

      response = await fetch(`${DEFAULT_BASE_URL}/v1/images/edits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Prefer: "respond-async",
          "Idempotency-Key": idempotencyKey,
        },
        body: formData,
        signal: requestSignal,
      });
    } else {
      const requestBody: Record<string, unknown> = {
        model,
        prompt,
        size,
        quality,
        n: 1,
      };
      if (options.background) {
        requestBody.background = options.background;
      }
      if (options.referenceImageUrl) {
        requestBody.image_url = options.referenceImageUrl;
        requestBody.ref_images = [options.referenceImageUrl];
      }

      response = await fetch(`${DEFAULT_BASE_URL}/v1/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Prefer: "respond-async",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(requestBody),
        signal: requestSignal,
      });
    }
  } catch (error) {
    if (options.cancellationSignal?.aborted) throw new Error("Image generation was cancelled");
    throw new RepositoryError(
      `Failed to connect to gpti2.store: ${error instanceof Error ? error.message : String(error)}`,
      "IMAGE_PROVIDER_UNAVAILABLE",
    );
  }

  const raw = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // raw payload
  }

  if (response.status === 202) {
    const jobId = typeof payload.id === "string" ? payload.id : null;
    if (!jobId) {
      throw new RepositoryError("gpti2.store returned 202 without a job ID", "IMAGE_PROVIDER_FAILED");
    }
    return pollGptJob(
      apiKey,
      jobId,
      model,
      payload.price_vnd as number | undefined,
      options.cancellationSignal,
      options.pollIntervalMs,
      options.aspect_ratio,
      size,
    );
  }

  if (!response.ok) {
    const errorMsg = (payload.error as { message?: string } | undefined)?.message || raw.slice(0, 300) || "Unknown error";
    const isContentFilter = response.status === 400 && /(?:content filter|safety|moderation|policy|prohibited)/i.test(errorMsg);
    throw new RepositoryError(
      `gpti2.store API failed (${response.status}): ${errorMsg}`,
      isContentFilter ? "IMAGE_CONTENT_FILTER_REJECTED" : "IMAGE_PROVIDER_FAILED",
    );
  }

  const dataArray = payload.data as Array<{ b64_json?: string; url?: string; revised_prompt?: string }> | undefined;
  const firstItem = dataArray?.[0];
  const priceVnd = (payload.price_vnd as number | undefined) ?? (payload.price as number | undefined) ?? 100;
  const priceBreakdown = payload.price_breakdown as Record<string, number> | undefined;

  if (firstItem?.b64_json) {
    return {
      bytes: new Uint8Array(Buffer.from(firstItem.b64_json, "base64")),
      price_vnd: priceVnd,
      price_breakdown: priceBreakdown,
      model,
      aspect_ratio: options.aspect_ratio,
      size,
    };
  }

  if (firstItem?.url) {
    const bytes = await downloadImageUrl(firstItem.url, options.cancellationSignal);
    return {
      bytes,
      price_vnd: priceVnd,
      price_breakdown: priceBreakdown,
      model,
      aspect_ratio: options.aspect_ratio,
      size,
    };
  }

  throw new RepositoryError("gpti2.store returned no image data", "IMAGE_PROVIDER_EMPTY");
}
