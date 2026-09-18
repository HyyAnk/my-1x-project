import { describe, it, expect, vi, afterEach } from "vitest";
import { AdaptiveRateLimiter, isRateLimitError } from "../src/quiz/bank/batch/adaptiveRateLimiter.js";

describe("AdaptiveRateLimiter", () => {
  let limiter: AdaptiveRateLimiter;

  afterEach(() => {
    limiter?.dispose();
    vi.useRealTimers();
  });

  describe("isRateLimitError", () => {
    it("identifies status / statusCode / code 429", () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
      expect(isRateLimitError({ code: 429 })).toBe(true);
      expect(isRateLimitError({ code: "RESOURCE_EXHAUSTED" })).toBe(true);
      expect(isRateLimitError({ code: "RATE_LIMIT_EXCEEDED" })).toBe(true);
    });

    it("identifies rate limit keywords in error message", () => {
      expect(isRateLimitError(new Error("429 Too Many Requests"))).toBe(true);
      expect(isRateLimitError(new Error("Quota exceeded for quota metric"))).toBe(true);
      expect(isRateLimitError(new Error("Resource has been exhausted (e.g. check quota)"))).toBe(true);
      expect(isRateLimitError(new Error("Client throttled by gateway"))).toBe(true);
    });

    it("returns false for non-rate-limit errors", () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
      expect(isRateLimitError(new Error("Syntax error"))).toBe(false);
      expect(isRateLimitError(new Error("Connection reset by peer"))).toBe(false);
    });
  });

  describe("Token Bucket capacity and refill", () => {
    it("allows burst acquire up to capacity without delay", async () => {
      limiter = new AdaptiveRateLimiter({ capacity: 5, refillRate: 10 });
      const stats0 = limiter.getStats();
      expect(stats0.tokens).toBe(5);
      expect(stats0.capacity).toBe(5);

      for (let i = 0; i < 5; i++) {
        expect(limiter.tryAcquire(1)).toBe(true);
      }

      expect(limiter.tryAcquire(1)).toBe(false);
    });

    it("waits asynchronously when tokens are depleted and fulfills upon refill", async () => {
      // 2 tokens capacity, refill 10 per second (= 1 token per 100ms)
      limiter = new AdaptiveRateLimiter({ capacity: 2, refillRate: 10 });

      await limiter.acquire(1);
      await limiter.acquire(1);

      const start = Date.now();
      await limiter.acquire(1);
      const elapsed = Date.now() - start;

      // Should have waited roughly 80-150ms for the 3rd token
      expect(elapsed).toBeGreaterThanOrEqual(50);
      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(3);
    });
  });

  describe("Adaptive Backoff on 429 / Rate Limits", () => {
    it("imposes cooldown penalty and throttles refill rate on rate limit errors", async () => {
      limiter = new AdaptiveRateLimiter({
        capacity: 10,
        refillRate: 20,
        backoffBaseMs: 150,
        backoffMultiplier: 2,
        throttleFactor: 0.5,
      });

      expect(limiter.getEffectiveRefillRate()).toBe(20);

      // Trigger first rate limit error
      limiter.onError(new Error("429 RESOURCE_EXHAUSTED"));
      const stats1 = limiter.getStats();
      expect(stats1.consecutiveErrors).toBe(1);
      expect(stats1.currentBackoffMs).toBe(150);
      expect(stats1.cooldownRemainingMs).toBeGreaterThan(0);
      expect(limiter.getEffectiveRefillRate()).toBe(10); // 20 * 0.5

      // Immediate tryAcquire must fail due to active cooldown
      expect(limiter.tryAcquire(1)).toBe(false);

      // Trigger second rate limit error
      limiter.onError(new Error("rate limit reached"));
      const stats2 = limiter.getStats();
      expect(stats2.consecutiveErrors).toBe(2);
      expect(stats2.currentBackoffMs).toBe(300); // 150 * 2
    });

    it("gradually recovers backoff on successful requests", () => {
      limiter = new AdaptiveRateLimiter({
        capacity: 10,
        refillRate: 10,
        backoffBaseMs: 100,
      });

      limiter.onError(new Error("429 RESOURCE_EXHAUSTED"));
      expect(limiter.getStats().consecutiveErrors).toBe(1);

      limiter.onSuccess();
      expect(limiter.getStats().consecutiveErrors).toBe(0);
      expect(limiter.getStats().currentBackoffMs).toBe(0);
    });

    it("ignores non-rate-limit errors in onError", () => {
      limiter = new AdaptiveRateLimiter();
      limiter.onError(new Error("Unknown parsing failure"));
      expect(limiter.getStats().consecutiveErrors).toBe(0);
      expect(limiter.getStats().totalErrors).toBe(0);
    });
  });

  describe("AbortSignal handling", () => {
    it("throws immediately if signal is already aborted", async () => {
      limiter = new AdaptiveRateLimiter({ capacity: 5 });
      const ac = new AbortController();
      ac.abort();

      await expect(limiter.acquire(1, ac.signal)).rejects.toThrow("Rate limit acquire aborted");
    });

    it("aborts queued waiter when signal is triggered while waiting", async () => {
      limiter = new AdaptiveRateLimiter({ capacity: 1, refillRate: 1 });
      await limiter.acquire(1);

      const ac = new AbortController();
      const waitPromise = limiter.acquire(1, ac.signal);

      expect(limiter.getStats().queuedWaiters).toBe(1);

      // Abort while queued
      ac.abort();

      await expect(waitPromise).rejects.toThrow("Rate limit acquire aborted");
      expect(limiter.getStats().queuedWaiters).toBe(0);
    });
  });

  describe("Reset and Dispose", () => {
    it("resets state cleanly", () => {
      limiter = new AdaptiveRateLimiter({ capacity: 10 });
      limiter.tryAcquire(5);
      limiter.onError(new Error("429 Rate limited"));

      limiter.reset();
      const stats = limiter.getStats();
      expect(stats.tokens).toBe(10);
      expect(stats.consecutiveErrors).toBe(0);
      expect(stats.cooldownRemainingMs).toBe(0);
    });

    it("disposes and rejects pending waiters", async () => {
      limiter = new AdaptiveRateLimiter({ capacity: 1, refillRate: 1 });
      await limiter.acquire(1);

      const waitPromise = limiter.acquire(1);
      limiter.dispose();

      await expect(waitPromise).rejects.toThrow("AdaptiveRateLimiter was disposed");
      await expect(limiter.acquire(1)).rejects.toThrow("AdaptiveRateLimiter is disposed");
    });
  });

  describe("wrap and record aliases", () => {
    it("wraps successful async action and records success", async () => {
      limiter = new AdaptiveRateLimiter({ capacity: 5 });
      const result = await limiter.wrap(async () => "success-val");
      expect(result).toBe("success-val");
      expect(limiter.getStats().totalRequests).toBe(1);
    });

    it("wraps failing async action and records error", async () => {
      limiter = new AdaptiveRateLimiter({ capacity: 5 });
      await expect(
        limiter.wrap(async () => {
          throw new Error("429 Too Many Requests");
        }),
      ).rejects.toThrow("429 Too Many Requests");
      expect(limiter.getStats().consecutiveErrors).toBe(1);
    });

    it("supports recordError and recordSuccess aliases", () => {
      limiter = new AdaptiveRateLimiter({ capacity: 5 });
      limiter.recordError(new Error("429 Rate Limit"));
      expect(limiter.getStats().consecutiveErrors).toBe(1);
      limiter.recordSuccess();
      expect(limiter.getStats().consecutiveErrors).toBe(0);
    });
  });
});
