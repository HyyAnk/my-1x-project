import { RepositoryError } from "../../repository.js";

export class ImgStudioApiError extends RepositoryError {
  constructor(
    message: string,
    code: string,
    public readonly retryable: boolean,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, code, options);
    this.name = "ImgStudioApiError";
  }
}

export function createImgStudioHttpError(status: number, errorMessage: string): ImgStudioApiError {
  const isContentFilter =
    (status === 400 || status === 422) && /(?:content filter|safety|moderation|policy|prohibited|inappropriate|violat)/i.test(errorMessage);

  if (isContentFilter) {
    return new ImgStudioApiError(
      `ImgStudio API content filter rejection (${status}): ${errorMessage}`,
      "IMAGE_CONTENT_FILTER_REJECTED",
      false,
      status,
    );
  }

  if (status === 401 || status === 403) {
    return new ImgStudioApiError(
      `ImgStudio API authentication or access failed (${status}): ${errorMessage}`,
      "IMAGE_PROVIDER_AUTH_ERROR",
      false,
      status,
    );
  }

  if (status === 402) {
    return new ImgStudioApiError(`ImgStudio API payment required (402): ${errorMessage}`, "IMAGE_PROVIDER_PAYMENT_REQUIRED", false, status);
  }

  if (status === 409) {
    return new ImgStudioApiError(
      `ImgStudio API idempotent task failed (409): ${errorMessage}`,
      "IMAGE_PROVIDER_IDEMPOTENCY_FAILED",
      false,
      status,
    );
  }

  if (status === 429) {
    return new ImgStudioApiError(`ImgStudio API rate limit exceeded (429): ${errorMessage}`, "RATE_LIMIT_EXCEEDED", true, status);
  }

  if (status >= 500) {
    return new ImgStudioApiError(`ImgStudio API server error (${status}): ${errorMessage}`, "IMAGE_PROVIDER_SERVER_ERROR", true, status);
  }

  return new ImgStudioApiError(`ImgStudio API failed (${status}): ${errorMessage}`, "IMAGE_PROVIDER_FAILED", false, status);
}

export function isRetryableImgStudioError(error: unknown): boolean {
  return error instanceof ImgStudioApiError && error.retryable;
}
