import type { ImageProvider } from "./index.js";
import { RepositoryError, RepositoryService } from "../repository.js";
import { compactImagePrompt } from "../utils/promptSanitizer.js";
import { resolveImageDimensions } from "./gpti2Dimensions.js";

type ShopAiKeyImageTarget = {
  channelId: string;
  episodeId: string;
  bundleNumber?: number;
  variant?: number;
};

type ImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string; code?: string; type?: string };
};

const DEFAULT_BASE_URL = "https://direct.shopaikey.com/v1";
const DEFAULT_MODELS = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "gpt-image-2-all"] as const;
const DEFAULT_SIZE = "1536x1024";
const DEFAULT_QUALITY = "low";
const MAX_ATTEMPTS = 3;
const IMAGE_REQUEST_TIMEOUT_MS = 180_000;
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function waitForRetry(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
}

function imageModelChain(): string[] {
  const primary = process.env.SHOPAIKEY_IMAGE_MODEL?.trim() || DEFAULT_MODELS[0];
  const configuredFallbacks =
    process.env.SHOPAIKEY_IMAGE_FALLBACK_MODELS?.split(",")
      .map((model) => model.trim())
      .filter(Boolean) ?? [];
  // Preserve the previous one-model setting for existing deployments.
  const legacyFallback = process.env.SHOPAIKEY_IMAGE_FALLBACK_MODEL?.trim();
  const fallbacks = configuredFallbacks.length > 0 ? configuredFallbacks : legacyFallback ? [legacyFallback] : DEFAULT_MODELS.slice(1);
  return [...new Set([primary, ...fallbacks])];
}

function canTryNextModel(status: number): boolean {
  // Credentials and access policy cannot be repaired by changing the model.
  return status !== 401 && status !== 403;
}

export type OpenAiCompatibleImageOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  size?: string;
  aspectRatio?: string;
  quality?: string;
};

function validateSizeRatio(explicitSize: string, detectedAspectRatio: string): void {
  const parts = explicitSize.split("x").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
    const sizeRatio = parts[0] / parts[1];
    const [n, d] = detectedAspectRatio.split(":").map(Number);
    if (n && d) {
      const expectedRatio = n / d;
      if (Math.abs(sizeRatio - expectedRatio) / expectedRatio > 0.05) {
        throw new RepositoryError(
          `Explicit size override '${explicitSize}' conflicts with requested aspect ratio '${detectedAspectRatio}' (image_request_size_conflict)`,
          "image_request_size_conflict",
        );
      }
    }
  }
}

function resolveTargetDimensions(prompt: string, options?: OpenAiCompatibleImageOptions, primaryModel?: string): string {
  const promptRatioMatch =
    prompt.match(/Output framing:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i) ||
    prompt.match(/Composition:\s*(1:1|16:9|9:16|4:3|3:4|2:3|3:2)/i);
  const detectedAspectRatio = options?.aspectRatio || (promptRatioMatch ? promptRatioMatch[1] : undefined);
  const resolvedDefaultSize = detectedAspectRatio
    ? resolveImageDimensions(detectedAspectRatio, primaryModel || DEFAULT_MODELS[0]).size
    : DEFAULT_SIZE;
  const explicitSize = options?.size?.trim() || process.env.SHOPAIKEY_IMAGE_SIZE?.trim();
  const size = explicitSize || resolvedDefaultSize;

  if (explicitSize && detectedAspectRatio) {
    validateSizeRatio(explicitSize, detectedAspectRatio);
  }
  return size;
}

function buildGenerationPayload(model: string, prompt: string, size: string, quality: string): string {
  return JSON.stringify({
    model,
    prompt: compactImagePrompt(prompt),
    size,
    quality,
    output_format: "png",
  });
}

