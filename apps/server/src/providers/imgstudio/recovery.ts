import { randomUUID } from "node:crypto";
import { ImgStudioApiError } from "./errors.js";
import { generateImgStudioImageBytes } from "./generator.js";
import type { ImgStudioGenerationOptions, ImgStudioImageResult } from "./types.js";

function hasIdempotencyFailureShape(error: object): boolean {
  return (
    ("code" in error && (error as { code?: unknown }).code === "IMAGE_PROVIDER_IDEMPOTENCY_FAILED") ||
    ("status" in error && (error as { status?: unknown }).status === 409) ||
    ("message" in error &&
      typeof (error as { message?: unknown }).message === "string" &&
      (error as { message: string }).message.includes("409"))
  );
}

function isIdempotencyError(error: unknown): boolean {
  if (error instanceof ImgStudioApiError && (error.code === "IMAGE_PROVIDER_IDEMPOTENCY_FAILED" || error.status === 409)) {
    return true;
  }
  return typeof error === "object" && error !== null && hasIdempotencyFailureShape(error);
}

function describeRetryReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Executes ImgStudio image generation with automatic idempotency recovery.
 *
 * When the ImgStudio server returns HTTP 409 (indicating that a previous attempt with
 * this idempotency key failed on the server and explicitly requires a new key),
 * this helper automatically regenerates a fresh, uniquely salted idempotency key and retries once.
 */
export async function generateImgStudioWithIdempotencyRecovery(
  prompt: string,
  options: ImgStudioGenerationOptions = {},
  onRetry?: (freshKey: string, reason: string) => void,
): Promise<ImgStudioImageResult> {
  try {
    return await generateImgStudioImageBytes(prompt, options);
  } catch (error) {
    if (isIdempotencyError(error) && !options.cancellationSignal?.aborted) {
      const baseKey = options.idempotencyKey || "imgstudio";
      const freshKey = `${baseKey}_retry_${randomUUID().slice(0, 8)}`;
      const errorMessage = describeRetryReason(error);
      onRetry?.(freshKey, errorMessage);
      return await generateImgStudioImageBytes(prompt, {
        ...options,
        idempotencyKey: freshKey,
      });
    }
    throw error;
  }
}
