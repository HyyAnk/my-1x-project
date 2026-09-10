export type GenerationErrorCode =
  | "REFERENCE_INPUT_UNSUPPORTED"
  | "IMAGE_PROVIDER_NOT_CONFIGURED"
  | "IMAGE_PROVIDER_FAILED"
  | "INVALID_DIMENSIONS"
  | "CORRUPT_IMAGE"
  | "IMAGE_CORRUPTED"
  | "PROVIDER_ERROR"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "ANIMATION_ATLAS_REJECTED"
  | "IMAGE_TIMEOUT"
  | "OPERATION_CANCELLED"
  | "MISSING_REFERENCE"
  | "INVALID_REFERENCE_PATH"
  | "STALE_DEPENDENCY"
  | "LLM_PROVIDER_FAILED"
  | "PARSE_ERROR"
  | "VALIDATION_FAILED";

export interface GenerationErrorOptions {
  retryable?: boolean;
  safeDetails?: Record<string, unknown>;
  cause?: unknown;
}

export class GenerationError extends Error {
  public readonly code: GenerationErrorCode;
  public readonly retryable: boolean;
  public readonly safeDetails?: Record<string, unknown>;

  constructor(code: GenerationErrorCode, message: string, options?: GenerationErrorOptions) {
    super(message);
    this.name = "GenerationError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.safeDetails = options?.safeDetails;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
