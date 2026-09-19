import { randomUUID } from "node:crypto";
import { RepositoryError } from "../../repository.js";
import { createImgStudioHttpError, ImgStudioApiError, isRetryableImgStudioError } from "./errors.js";
import {
  createUnavailableError,
  IMGSTUDIO_CONNECTIVITY_TIMEOUT_MS,
  IMGSTUDIO_MAX_PROCESSING_POLLS,
  IMGSTUDIO_MAX_TRANSIENT_RETRIES,
  IMGSTUDIO_MIN_PROCESSING_POLL_INTERVAL_MS,
  IMGSTUDIO_OPERATION_TIMEOUT_MS,
  IMGSTUDIO_PROCESSING_POLL_INTERVAL_MS,
  IMGSTUDIO_REQUEST_TIMEOUT_MS,
  operationTimeoutError,
  resolveRetryDelayMs,
  translateTransportError,
  waitWithSignal,
} from "./transportPolicy.js";
import type {
  ImgStudioCallOptions,
  ImgStudioConnectivityResult,
  ImgStudioGenerationRequest,
  ImgStudioGenerationResponse,
} from "./types.js";
import {
  createRequestPayload,
  extractErrorMessage,
  IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES,
  parseGenerationResponse,
  parseJsonSafe,
} from "./wireProtocol.js";

export const DEFAULT_IMGSTUDIO_BASE_URL = "https://imgstudio.site";

export {
  IMGSTUDIO_CONNECTIVITY_TIMEOUT_MS,
  IMGSTUDIO_MAX_PROCESSING_POLLS,
  IMGSTUDIO_MAX_REFERENCE_IMAGE_BYTES,
  IMGSTUDIO_MAX_TRANSIENT_RETRIES,
  IMGSTUDIO_MIN_PROCESSING_POLL_INTERVAL_MS,
  IMGSTUDIO_OPERATION_TIMEOUT_MS,
  IMGSTUDIO_PROCESSING_POLL_INTERVAL_MS,
  IMGSTUDIO_REQUEST_TIMEOUT_MS,
  ImgStudioApiError,
  isRetryableImgStudioError,
};

const PROCESSING_STATUSES = new Set(["pending", "processing", "queued"]);
const SUCCESS_STATUSES = new Set(["completed", "succeeded"]);
const FAILURE_STATUSES = new Set(["cancelled", "canceled", "error", "failed", "rejected"]);

function createTerminalStatusError(
  response: Response,
  rawText: string,
  payload: Record<string, unknown>,
  parsedResponse: ImgStudioGenerationResponse,
): ImgStudioApiError {
  const status = parsedResponse.status || "unknown";
  const detail = parsedResponse.error?.message?.trim() || parsedResponse.message?.trim() || extractErrorMessage(rawText, payload);
  return new ImgStudioApiError(
    `ImgStudio API returned terminal generation status '${status}': ${detail}`,
    "IMAGE_PROVIDER_FAILED",
    false,
    response.status,
  );
}

async function waitForReplay(response: Response, operationSignal: AbortSignal, minimumMs = 0): Promise<void> {
  await waitWithSignal(resolveRetryDelayMs(response, IMGSTUDIO_PROCESSING_POLL_INTERVAL_MS, minimumMs), operationSignal);
}

function canRetry(error: unknown, retries: number): boolean {
  return retries < IMGSTUDIO_MAX_TRANSIENT_RETRIES && isRetryableImgStudioError(error);
}

