const TRANSIENT_ERROR_PATTERN =
  /(?:429|resource[_\s]?exhausted|rate[_\s]?limit|too many requests|502|503|504|bad gateway|service unavailable|gateway timeout|econnreset|econnrefused|etimedout|socket hang up)/i;

export interface RetryWithBackoffOptions {
  /** Total attempts including the first one. Defaults to 3. */
  attempts?: number;
  /** Delay before the first retry in ms. Defaults to 2000. */
  baseDelayMs?: number;
  /** Multiplier applied to the delay after each retry. Defaults to 2. */
  backoffMultiplier?: number;
  /** Maximum single delay in ms. Defaults to 15000. */
  maxDelayMs?: number;
  /** Extra jitter added to each delay in ms. Defaults to 750. */
  jitterMs?: number;
  /** Returns true when this error should NOT be retried (takes precedence). */
  isNonRetryable?: (error: unknown) => boolean;
  /** Called before each retry with (error, attemptNumberStartingAt1, delayMs). */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

function isTransientError(error: unknown): boolean {
  if (error instanceof RangeError && /abort/i.test(error.message)) return false;
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_ERROR_PATTERN.test(message);
}

/**
 * Retries an async operation with exponential backoff and jitter for
 * transient provider failures (rate limits, 5xx, connection resets).
 * Aborts and non-transient errors are rethrown immediately.
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryWithBackoffOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 2_000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;
  const maxDelayMs = options.maxDelayMs ?? 15_000;
  const jitterMs = options.jitterMs ?? 750;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt >= attempts;
      const nonRetryable = options.isNonRetryable?.(error) ?? false;
      if (isLastAttempt || nonRetryable || !isTransientError(error)) {
        throw error;
      }
      const delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(backoffMultiplier, attempt - 1)) + Math.random() * jitterMs;
      options.onRetry?.(error, attempt, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
