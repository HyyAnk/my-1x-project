import { executeSinglePromptText, type LLMClient } from "../../../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../../../utils/retryWithBackoff.js";
import type { AdaptiveRateLimiter } from "../adaptiveRateLimiter.js";
import type { ChunkRetryOptions } from "../types/batchChunk.types.js";

/**
 * Async Mutex to ensure thread-safe persistence and progress callbacks across concurrent workers.
 */
export class AsyncMutex {
  private mutex: Promise<void> = Promise.resolve();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.mutex;
    let release: () => void;
    this.mutex = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

/**
 * Single prompt execution with transient rate-limit retry and adaptive rate limiting.
 */
export async function executePromptWithRetry(
  llmClient: LLMClient,
  prompt: string,
  signal?: AbortSignal,
  rateLimiter?: AdaptiveRateLimiter,
): Promise<string> {
  if (rateLimiter) {
    await rateLimiter.acquire(1, signal);
  }
  try {
    const result = await retryWithBackoff(
      () =>
        executeSinglePromptText(llmClient, prompt, {
          signal,
          timeoutMs: 180_000,
        }),
      {
        attempts: 2,
        baseDelayMs: 2000,
        jitterMs: 1500,
        onRetry: (err) => {
          rateLimiter?.onError(err);
        },
      },
    );
    rateLimiter?.onSuccess();
    return result;
  } catch (err) {
    rateLimiter?.onError(err);
    throw err;
  }
}

/**
 * Retries an asynchronous chunk operation with exponential backoff and jitter.
 * Aborts immediately without retrying if the abort signal is triggered.
 */
export async function retryChunkOperation<T>(
  operation: (attempt: number) => Promise<T>,
  options: ChunkRetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 500);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 4000);
  const jitterMs = Math.max(0, options.jitterMs ?? 200);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      const abortError = new Error("Batch generation cancelled by user");
      abortError.name = "AbortError";
      throw abortError;
    }
    try {
      return await operation(attempt);
    } catch (err) {
      lastError = err;
      if (options.signal?.aborted || attempt >= maxAttempts) {
        throw err;
      }
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)) + Math.random() * jitterMs;
      options.onRetry?.(err, attempt, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
