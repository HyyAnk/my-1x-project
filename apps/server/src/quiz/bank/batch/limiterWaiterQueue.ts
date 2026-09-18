import type { LimiterWaiter } from "./adaptiveRateLimiter.types.js";

/**
 * Calculates optimal timer delay in ms to retry draining the waiter queue.
 */
export function computeDrainDelayMs(cooldownRemainingMs: number, tokensNeeded: number, refillRate: number): number {
  if (cooldownRemainingMs > 0) return cooldownRemainingMs + 5;
  if (tokensNeeded <= 0) return 0;
  return Math.max(5, Math.ceil((tokensNeeded / refillRate) * 1000));
}

/**
 * Manages the FIFO queue of waiting token requests with AbortSignal cancellation support.
 */
export class LimiterWaiterQueue {
  private waiters: LimiterWaiter[] = [];
  private queueTimer: NodeJS.Timeout | null = null;

  public get length(): number {
    return this.waiters.length;
  }

  public enqueue(tokens: number, resolve: () => void, reject: (err: Error) => void, signal?: AbortSignal): LimiterWaiter {
    const waiter: LimiterWaiter = { tokens, resolve, reject, signal };
    if (signal) {
      waiter.abortListener = () => {
        this.remove(waiter);
        const err = new Error("Rate limit acquire aborted");
        err.name = "AbortError";
        reject(err);
      };
      signal.addEventListener("abort", waiter.abortListener, { once: true });
    }
    this.waiters.push(waiter);
    return waiter;
  }

  public peek(): LimiterWaiter | undefined {
    return this.waiters[0];
  }

  public dequeue(): LimiterWaiter | undefined {
    const waiter = this.waiters.shift();
    if (waiter) this.cleanupListener(waiter);
    return waiter;
  }

  public drainReady(availableTokens: number, onAcquire: (tokens: number) => void): void {
    while (this.waiters.length > 0) {
      const next = this.waiters[0];
      if (next.signal?.aborted) {
        this.dequeue();
        continue;
      }
      if (availableTokens >= next.tokens) {
        this.dequeue();
        availableTokens -= next.tokens;
        onAcquire(next.tokens);
        next.resolve();
      } else {
        break;
      }
    }
  }

  public remove(waiter: LimiterWaiter): boolean {
    this.cleanupListener(waiter);
    const index = this.waiters.indexOf(waiter);
    if (index !== -1) {
      this.waiters.splice(index, 1);
      return true;
    }
    return false;
  }

  public clearTimer(): void {
    if (this.queueTimer) clearTimeout(this.queueTimer);
    this.queueTimer = null;
  }

  public scheduleDrain(delayMs: number, onDrain: () => void): void {
    this.clearTimer();
    this.queueTimer = setTimeout(onDrain, delayMs);
  }

  public rejectAll(error: Error): void {
    this.clearTimer();
    const pending = [...this.waiters];
    this.waiters = [];
    for (const waiter of pending) {
      this.cleanupListener(waiter);
      waiter.reject(error);
    }
  }

  private cleanupListener(waiter: LimiterWaiter): void {
    if (waiter.signal && waiter.abortListener) {
      waiter.signal.removeEventListener("abort", waiter.abortListener);
      waiter.abortListener = undefined;
    }
  }
}
