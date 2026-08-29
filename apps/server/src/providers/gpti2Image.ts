import type { ImageProvider } from "./index.js";
import { RepositoryError, RepositoryService } from "../repository.js";
import { compactImagePrompt } from "../utils/promptSanitizer.js";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_SIZE,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  downloadImageUrl,
  generateIdempotencyKey,
  resolveImageDimensions,
  type SupportedAspectRatio,
  waitFor,
} from "./gpti2Dimensions.js";
import { generateNanoBananaImage, type Gpti2GenerationOptions, type Gpti2ImageResult } from "./gpti2NanoBanana.js";

export { resolveImageDimensions, type SupportedAspectRatio, type Gpti2ImageResult, type Gpti2GenerationOptions };

type Gpti2ImageTarget = {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
  assetId?: string;
  fingerprint?: string;
};

export async function checkGpti2Balance(apiKey?: string): Promise<{ balance_vnd: number; rpm?: number }> {
  const key = (apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim();
  if (!key) {
    throw new RepositoryError("API key for gpti2.store is not configured.", "IMAGE_PROVIDER_NOT_CONFIGURED");
  }
  const response = await fetch(`${DEFAULT_BASE_URL}/v1/balance`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });
  const raw = await response.text();
  let payload: { balance_vnd?: number; rpm?: number; error?: { message?: string } } = {};
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    //
  }
  if (!response.ok) {
    const msg = payload.error?.message || raw || `HTTP ${response.status}`;
    throw new RepositoryError(`gpti2.store API failed (${response.status}): ${msg}`, "IMAGE_PROVIDER_FAILED");
  }
  return {
    balance_vnd: typeof payload.balance_vnd === "number" ? payload.balance_vnd : 0,
    rpm: payload.rpm,
  };
}

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

async function pollGptJob(
  apiKey: string,
  jobId: string,
  model: string,
  initialPriceVnd?: number,
  cancellationSignal?: AbortSignal,
  pollIntervalMs = POLL_INTERVAL_MS,
  aspectRatio?: string,
  size?: string,
): Promise<Gpti2ImageResult> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    if (cancellationSignal?.aborted) throw new Error("Image generation was cancelled");
    await waitFor(pollIntervalMs);

    const pollSignal = cancellationSignal
      ? AbortSignal.any([cancellationSignal, AbortSignal.timeout(30_000)])
      : AbortSignal.timeout(30_000);

    let response: Response;
    try {
      response = await fetch(`${DEFAULT_BASE_URL}/v1/images/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: pollSignal,
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const payload = (await response.json()) as {
      status?: string;
      price_vnd?: number;
      price_breakdown?: Record<string, number>;
      data?: Array<{ b64_json?: string; url?: string }>;
      error?: { message?: string };
    };

    if (payload.status === "succeeded") {
      const item = payload.data?.[0];
      const priceVnd = payload.price_vnd ?? initialPriceVnd;

      if (item?.b64_json) {
        return {
          bytes: new Uint8Array(Buffer.from(item.b64_json, "base64")),
          price_vnd: priceVnd,
          price_breakdown: payload.price_breakdown,
          model,
          aspect_ratio: aspectRatio,
          size,
        };
      }

      if (item?.url) {
        const bytes = await downloadImageUrl(item.url, cancellationSignal);
        return {
          bytes,
          price_vnd: priceVnd,
          price_breakdown: payload.price_breakdown,
          model,
          aspect_ratio: aspectRatio,
          size,
        };
      }

      throw new RepositoryError("Image job succeeded but returned no image payload", "IMAGE_PROVIDER_EMPTY");
    }

    if (payload.status === "failed") {
      const errorMsg = payload.error?.message || "Unknown error";
      const isContentFilter = /(?:content filter|safety|moderation|policy|prohibited)/i.test(errorMsg);
      throw new RepositoryError(
        `Image job failed: ${errorMsg}`,
        isContentFilter ? "IMAGE_CONTENT_FILTER_REJECTED" : "IMAGE_PROVIDER_FAILED",
      );
    }
  }

  throw new RepositoryError("Image generation timed out waiting for queue response", "IMAGE_PROVIDER_TIMEOUT");
}

export class Gpti2ImageProvider implements ImageProvider {
  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim());
  }

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: Gpti2ImageTarget,
    private readonly options: { apiKey?: string; model?: string; aspectRatio?: string } = {},
  ) {}

  async generateReference(
    prompt: string,
    cancellationSignal?: AbortSignal,
  ): Promise<{ asset_path: string; price_vnd?: number; price_breakdown?: Record<string, number>; model?: string; aspect_ratio?: string }> {
    const bundleNumber = this.target.bundleNumber ?? 1;
    const variant = this.target.variant ?? 0;
    const aspectRatio = this.options.aspectRatio || "16:9";
    const idempotencyKey = generateIdempotencyKey(
      "bundle",
      `${this.target.channelId}:${this.target.episodeId}:bundle-${bundleNumber}:${variant}:${aspectRatio}:${prompt}`,
    );

    const result = await generateGpti2ImageBytes(prompt, {
      apiKey: this.options.apiKey,
      model: this.options.model,
      aspect_ratio: aspectRatio,
      idempotencyKey,
      cancellationSignal,
    });

    const assetPath = await this.repository.writeBundleImage(
      this.target.channelId,
      this.target.episodeId,
      bundleNumber,
      result.bytes,
      variant,
      {
        price_vnd: result.price_vnd,
        price_breakdown: result.price_breakdown,
        model: result.model,
        aspect_ratio: result.aspect_ratio || aspectRatio,
        size: result.size,
      },
    );

    return {
      asset_path: assetPath,
      price_vnd: result.price_vnd,
      price_breakdown: result.price_breakdown,
      model: result.model,
      aspect_ratio: result.aspect_ratio || aspectRatio,
    };
  }
}

export class Gpti2QuizImageProvider {
  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.GPTI2_API_KEY || process.env.SHOPAIKEY_API_KEY || "").trim());
  }

  constructor(
    private readonly repository: RepositoryService,
    private readonly target: { channelId: string; episodeId: string },
    private readonly options: { apiKey?: string; model?: string } = {},
  ) {}

  async generateAsset(
    input: { assetId: string; fingerprint: string; prompt: string; aspect_ratio?: string },
    cancellationSignal?: AbortSignal,
  ): Promise<{ path: string; price_vnd?: number; price_breakdown?: Record<string, number>; model?: string; aspect_ratio?: string }> {
    const aspectRatio = input.aspect_ratio || "1:1";
    const idempotencyKey = generateIdempotencyKey(
      "quiz",
      `${this.target.channelId}:${this.target.episodeId}:${input.assetId}:${input.fingerprint}:${aspectRatio}`,
    );

    const result = await generateGpti2ImageBytes(input.prompt, {
      apiKey: this.options.apiKey,
      model: this.options.model,
      aspect_ratio: aspectRatio,
      idempotencyKey,
      cancellationSignal,
    });

    const assetPath = await this.repository.writeQuizImageAsset(
      this.target.channelId,
      this.target.episodeId,
      input.assetId,
      input.fingerprint,
      result.bytes,
      {
        price_vnd: result.price_vnd,
        price_breakdown: result.price_breakdown,
        model: result.model,
        aspect_ratio: result.aspect_ratio || aspectRatio,
        size: result.size,
      },
    );

    return {
      path: assetPath,
      price_vnd: result.price_vnd,
      price_breakdown: result.price_breakdown,
      model: result.model,
      aspect_ratio: result.aspect_ratio || aspectRatio,
    };
  }
}
