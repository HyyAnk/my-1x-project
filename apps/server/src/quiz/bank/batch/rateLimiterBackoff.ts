/**
 * Configuration options for exponential adaptive backoff calculations.
 */
export interface BackoffConfig {
  baseMs: number;
  maxMs: number;
  multiplier: number;
  throttleFactor: number;
}

/**
 * Manages consecutive rate limit error state, cooldown penalties, and recovery decay.
 */
export class RateLimiterBackoff {
  private consecutiveErrors = 0;
  private totalErrors = 0;
  private cooldownUntil = 0;
  private currentBackoffMs = 0;

  constructor(private readonly config: BackoffConfig) {}

  public get stats() {
    return {
      consecutiveErrors: this.consecutiveErrors,
      totalErrors: this.totalErrors,
      currentBackoffMs: this.currentBackoffMs,
      cooldownUntil: this.cooldownUntil,
    };
  }

  public isThrottled(): boolean {
    return this.consecutiveErrors > 0;
  }

  public getThrottleMultiplier(): number {
    return this.consecutiveErrors > 0 ? this.config.throttleFactor : 1.0;
  }

  public isInCooldown(now: number): boolean {
    return now < this.cooldownUntil;
  }

  public getCooldownRemainingMs(now: number): number {
    return Math.max(0, this.cooldownUntil - now);
  }

  public recordSuccess(): void {
    if (this.consecutiveErrors > 0) {
      this.consecutiveErrors--;
      if (this.consecutiveErrors === 0) {
        this.currentBackoffMs = 0;
      }
    }
  }

  public recordError(now: number): void {
    this.consecutiveErrors++;
    this.totalErrors++;
    const delay = Math.min(this.config.maxMs, this.config.baseMs * Math.pow(this.config.multiplier, this.consecutiveErrors - 1));
    this.currentBackoffMs = delay;
    this.cooldownUntil = Math.max(this.cooldownUntil, now + delay);
  }

  public reset(): void {
    this.consecutiveErrors = 0;
    this.totalErrors = 0;
    this.cooldownUntil = 0;
    this.currentBackoffMs = 0;
  }
}
