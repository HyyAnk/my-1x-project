import { describe, expect, it } from "vitest";
import {
  ProviderCircuitBreaker,
  createProviderCircuitBreaker,
} from "../src/quiz/assets/resolvers/circuitBreaker.js";

describe("ProviderCircuitBreaker", () => {
  it("uses default failure threshold of 5 and initializes clean state", () => {
    const breaker = new ProviderCircuitBreaker();
    expect(breaker.isBypassed("primary")).toBe(false);
    expect(breaker.isBypassed("fallback-level-1")).toBe(false);
    expect(breaker.isBypassed("fallback-level-2")).toBe(false);

    const diagnostics = breaker.getDiagnostics();
    expect(diagnostics.primary).toEqual({
      tripped: false,
      failureCount: 0,
      failedAssets: [],
    });
    expect(diagnostics["fallback-level-1"].failureCount).toBe(0);
    expect(diagnostics["fallback-level-2"].failureCount).toBe(0);
  });

  it("trips the circuit breaker when distinct failed asset IDs reach failure threshold", () => {
    const breaker = new ProviderCircuitBreaker();

    for (let i = 1; i <= 4; i++) {
      const result = breaker.recordFailure("primary", `asset_${i}`);
      expect(result.tripped).toBe(false);
      expect(result.distinctFailures).toBe(i);
      expect(breaker.isBypassed("primary")).toBe(false);
    }

    const tripResult = breaker.recordFailure("primary", "asset_5");
    expect(tripResult.tripped).toBe(true);
    expect(tripResult.distinctFailures).toBe(5);
    expect(breaker.isBypassed("primary")).toBe(true);

    const diagnostics = breaker.getDiagnostics().primary;
    expect(diagnostics.tripped).toBe(true);
    expect(diagnostics.failureCount).toBe(5);
    expect(diagnostics.failedAssets).toEqual([
      "asset_1",
      "asset_2",
      "asset_3",
      "asset_4",
      "asset_5",
    ]);
  });

  it("ensures repeated failures for the same asset ID are idempotent and do not prematurely trip", () => {
    const breaker = new ProviderCircuitBreaker();

    for (let i = 0; i < 10; i++) {
      const res = breaker.recordFailure("primary", "same_asset_id");
      expect(res.tripped).toBe(false);
      expect(res.distinctFailures).toBe(1);
    }

    expect(breaker.isBypassed("primary")).toBe(false);
    const diag = breaker.getDiagnostics().primary;
    expect(diag.failureCount).toBe(1);
    expect(diag.failedAssets).toEqual(["same_asset_id"]);
  });

  it("resets consecutive failure count and untrips breaker when recordSuccess is called", () => {
    const breaker = new ProviderCircuitBreaker();

    for (let i = 1; i <= 5; i++) {
      breaker.recordFailure("primary", `asset_${i}`);
    }
    expect(breaker.isBypassed("primary")).toBe(true);

    breaker.recordSuccess("primary");

    expect(breaker.isBypassed("primary")).toBe(false);
    const diag = breaker.getDiagnostics().primary;
    expect(diag.tripped).toBe(false);
    expect(diag.failureCount).toBe(0);
    expect(diag.failedAssets).toEqual([]);

    const nextFailure = breaker.recordFailure("primary", "new_asset");
    expect(nextFailure.tripped).toBe(false);
    expect(nextFailure.distinctFailures).toBe(1);
  });

  it("operates different provider tiers independently", () => {
    const breaker = new ProviderCircuitBreaker();

    for (let i = 1; i <= 5; i++) {
      breaker.recordFailure("primary", `asset_${i}`);
    }

    expect(breaker.isBypassed("primary")).toBe(true);
    expect(breaker.isBypassed("fallback-level-1")).toBe(false);
    expect(breaker.isBypassed("fallback-level-2")).toBe(false);

    for (let i = 1; i <= 5; i++) {
      breaker.recordFailure("fallback-level-1", `fb_asset_${i}`);
    }

    expect(breaker.isBypassed("primary")).toBe(true);
    expect(breaker.isBypassed("fallback-level-1")).toBe(true);
    expect(breaker.isBypassed("fallback-level-2")).toBe(false);

    breaker.reset("primary");
    expect(breaker.isBypassed("primary")).toBe(false);
    expect(breaker.isBypassed("fallback-level-1")).toBe(true);

    breaker.reset();
    expect(breaker.isBypassed("fallback-level-1")).toBe(false);
  });

  it("supports custom failureThreshold and factory helper", () => {
    const breaker = createProviderCircuitBreaker({ failureThreshold: 2 });

    breaker.recordFailure("primary", "asset_a");
    expect(breaker.isBypassed("primary")).toBe(false);

    breaker.recordFailure("primary", "asset_b");
    expect(breaker.isBypassed("primary")).toBe(true);
  });

  it("protects internal state against diagnostics array mutation", () => {
    const breaker = new ProviderCircuitBreaker();
    breaker.recordFailure("primary", "asset_immutable");

    const diag = breaker.getDiagnostics();
    diag.primary.failedAssets.push("mutated_asset");

    expect(breaker.getDiagnostics().primary.failedAssets).toEqual(["asset_immutable"]);
    expect(breaker.getDiagnostics().primary.failureCount).toBe(1);
  });

  it("handles concurrent failure reporting across simulated asynchronous promises", async () => {
    const breaker = new ProviderCircuitBreaker({ failureThreshold: 6 });
    const distinctAssetCount = 6;
    const workersPerAsset = 4; // Simulated ASSET_CONCURRENCY = 4

    const tasks: Promise<void>[] = [];
    for (let assetIdx = 1; assetIdx <= distinctAssetCount; assetIdx++) {
      for (let worker = 0; worker < workersPerAsset; worker++) {
        tasks.push(
          (async () => {
            // Introduce micro-task delay to interleave execution
            await Promise.resolve();
            breaker.recordFailure("primary", `concurrent_asset_${assetIdx}`);
          })(),
        );
      }
    }

    await Promise.all(tasks);

    expect(breaker.isBypassed("primary")).toBe(true);
    const diag = breaker.getDiagnostics().primary;
    expect(diag.failureCount).toBe(distinctAssetCount);
    expect(diag.failedAssets.length).toBe(distinctAssetCount);
  });
});
