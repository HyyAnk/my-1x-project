import { randomUUID } from "node:crypto";
import { ImgStudioApiError } from "./errors.js";
import { generateImgStudioImageBytes } from "./generator.js";
import type { ImgStudioGenerationOptions, ImgStudioImageResult } from "./types.js";

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
    if (
      error instanceof ImgStudioApiError &&
      error.code === "IMAGE_PROVIDER_IDEMPOTENCY_FAILED" &&
      !options.cancellationSignal?.aborted
    ) {
      const baseKey = options.idempotencyKey || "imgstudio";
      const freshKey = `${baseKey}_retry_${randomUUID().slice(0, 8)}`;
      onRetry?.(freshKey, error.message);
      return await generateImgStudioImageBytes(prompt, {
        ...options,
        idempotencyKey: freshKey,
      });
    }
    throw error;
  }
}