/** Sends one idempotent image operation and polls the native endpoint until it completes. */
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
  const requestPayload = createRequestPayload(request);
  const endpoint = `${baseUrl}${requestPayload.endpointPath}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": requestPayload.contentType,
    "Idempotency-Key": options.idempotencyKey || randomUUID(),
  };
  const operationTimeoutSignal = AbortSignal.timeout(IMGSTUDIO_OPERATION_TIMEOUT_MS);
  const operationSignal = options.cancellationSignal
    ? AbortSignal.any([options.cancellationSignal, operationTimeoutSignal])
    : operationTimeoutSignal;
  let processingPolls = 0;
  let transientRetries = 0;

  while (true) {
    const requestSignal = AbortSignal.any([operationSignal, AbortSignal.timeout(IMGSTUDIO_REQUEST_TIMEOUT_MS)]);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: requestPayload.body,
        signal: requestSignal,
      });
    } catch (error) {
      const transportError = translateTransportError(error, options.cancellationSignal, operationTimeoutSignal);
      if (!canRetry(transportError, transientRetries)) {
        throw transportError;
      }
      transientRetries += 1;
      try {
        await waitWithSignal(IMGSTUDIO_PROCESSING_POLL_INTERVAL_MS, operationSignal);
      } catch (waitError) {
        throw translateTransportError(waitError, options.cancellationSignal, operationTimeoutSignal);
      }
      continue;
    }

    let rawText: string;
    try {
      rawText = await response.text();
    } catch (error) {
      const transportError = translateTransportError(error, options.cancellationSignal, operationTimeoutSignal);
      if (!canRetry(transportError, transientRetries)) {
        throw transportError;
      }
      transientRetries += 1;
      try {
        await waitWithSignal(IMGSTUDIO_PROCESSING_POLL_INTERVAL_MS, operationSignal);
      } catch (waitError) {
        throw translateTransportError(waitError, options.cancellationSignal, operationTimeoutSignal);
      }
      continue;
    }

    const payload = parseJsonSafe(rawText);
    if (!response.ok) {
      const apiError = createImgStudioHttpError(response.status, extractErrorMessage(rawText, payload));
      if (!canRetry(apiError, transientRetries)) throw apiError;
      transientRetries += 1;
      try {
        await waitForReplay(response, operationSignal);
      } catch (waitError) {
        throw translateTransportError(waitError, options.cancellationSignal, operationTimeoutSignal);
      }
      continue;
    }

    if (!payload) {
      throw new ImgStudioApiError("ImgStudio API returned malformed or non-JSON response", "IMAGE_PROVIDER_FAILED", false, response.status);
    }

    const parsedResponse = parseGenerationResponse(payload);
    const status = parsedResponse.status?.trim().toLowerCase();
    if (status && FAILURE_STATUSES.has(status)) {
      throw createTerminalStatusError(response, rawText, payload, parsedResponse);
    }
    if (status && SUCCESS_STATUSES.has(status)) return parsedResponse;

    if (response.status === 202 || (status && PROCESSING_STATUSES.has(status))) {
      processingPolls += 1;
      if (processingPolls > IMGSTUDIO_MAX_PROCESSING_POLLS) throw operationTimeoutError();
      try {
        await waitForReplay(response, operationSignal, IMGSTUDIO_MIN_PROCESSING_POLL_INTERVAL_MS);
      } catch (waitError) {
        throw translateTransportError(waitError, options.cancellationSignal, operationTimeoutSignal);
      }
      continue;
    }

    if (status) throw createTerminalStatusError(response, rawText, payload, parsedResponse);
    return parsedResponse;
  }
}

/** Checks connectivity and verifies API key validity against the ImgStudio models endpoint. */
export async function checkImgStudioConnectivity(apiKey: string, baseUrl?: string): Promise<ImgStudioConnectivityResult> {
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    throw new RepositoryError("API key for ImgStudio is not configured", "IMAGE_PROVIDER_NOT_CONFIGURED");
  }

  const normalizedBaseUrl = (baseUrl?.trim() || DEFAULT_IMGSTUDIO_BASE_URL).replace(/\/+$/, "");
  const endpoint = `${normalizedBaseUrl}/api/v1/models`;
  const timeoutSignal = AbortSignal.timeout(IMGSTUDIO_CONNECTIVITY_TIMEOUT_MS);
  let response: Response;
  let rawText: string;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        "Content-Type": "application/json",
      },
      signal: timeoutSignal,
    });
    rawText = await response.text();
  } catch (error) {
    throw createUnavailableError(error);
  }

  const payload = parseJsonSafe(rawText);
  if (!response.ok) {
    throw createImgStudioHttpError(response.status, extractErrorMessage(rawText, payload));
  }
  if (!payload) {
    throw new ImgStudioApiError(
      "ImgStudio models endpoint returned malformed or non-JSON response",
      "IMAGE_PROVIDER_FAILED",
      false,
      response.status,
    );
  }

  const models = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : undefined;
  if (!models) {
    throw new ImgStudioApiError(
      "ImgStudio models endpoint returned an unexpected response schema",
      "IMAGE_PROVIDER_FAILED",
      false,
      response.status,
    );
  }
  return { ok: true, models };
}
