/**
 * Configuration options for AdaptiveRateLimiter.
 */
export interface AdaptiveRateLimiterOptions {
  /**
   * Maximum burst capacity of the token bucket.
   * Defaults to 20 tokens.
   */
  capacity?: number;

  /**
   * Continuous token refill rate per second.
   * Defaults to 10 tokens / second.
   */
  refillRate?: number;

  /**
   * Base cooldown delay in milliseconds when a rate limit or 429 error occurs.
   * Defaults to 1,000 ms.
   */
  backoffBaseMs?: number;

  /**
   * Maximum cooldown delay in milliseconds under sustained rate limits.
   * Defaults to 30,000 ms.
   */
  backoffMaxMs?: number;

  /**
   * Multiplier applied to the cooldown penalty on consecutive rate limit errors.
   * Defaults to 2.0.
   */
  backoffMultiplier?: number;

  /**
   * Factor by which effective refill rate is throttled during active rate limit penalties.
   * Defaults to 0.5 (half rate).
   */
  throttleFactor?: number;

  /**
   * Custom predicate to detect if an error is a rate limit or transient resource exhaustion.
   */
  isRateLimitError?: (error: unknown) => boolean;
}

/**
 * Operational snapshot metrics of the rate limiter.
 */
export interface AdaptiveRateLimiterStats {
  tokens: number;
  capacity: number;
  refillRate: number;
  effectiveRefillRate: number;
  consecutiveErrors: number;
  totalErrors: number;
  totalRequests: number;
  totalThrottled: number;
  cooldownRemainingMs: number;
  currentBackoffMs: number;
  queuedWaiters: number;
}

/**
 * Internal queued waiter awaiting token availability.
 */
export interface LimiterWaiter {
  tokens: number;
  resolve: () => void;
  reject: (err: Error) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
}
