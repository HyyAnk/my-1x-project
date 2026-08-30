import { describe, expect, it } from "vitest";
import { calculateRenderPerformance, estimateSpeedupComparison } from "../src/tasks/video/videoBenchmark.js";

describe("videoBenchmark", () => {
  it("calculates accurate realtime performance metrics", () => {
    // 900 frames at 30 FPS = 30-second video rendered in 15 seconds (2x realtime)
    const metrics = calculateRenderPerformance({
      totalFrames: 900,
      durationMs: 15_000,
      videoFps: 30,
      workerCount: 6,
      quality: "standard",
      fastRenderMode: true,
    });

    expect(metrics.effectiveFps).toBe(60);
    expect(metrics.realtimeFactor).toBe(2);
    expect(metrics.totalDurationSeconds).toBe(15);
    expect(metrics.frameRenderTimeMs).toBe(16.67);
    expect(metrics.throughputPerWorkerFps).toBe(10);
    expect(metrics.summary).toContain("Rendered 900 frames in 15.0s");
  });

  it("calculates speedup comparisons accurately", () => {
    // Baseline: 60s render -> Optimized: 20s render
    const comparison = estimateSpeedupComparison(60_000, 20_000);
    expect(comparison.speedupMultiplier).toBe(3);
    expect(comparison.timeSavedPercent).toBe(66.7);
    expect(comparison.timeSavedSeconds).toBe(40);
  });

  it("handles edge cases safely without dividing by zero", () => {
    const zeroMetrics = calculateRenderPerformance({
      totalFrames: 100,
      durationMs: 0,
      videoFps: 30,
      workerCount: 0,
      quality: "draft",
      fastRenderMode: false,
    });

    expect(zeroMetrics.effectiveFps).toBeGreaterThan(0);
    expect(zeroMetrics.realtimeFactor).toBeGreaterThan(0);
  });
});
