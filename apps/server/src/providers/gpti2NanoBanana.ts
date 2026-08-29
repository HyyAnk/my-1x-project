import { RepositoryError } from "../repository.js";
import { compactImagePrompt } from "../utils/promptSanitizer.js";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_BASE_URL,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  downloadImageUrl,
  waitFor,
} from "./gpti2Dimensions.js";

export type Gpti2ImageResult = {
  bytes: Uint8Array;
  price_vnd?: number;
  price_breakdown?: Record<string, number>;
  model?: string;
  aspect_ratio?: string;
  size?: string;
};

export type Gpti2GenerationOptions = {
  apiKey?: string;
  model?: string;
  quality?: string;
  size?: string;
  aspect_ratio?: string;
  idempotencyKey?: string;
  cancellationSignal?: AbortSignal;
  pollIntervalMs?: number;
  referenceImageBase64?: string;
  referenceImageUrl?: string;
  referenceStrength?: number;
  background?: "transparent" | "opaque" | "auto";
};

export async function generateNanoBananaImage(
  apiKey: string,
  rawPrompt: string,
  model: string,
  options: Gpti2GenerationOptions,
  idempotencyKey: string,
): Promise<Gpti2ImageResult> {
  const prompt = compactImagePrompt(rawPrompt);
  const aspectRatio = options.aspect_ratio || DEFAULT_ASPECT_RATIO;

  const requestSignal = options.cancellationSignal
    ? AbortSignal.any([options.cancellationSignal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  const requestBody: Record<string, unknown> = {
    model,
    prompt,
    aspect_ratio: aspectRatio,
  };

  if (options.referenceImageBase64) {
    const dataUrl = options.referenceImageBase64.startsWith("data:")
      ? options.referenceImageBase64
      : `data:image/png;base64,${options.referenceImageBase64}`;
    requestBody.image_urls = [dataUrl];
    requestBody.ref_images = [dataUrl];
  } else if (options.referenceImageUrl) {
    requestBody.image_urls = [options.referenceImageUrl];
    requestBody.ref_images = [options.referenceImageUrl];
  }

  let response: Response;
  try {
    response = await fetch(`${DEFAULT_BASE_URL}/v1/images/nano/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(requestBody),
      signal: requestSignal,
    });
  } catch (error) {
    if (options.cancellationSignal?.aborted) throw new Error("Image generation was cancelled");
    throw new RepositoryError(
      `Failed to connect to gpti2.store Nano Banana API: ${error instanceof Error ? error.message : String(error)}`,
      "IMAGE_PROVIDER_UNAVAILABLE",
    );
  }

  const raw = await response.text();
  let payload: { id?: string; price_vnd?: number; error?: { message?: string } } = {};
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    // raw payload
  }

  if (!response.ok && response.status !== 202) {
    const errorMsg = payload.error?.message || raw.slice(0, 300) || "Unknown error";
    throw new RepositoryError(`Nano Banana API failed (${response.status}): ${errorMsg}`, "IMAGE_PROVIDER_FAILED");
  }

  const jobId = payload.id;
  if (!jobId) {
    throw new RepositoryError("Nano Banana API returned no job ID", "IMAGE_PROVIDER_FAILED");
  }

  return pollNanoJob(apiKey, jobId, model, payload.price_vnd ?? 100, options.cancellationSignal, options.pollIntervalMs, aspectRatio);
}

export async function pollNanoJob(
  apiKey: string,
  jobId: string,
  model: string,
  initialPriceVnd: number,
  cancellationSignal?: AbortSignal,
  pollIntervalMs = POLL_INTERVAL_MS,
  aspectRatio?: string,
): Promise<Gpti2ImageResult> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    if (cancellationSignal?.aborted) throw new Error("Image generation was cancelled");
    await waitFor(pollIntervalMs);

    const pollSignal = cancellationSignal
      ? AbortSignal.any([cancellationSignal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000);

    let response: Response;
    try {
      response = await fetch(`${DEFAULT_BASE_URL}/v1/images/nano/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: pollSignal,
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const payload = (await response.json()) as {
      status?: string;
      priceVnd?: number;
      price_vnd?: number;
      data?: Array<{ url?: string; taiUrl?: string }>;
      error?: { message?: string } | string | null;
    };

    if (payload.status === "succeeded") {
      const item = payload.data?.[0];
      const imageUrl = item?.url || item?.taiUrl;
      const priceVnd = payload.priceVnd ?? payload.price_vnd ?? initialPriceVnd ?? 100;

      if (!imageUrl) {
        throw new RepositoryError("Nano Banana job succeeded but image URL is missing or expired", "IMAGE_PROVIDER_EMPTY");
      }

      const imageBytes = await downloadImageUrl(imageUrl, cancellationSignal);
      return {
        bytes: imageBytes,
        price_vnd: priceVnd,
        price_breakdown: { images_vnd: priceVnd },
        model,
        aspect_ratio: aspectRatio,
        size: "2K",
      };
    }

    if (payload.status === "failed") {
      const errMsg = typeof payload.error === "string" ? payload.error : payload.error?.message || "Generation failed";
      throw new RepositoryError(`Nano Banana job failed: ${errMsg}`, "IMAGE_PROVIDER_FAILED");
    }
  }

  throw new RepositoryError("Nano Banana image generation timed out", "IMAGE_PROVIDER_TIMEOUT");
}
