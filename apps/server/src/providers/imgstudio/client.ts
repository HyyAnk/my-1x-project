import { RepositoryError } from "../../repository.js";
import type {
  ImgStudioCallOptions,
  ImgStudioConnectivityResult,
  ImgStudioGenerationRequest,
  ImgStudioGenerationResponse,
} from "./types.js";

export const DEFAULT_IMGSTUDIO_BASE_URL = "https://imgstudio.site";
export const IMGSTUDIO_REQUEST_TIMEOUT_MS = 90_000;
export const IMGSTUDIO_CONNECTIVITY_TIMEOUT_MS = 15_000;

function parseJsonSafe(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function extractErrorMessage(rawText: string, payload?: Record<string, unknown>): string {
  if (payload) {
    if (typeof payload.error === "object" && payload.error !== null) {
      const errObj = payload.error as { message?: unknown };
      if (typeof errObj.message === "string" && errObj.message.trim()) {
        return errObj.message.trim();
      }
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  }
  return rawText.slice(0, 300).trim() || "Unknown error";
}

function handleApiHttpError(status: number, errorMsg: string): never {
  const isContentFilter =
    (status === 400 || status === 422) &&
    /(?:content filter|safety|moderation|policy|prohibited|inappropriate|violat)/i.test(errorMsg);

  if (isContentFilter) {
    throw new RepositoryError(
      `ImgStudio API content filter rejection (${status}): ${errorMsg}`,
      "IMAGE_CONTENT_FILTER_REJECTED",
    );
  }

  if (status === 401) {
    throw new RepositoryError(
      `ImgStudio API authentication failed (401): ${errorMsg}`,
      "IMAGE_PROVIDER_AUTH_ERROR",
    );
  }

  if (status === 403) {
    throw new RepositoryError(
      `ImgStudio API access forbidden (403): ${errorMsg}`,
      "IMAGE_PROVIDER_AUTH_ERROR",
    );
  }

  if (status === 429) {
    throw new RepositoryError(
      `ImgStudio API rate limit exceeded (429): ${errorMsg}`,
      "RATE_LIMIT_EXCEEDED",
    );
  }

  if (status >= 500) {
    throw new RepositoryError(
      `ImgStudio API server error (${status}): ${errorMsg}`,
      "IMAGE_PROVIDER_SERVER_ERROR",
    );
  }

  throw new RepositoryError(
    `ImgStudio API failed (${status}): ${errorMsg}`,
    "IMAGE_PROVIDER_FAILED",
  );
}

/**
 * Sends image generation request to the ImgStudio API endpoint.
 *
 * Headers:
 * - Authorization: Bearer <key>
 * - Content-Type: application/json
 * - Idempotency-Key: <key>
 */
export async function callImgStudioApi(
  request: ImgStudioGenerationRequest,
  options: ImgStudioCallOptions,
): Promise<ImgStudioGenerationResponse> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new RepositoryError(
      "API key for ImgStudio is not configured. Please enter your API key in Settings.",
      "IMAGE_PROVIDER_NOT_CONFIGURED",
    );
  }

  const baseUrl = (options.baseUrl?.trim() || DEFAULT_IMGSTUDIO_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${baseUrl}/api/v1/images/generate`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const body: Record<string, unknown> = {
    model: request.model,
    prompt: request.prompt,
    aspect_ratio: request.aspect_ratio,
    resolution: request.resolution,
    quality: request.quality,
  };
  if (request.image) {
    body.image = request.image;
  }

  const requestSignal = options.cancellationSignal
    ? AbortSignal.any([options.cancellationSignal, AbortSignal.timeout(IMGSTUDIO_REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(IMGSTUDIO_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: requestSignal,
    });
  } catch (error) {
    if (options.cancellationSignal?.aborted) {
      throw new Error("ImgStudio image generation was cancelled", { cause: error });
    }
    throw new RepositoryError(
      `Failed to connect to ImgStudio API: ${error instanceof Error ? error.message : String(error)}`,
      "IMAGE_PROVIDER_UNAVAILABLE",
      { cause: error },
    );
  }

  const rawText = await response.text();
  const payload = parseJsonSafe(rawText);

  if (!response.ok) {
    const errorMsg = extractErrorMessage(rawText, payload);
    handleApiHttpError(response.status, errorMsg);
  }

  if (!payload) {
    throw new RepositoryError("ImgStudio API returned malformed or non-JSON response", "IMAGE_PROVIDER_FAILED");
  }

  return payload as ImgStudioGenerationResponse;
}

/**
 * Checks connectivity and verifies API key validity against ImgStudio models endpoint.
 */
export async function checkImgStudioConnectivity(
  apiKey: string,
  baseUrl?: string,
): Promise<ImgStudioConnectivityResult> {
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    throw new RepositoryError(
      "API key for ImgStudio is not configured",
      "IMAGE_PROVIDER_NOT_CONFIGURED",
    );
  }

  const normalizedBaseUrl = (baseUrl?.trim() || DEFAULT_IMGSTUDIO_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${normalizedBaseUrl}/api/v1/models`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(IMGSTUDIO_CONNECTIVITY_TIMEOUT_MS),
    });
  } catch (error) {
    throw new RepositoryError(
      `Failed to connect to ImgStudio API: ${error instanceof Error ? error.message : String(error)}`,
      "IMAGE_PROVIDER_UNAVAILABLE",
      { cause: error },
    );
  }

  const rawText = await response.text();
  const payload = parseJsonSafe(rawText);

  if (!response.ok) {
    const errorMsg = extractErrorMessage(rawText, payload);
    handleApiHttpError(response.status, errorMsg);
  }

  const models = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : [];

  return { ok: true, models };
}
