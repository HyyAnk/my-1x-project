/**
 * Adaptive Rate Limiter
 * Implements a Token Bucket / Leaky Bucket rate limiter with dynamic adaptive backoff
 * to regulate concurrent LLM prompt dispatches, prevent process pool exhaustion,
 * and gracefully handle 429 / RESOURCE_EXHAUSTED responses.
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

interface LimiterWaiter {
  tokens: number;
  resolve: () => void;
  reject: (err: Error) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
}

const RATE_LIMIT_PATTERN =
  /(?:429|resource.*exhausted|rate[_\s]?limit|too many requests|quota|throttl)/i;

/**
 * Detects whether an unknown error represents a rate limit (HTTP 429, RESOURCE_EXHAUSTED, etc.).
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err.status === 429 || err.statusCode === 429 || err.code === 429) {
      return true;
    }
    if (err.code === "RESOURCE_EXHAUSTED" || err.code === "RATE_LIMIT_EXCEEDED") {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return RATE_LIMIT_PATTERN.test(message);
}

export class AdaptiveRateLimiter {
  private readonly capacity: number;
  private readonly initialRefillRate: number;
  private readonly backoffBaseMs: number;
  private readonly backoffMaxMs: number;
  private readonly backoffMultiplier: number;
  private readonly throttleFactor: number;
  private readonly isRateLimitPredicate: (error: unknown) => boolean;

  private tokens: number;
  private lastRefillTimestamp: number;
  private cooldownUntil = 0;
  private currentBackoffMs = 0;
  private consecutiveErrors = 0;
  private totalErrors = 0;
  private totalRequests = 0;
  private totalThrottled = 0;

  private waiters: LimiterWaiter[] = [];
  private queueTimer: NodeJS.Timeout | null = null;
  private isDisposed = false;

  constructor(options: AdaptiveRateLimiterOptions = {}) {
    this.capacity = Math.max(1, options.capacity ?? 20);
    this.initialRefillRate = Math.max(0.1, options.refillRate ?? 10);
    this.backoffBaseMs = Math.max(50, options.backoffBaseMs ?? 1000);
    this.backoffMaxMs = Math.max(this.backoffBaseMs, options.backoffMaxMs ?? 30000);
    this.backoffMultiplier = Math.max(1, options.backoffMultiplier ?? 2);
    this.throttleFactor = Math.max(0.1, Math.min(1.0, options.throttleFactor ?? 0.5));
    this.isRateLimitPredicate = options.isRateLimitError ?? isRateLimitError;

    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Computes the current effective refill rate taking active throttling into account.
   */
  public getEffectiveRefillRate(): number {
    if (this.consecutiveErrors > 0) {
      return Math.max(0.1, this.initialRefillRate * this.throttleFactor);
    }
    return this.initialRefillRate;
  }

  /**
   * Refills tokens based on elapsed wall-clock time and current effective refill rate.
   */
  private refill(now: number): void {
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    if (elapsedSeconds <= 0) return;

    const rate = this.getEffectiveRefillRate();
    const addedTokens = elapsedSeconds * rate;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastRefillTimestamp = now;
  }

  /**
   * Non-blocking attempt to acquire tokens.
   * Returns true if acquired immediately, false otherwise.
   */
  public tryAcquire(tokens = 1): boolean {
    if (this.isDisposed) return false;
    const now = Date.now();
    this.refill(now);

    const isInCooldown = now < this.cooldownUntil;
    if (isInCooldown || this.waiters.length > 0 || this.tokens < tokens) {
      return false;
    }

    this.tokens -= tokens;
    this.totalRequests++;
    return true;
  }

  /**
   * Asynchronously acquires tokens, waiting if bucket is depleted or limiter is in cooldown.
   * Respects optional AbortSignal.
   */
  public async acquire(tokens = 1, signal?: AbortSignal): Promise<void> {
    if (this.isDisposed) {
      throw new Error("AdaptiveRateLimiter is disposed");
    }

    if (signal?.aborted) {
      const err = new Error("Rate limit acquire aborted");
      err.name = "AbortError";
      throw err;
    }

    const now = Date.now();
    this.refill(now);

    const isInCooldown = now < this.cooldownUntil;
    if (!isInCooldown && this.waiters.length === 0 && this.tokens >= tokens) {
      this.tokens -= tokens;
      this.totalRequests++;
      return;
    }

    this.totalThrottled++;

    return new Promise<void>((resolve, reject) => {
      const waiter: LimiterWaiter = {
        tokens,
        resolve,
        reject,
        signal,
      };

      if (signal) {
        waiter.abortListener = () => {
          this.removeWaiter(waiter);
          const err = new Error("Rate limit acquire aborted");
          err.name = "AbortError";
          reject(err);
        };
        signal.addEventListener("abort", waiter.abortListener, { once: true });
      }

      this.waiters.push(waiter);
      this.scheduleQueueDrain();
    });
  }

  /**
   * Called upon successful prompt execution to reward throughput and gradually decay backoff.
   */
  public onSuccess(): void {
    if (this.consecutiveErrors > 0) {
      this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
      if (this.consecutiveErrors === 0) {
        this.currentBackoffMs = 0;
      }
    }
    this.scheduleQueueDrain();
  }

  /**
   * Called when an execution error occurs. If rate limit or resource exhaustion is detected,
   * triggers adaptive backoff penalty.
   */
  public onError(error: unknown): void {
    if (!this.isRateLimitPredicate(error)) {
      return;
    }

    const now = Date.now();
    this.consecutiveErrors++;
    this.totalErrors++;

    const delay = Math.min(
      this.backoffMaxMs,
      this.backoffBaseMs * Math.pow(this.backoffMultiplier, this.consecutiveErrors - 1),
    );

    this.currentBackoffMs = delay;
    this.cooldownUntil = Math.max(this.cooldownUntil, now + delay);
    this.scheduleQueueDrain();
  }

  /**
   * Returns current operational metrics of the rate limiter.
   */
  public getStats(): AdaptiveRateLimiterStats {
    const now = Date.now();
    this.refill(now);
    return {
      tokens: Number(this.tokens.toFixed(2)),
      capacity: this.capacity,
      refillRate: this.initialRefillRate,
      effectiveRefillRate: this.getEffectiveRefillRate(),
      consecutiveErrors: this.consecutiveErrors,
      totalErrors: this.totalErrors,
      totalRequests: this.totalRequests,
      totalThrottled: this.totalThrottled,
      cooldownRemainingMs: Math.max(0, this.cooldownUntil - now),
      currentBackoffMs: this.currentBackoffMs,
      queuedWaiters: this.waiters.length,
    };
  }

  /**
   * Resets limiter to initial state, clearing errors and penalties.
   */
  public reset(): void {
    this.clearQueueTimer();
    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
    this.cooldownUntil = 0;
    this.currentBackoffMs = 0;
    this.consecutiveErrors = 0;
    this.totalErrors = 0;
    this.totalRequests = 0;
    this.totalThrottled = 0;
    this.scheduleQueueDrain();
  }

  /**
   * Cleans up pending timers and rejects any remaining queued waiters.
   */
  public dispose(): void {
    this.isDisposed = true;
    this.clearQueueTimer();
    const waitersToReject = [...this.waiters];
    this.waiters = [];

    for (const waiter of waitersToReject) {
      this.cleanupWaiterListener(waiter);
      waiter.reject(new Error("AdaptiveRateLimiter was disposed"));
    }
  }

  private removeWaiter(waiter: LimiterWaiter): void {
    this.cleanupWaiterListener(waiter);
    const index = this.waiters.indexOf(waiter);
    if (index !== -1) {
      this.waiters.splice(index, 1);
    }
  }

  private cleanupWaiterListener(waiter: LimiterWaiter): void {
    if (waiter.signal && waiter.abortListener) {
      waiter.signal.removeEventListener("abort", waiter.abortListener);
      waiter.abortListener = undefined;
    }
  }

  private clearQueueTimer(): void {
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = null;
    }
  }

  private scheduleQueueDrain(): void {
    if (this.isDisposed || this.waiters.length === 0) {
      return;
    }

    this.clearQueueTimer();

    const now = Date.now();
    this.refill(now);

    const cooldownRemaining = Math.max(0, this.cooldownUntil - now);
    if (cooldownRemaining > 0) {
      this.queueTimer = setTimeout(() => this.drainQueue(), cooldownRemaining + 5);
      return;
    }

    const firstWaiter = this.waiters[0];
    if (this.tokens >= firstWaiter.tokens) {
      // Tokens are ready immediately, schedule microtask / zero-delay
      this.queueTimer = setTimeout(() => this.drainQueue(), 0);
      return;
    }

    // Calculate delay required to refill needed tokens
    const needed = firstWaiter.tokens - this.tokens;
    const rate = this.getEffectiveRefillRate();
    const waitMs = Math.ceil((needed / rate) * 1000);
    this.queueTimer = setTimeout(() => this.drainQueue(), Math.max(5, waitMs));
  }

  private drainQueue(): void {
    this.queueTimer = null;
    if (this.isDisposed) return;

    const now = Date.now();
    this.refill(now);

    if (now < this.cooldownUntil) {
      this.scheduleQueueDrain();
      return;
    }

    while (this.waiters.length > 0) {
      const next = this.waiters[0];
      if (next.signal?.aborted) {
        this.removeWaiter(next);
        continue;
      }

      if (this.tokens >= next.tokens) {
        this.removeWaiter(next);
        this.tokens -= next.tokens;
        this.totalRequests++;
        next.resolve();
      } else {
        break;
      }
    }

    if (this.waiters.length > 0) {
      this.scheduleQueueDrain();
    }
  }
}