async function decodeImageResult(payload: ImageResponse, cancellationSignal?: AbortSignal): Promise<Uint8Array | null> {
  const result = payload.data?.[0];
  if (result?.b64_json) {
    return Buffer.from(result.b64_json.replace(/^data:image\/[^;]+;base64,/i, ""), "base64");
  }
  if (result?.url) {
    const imageResponse = await fetch(result.url, {
      signal: cancellationSignal ? AbortSignal.any([cancellationSignal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
    });
    if (!imageResponse.ok) {
      throw new RepositoryError(`Image URL download failed (${imageResponse.status})`, "IMAGE_PROVIDER_FAILED");
    }
    return new Uint8Array(await imageResponse.arrayBuffer());
  }
  return null;
}

interface AttemptResult {
  kind: "success" | "retry" | "fallback" | "error";
  bytes?: Uint8Array;
  error?: unknown;
  failureMessage?: string;
}

async function executeModelAttempt(
  model: string,
  modelIndex: number,
  totalModels: number,
  attempt: number,
  params: {
    baseUrl: string;
    apiKey: string;
    prompt: string;
    size: string;
    quality: string;
    cancellationSignal?: AbortSignal;
  },
): Promise<AttemptResult> {
  const requestSignal = params.cancellationSignal
    ? AbortSignal.any([params.cancellationSignal, AbortSignal.timeout(IMAGE_REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(IMAGE_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${params.baseUrl}/images/generations`, {
      method: "POST",
      headers: { authorization: `Bearer ${params.apiKey}`, "content-type": "application/json" },
      body: buildGenerationPayload(model, params.prompt, params.size, params.quality),
      signal: requestSignal,
    });
  } catch (error) {
    const canFallback = modelIndex < totalModels - 1;
    if (attempt < MAX_ATTEMPTS && !(canFallback && attempt === 1)) {
      return { kind: "retry", error };
    }
    return canFallback ? { kind: "fallback", error } : { kind: "error", error };
  }

  const raw = await response.text();
  let payload: ImageResponse = {};
  try {
    payload = JSON.parse(raw) as ImageResponse;
  } catch {
    /* Preserve provider status */
  }

  if (!response.ok) {
    const providerMessage = payload.error?.message || raw.slice(0, 300) || "unknown provider error";
    if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
      return { kind: "retry", failureMessage: providerMessage };
    }
    if (canTryNextModel(response.status) && modelIndex < totalModels - 1) {
      return { kind: "fallback", failureMessage: providerMessage };
    }
    throw new RepositoryError(`Image API failed (${response.status}): ${providerMessage}`, "IMAGE_PROVIDER_FAILED");
  }

  const bytes = await decodeImageResult(payload, params.cancellationSignal);
  if (bytes) {
    return { kind: "success", bytes };
  }

  const emptyMsg = "Image API returned no b64_json or url";
  if (modelIndex < totalModels - 1) {
    return { kind: "fallback", failureMessage: emptyMsg };
  }
  throw new RepositoryError(emptyMsg, "IMAGE_PROVIDER_EMPTY");
}

async function generateWithModel(
  model: string,
  modelIndex: number,
  totalModels: number,
  params: {
    baseUrl: string;
    apiKey: string;
    prompt: string;
    size: string;
    quality: string;
    cancellationSignal?: AbortSignal;
  },
): Promise<{ bytes?: Uint8Array; lastError?: unknown; lastMessage?: string; shouldFallback: boolean }> {
  let lastError: unknown = null;
  let lastMessage = "unknown provider error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await executeModelAttempt(model, modelIndex, totalModels, attempt, params);
    if (result.kind === "success" && result.bytes) {
      return { bytes: result.bytes, shouldFallback: false };
    }
    if (result.error !== undefined) lastError = result.error;
    if (result.failureMessage) lastMessage = result.failureMessage;

    if (result.kind === "retry") {
      await waitForRetry(attempt);
      continue;
    }
    if (result.kind === "fallback") {
      return { lastError, lastMessage, shouldFallback: true };
    }
    break;
  }

  return { lastError, lastMessage, shouldFallback: false };
}

export async function generateShopAiKeyImageBytes(
  prompt: string,
  cancellationSignal?: AbortSignal,
  options?: OpenAiCompatibleImageOptions,
): Promise<Uint8Array> {
  const apiKey = options?.apiKey?.trim() || process.env.SHOPAIKEY_API_KEY?.trim() || process.env.CUSTOM_IMAGE_API_KEY?.trim();
  if (!apiKey) throw new RepositoryError("Image API key is not configured", "IMAGE_PROVIDER_NOT_CONFIGURED");
  const baseUrl = (options?.baseUrl?.trim() || process.env.SHOPAIKEY_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const quality = options?.quality?.trim() || process.env.SHOPAIKEY_IMAGE_QUALITY?.trim() || DEFAULT_QUALITY;
  const requestedModels = options?.model ? [options.model] : imageModelChain();
  const size = resolveTargetDimensions(prompt, options, requestedModels[0]);

  let lastNetworkError: unknown = null;
  let lastFailureMessage = "unknown provider error";

  for (const [modelIndex, requestedModel] of requestedModels.entries()) {
    const outcome = await generateWithModel(requestedModel, modelIndex, requestedModels.length, {
      baseUrl,
      apiKey,
      prompt,
      size,
      quality,
      cancellationSignal,
    });

    if (outcome.bytes) return outcome.bytes;
    if (outcome.lastError !== undefined) lastNetworkError = outcome.lastError;
    if (outcome.lastMessage) lastFailureMessage = outcome.lastMessage;

    if (!outcome.shouldFallback) break;
  }

  if (lastNetworkError) {
    throw new RepositoryError(`Image API unavailable for ${requestedModels.join(" then ")}`, "IMAGE_PROVIDER_UNAVAILABLE");
  }
  throw new RepositoryError(`Image API failed for ${requestedModels.join(" then ")}: ${lastFailureMessage}`, "IMAGE_PROVIDER_FAILED");
}

export class ShopAiKeyImageProvider implements ImageProvider {
  constructor(
    private readonly repository: RepositoryService,
    private readonly target: ShopAiKeyImageTarget,
    private readonly options?: OpenAiCompatibleImageOptions,
  ) {}

  static isConfigured(apiKey?: string): boolean {
    return Boolean((apiKey || process.env.SHOPAIKEY_API_KEY || "").trim());
  }

  async generateReference(prompt: string, cancellationSignal?: AbortSignal): Promise<{ asset_path: string }> {
    return {
      asset_path: await this.repository.writeBundleImage(
        this.target.channelId,
        this.target.episodeId,
        this.target.bundleNumber ?? 1,
        await generateShopAiKeyImageBytes(prompt, cancellationSignal, this.options),
        this.target.variant ?? 0,
      ),
    };
  }
}

export class ShopAiKeyQuizImageProvider {
  constructor(
    private readonly repository: RepositoryService,
    private readonly target: { channelId: string; episodeId: string },
    private readonly options?: OpenAiCompatibleImageOptions,
  ) {}

  static isConfigured(apiKey?: string): boolean {
    return ShopAiKeyImageProvider.isConfigured(apiKey);
  }

  async generateAsset(input: { assetId: string; fingerprint: string; prompt: string; aspect_ratio?: string }): Promise<{ path: string }> {
    return {
      path: await this.repository.writeQuizImageAsset(
        this.target.channelId,
        this.target.episodeId,
        input.assetId,
        input.fingerprint,
        await generateShopAiKeyImageBytes(input.prompt, undefined, {
          ...this.options,
          aspectRatio: input.aspect_ratio || this.options?.aspectRatio,
        }),
      ),
    };
  }
}
