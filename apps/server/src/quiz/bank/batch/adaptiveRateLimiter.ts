import type { AdaptiveRateLimiterOptions, AdaptiveRateLimiterStats } from "./adaptiveRateLimiter.types.js";
import { isRateLimitError } from "./rateLimitErrorDetector.js";
import { LimiterWaiterQueue, computeDrainDelayMs } from "./limiterWaiterQueue.js";
import { RateLimiterBackoff } from "./rateLimiterBackoff.js";
import { TokenBucket } from "./tokenBucket.js";

export type { AdaptiveRateLimiterOptions, AdaptiveRateLimiterStats };
export { isRateLimitError, RateLimiterBackoff, TokenBucket };

/**
 * Adaptive Rate Limiter coordinating token replenishment, waiter queuing, and adaptive backoff.
 */
export class AdaptiveRateLimiter {
  private readonly bucket: TokenBucket;
  private readonly backoff: RateLimiterBackoff;
  private readonly queue = new LimiterWaiterQueue();
  private readonly isRateLimitPredicate: (error: unknown) => boolean;

  private totalRequests = 0;
  private totalThrottled = 0;
  private isDisposed = false;

  constructor(options: AdaptiveRateLimiterOptions = {}) {
    const capacity = Math.max(1, options.capacity ?? 20);
    const refillRate = Math.max(0.1, options.refillRate ?? 10);
    const baseMs = Math.max(50, options.backoffBaseMs ?? 1000);
    this.bucket = new TokenBucket(capacity, refillRate);
    this.backoff = new RateLimiterBackoff({
      baseMs,
      maxMs: Math.max(baseMs, options.backoffMaxMs ?? 30000),
      multiplier: Math.max(1, options.backoffMultiplier ?? 2),
      throttleFactor: Math.max(0.1, Math.min(1.0, options.throttleFactor ?? 0.5)),
    });
    this.isRateLimitPredicate = options.isRateLimitError ?? isRateLimitError;
  }

  public getEffectiveRefillRate(): number {
    return Math.max(0.1, this.bucket.refillRate * this.backoff.getThrottleMultiplier());
  }

  public tryAcquire(tokens = 1): boolean {
    if (this.isDisposed) return false;
    const now = Date.now();
    this.bucket.refill(this.getEffectiveRefillRate(), now);
    if (this.backoff.isInCooldown(now) || this.queue.length > 0 || !this.bucket.tryConsume(tokens)) {
      return false;
    }
    this.totalRequests++;
    return true;
  }

  public async acquire(tokens = 1, signal?: AbortSignal): Promise<void> {
    if (this.isDisposed) throw new Error("AdaptiveRateLimiter is disposed");
    if (signal?.aborted) {
      const err = new Error("Rate limit acquire aborted");
      err.name = "AbortError";
      throw err;
    }
    if (this.tryAcquire(tokens)) return;
    this.totalThrottled++;
    return new Promise<void>((resolve, reject) => {
      this.queue.enqueue(tokens, resolve, reject, signal);
      this.scheduleQueueDrain();
    });
  }

  public async wrap<T>(fn: () => Promise<T>, tokens = 1, signal?: AbortSignal): Promise<T> {
    await this.acquire(tokens, signal);
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onError(err);
      throw err;
    }
  }

  public onSuccess(): void {
    this.backoff.recordSuccess();
    this.scheduleQueueDrain();
  }

  public recordSuccess(): void {
    this.onSuccess();
  }
  public recordError(error: unknown): void {
    this.onError(error);
  }

  public onError(error: unknown): void {
    if (!this.isRateLimitPredicate(error)) return;
    this.backoff.recordError(Date.now());
    this.scheduleQueueDrain();
  }

  public getStats(): AdaptiveRateLimiterStats {
    const now = Date.now();
    this.bucket.refill(this.getEffectiveRefillRate(), now);
    return {
      tokens: Number(this.bucket.currentTokens.toFixed(2)),
      capacity: this.bucket.capacity,
      refillRate: this.bucket.refillRate,
      effectiveRefillRate: this.getEffectiveRefillRate(),
      totalRequests: this.totalRequests,
      totalThrottled: this.totalThrottled,
      cooldownRemainingMs: this.backoff.getCooldownRemainingMs(now),
      queuedWaiters: this.queue.length,
      ...this.backoff.stats,
    };
  }

  public reset(): void {
    this.queue.clearTimer();
    this.bucket.reset();
    this.backoff.reset();
    this.totalRequests = this.totalThrottled = 0;
    this.scheduleQueueDrain();
  }

  public dispose(): void {
    this.isDisposed = true;
    this.queue.rejectAll(new Error("AdaptiveRateLimiter was disposed"));
  }

  private scheduleQueueDrain(): void {
    if (this.isDisposed || this.queue.length === 0) return;
    const now = Date.now();
    this.bucket.refill(this.getEffectiveRefillRate(), now);
    const needed = (this.queue.peek()?.tokens ?? 0) - this.bucket.currentTokens;
    const delay = computeDrainDelayMs(this.backoff.getCooldownRemainingMs(now), needed, this.getEffectiveRefillRate());
    this.queue.scheduleDrain(delay, () => this.drainQueue());
  }

  private drainQueue(): void {
    if (this.isDisposed) return;
    const now = Date.now();
    this.bucket.refill(this.getEffectiveRefillRate(), now);
    if (this.backoff.isInCooldown(now)) {
      this.scheduleQueueDrain();
      return;
    }
    this.queue.drainReady(this.bucket.currentTokens, (acquired) => {
      this.bucket.consume(acquired);
      this.totalRequests++;
    });
    if (this.queue.length > 0) this.scheduleQueueDrain();
  }
}
