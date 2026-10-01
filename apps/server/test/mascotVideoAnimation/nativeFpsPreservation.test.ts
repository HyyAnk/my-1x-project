import { describe, it, expect } from "vitest";
import { calculateFpsAndDuration } from "../../src/quiz/mascot/videoAnimation/packaging/manifestBuilder.js";
import { REQUIRED_FPS } from "@studio/shared";

describe("Phase 1 — Native FPS Preservation & Manifest Seam Calculation", () => {
  it("preserves requested native 24 FPS and calculates correct frame duration", () => {
    const result = calculateFpsAndDuration({
      targetCount: 48,
      requestedFps: 24,
      requestedDurationMs: 2000,
    });

    expect(result.fps).toBe(24);
    expect(result.durationMs).toBe(2000);
    expect(result.frameDurationMs).toBeCloseTo(1000 / 24, 4);
  });

  it("preserves requested native 30 FPS and 60 FPS without down-clamping", () => {
    const result30 = calculateFpsAndDuration({
      targetCount: 30,
      requestedFps: 30,
    });
    expect(result30.fps).toBe(30);
    expect(result30.durationMs).toBe(1000);
    expect(result30.frameDurationMs).toBeCloseTo(1000 / 30, 4);

    const result60 = calculateFpsAndDuration({
      targetCount: 60,
      requestedFps: 60,
    });
    expect(result60.fps).toBe(60);
    expect(result60.durationMs).toBe(1000);
    expect(result60.frameDurationMs).toBeCloseTo(1000 / 60, 4);
  });

  it("does not clamp animations under 36 frames to legacy 8 FPS", () => {
    const result24Frames = calculateFpsAndDuration({
      targetCount: 24,
    });
    // Legacy behavior clamped <= 36 frames to 8 FPS.
    // Modern behavior must maintain standard 24 FPS fallback instead of 8 FPS.
    expect(result24Frames.fps).toBe(24);
    expect(result24Frames.fps).not.toBe(8);
  });

  it("maintains REQUIRED_FPS (12) only for 12-frame legacy sprite sequences", () => {
    const result12Frames = calculateFpsAndDuration({
      targetCount: 12,
    });
    expect(result12Frames.fps).toBe(REQUIRED_FPS);
  });
});
