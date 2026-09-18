/**
 * Implements token bucket refill and consumption logic based on elapsed wall-clock time.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefillTimestamp = Date.now();

  constructor(
    public readonly capacity: number,
    public readonly refillRate: number,
  ) {
    this.tokens = capacity;
  }

  public get currentTokens(): number {
    return this.tokens;
  }

  public refill(effectiveRate: number, now = Date.now()): void {
    const elapsed = (now - this.lastRefillTimestamp) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * effectiveRate);
    this.lastRefillTimestamp = now;
  }

  public tryConsume(needed: number): boolean {
    if (this.tokens < needed) return false;
    this.tokens -= needed;
    return true;
  }

  public consume(amount: number): void {
    this.tokens -= amount;
  }

  public reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
  }
}
