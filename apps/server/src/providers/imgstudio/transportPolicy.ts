import { ImgStudioApiError } from "./errors.js";

export const IMGSTUDIO_REQUEST_TIMEOUT_MS = 300_000;
export const IMGSTUDIO_OPERATION_TIMEOUT_MS = 600_000;
export const IMGSTUDIO_PROCESSING_POLL_INTERVAL_MS = 2_000;
export const IMGSTUDIO_MIN_PROCESSING_POLL_INTERVAL_MS = 1_500;
export const IMGSTUDIO_MAX_PROCESSING_POLLS = 150;
export const IMGSTUDIO_MAX_TRANSIENT_RETRIES = 1;
export const IMGSTUDIO_CONNECTIVITY_TIMEOUT_MS = 15_000;

export function resolveRetryDelayMs(response: Response, fallbackMs: number, minimumMs = 0): number {
  const retryAfter = response.headers?.get("retry-after")?.trim();
  if (!retryAfter) return fallbackMs;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.max(seconds * 1_000, minimumMs), 30_000);
  const retryAt = Date.parse(retryAfter);
  return Number.isFinite(retryAt) ? Math.min(Math.max(retryAt - Date.now(), minimumMs), 30_000) : fallbackMs;
}

function cancelledError(cause: unknown): Error {
  return new Error("ImgStudio image generation was cancelled", { cause });
}

export function operationTimeoutError(cause?: unknown): ImgStudioApiError {
  return new ImgStudioApiError(
    `ImgStudio image generation did not complete within ${IMGSTUDIO_OPERATION_TIMEOUT_MS / 1_000} seconds`,
    "IMAGE_PROVIDER_TIMEOUT",
    true,
    undefined,
    cause === undefined ? undefined : { cause },
  );
}

export async function waitWithSignal(milliseconds: number, signal: AbortSignal): Promise<void> {
  const abortError = (): Error =>
    signal.reason instanceof Error ? signal.reason : new Error("Operation aborted", { cause: signal.reason });
  if (signal.aborted) throw abortError();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", abort, { once: true });

    function finish(): void {
      signal.removeEventListener("abort", abort);
      resolve();
    }

    function abort(): void {
      clearTimeout(timer);
      reject(abortError());
    }
  });
}

export function translateTransportError(
  error: unknown,
  cancellationSignal: AbortSignal | undefined,
  operationTimeoutSignal: AbortSignal,
): Error {
  if (cancellationSignal?.aborted) return cancelledError(error);
  if (operationTimeoutSignal.aborted) return operationTimeoutError(error);
  return createUnavailableError(error);
}

export function createUnavailableError(error: unknown): ImgStudioApiError {
  return new ImgStudioApiError(
    `Failed to connect to ImgStudio API: ${error instanceof Error ? error.message : String(error)}`,
    "IMAGE_PROVIDER_UNAVAILABLE",
    true,
    undefined,
    { cause: error },
  );
}
