import { describe, expect, it } from "vitest";
import {
  createBeatGrid,
  cubicBezier,
  easeInOutCubic,
  easeOutBack,
  easeOutElastic,
  easeOutExpo,
  generateDeterministicMotionRuntimeScript,
  partitionMotionPhases,
  quantizeToFrame,
  sampleSpring,
  sampleWindowedSpring,
} from "../src/quiz/render/motion/index.js";

describe("Deterministic Motion Runtime - Spring Physics", () => {
  it("samples closed-form harmonic oscillator at boundary timestamps", () => {
    const atZero = sampleSpring(0, { from: 0, to: 100 });
    expect(atZero.value).toBe(0);
    expect(atZero.settled).toBe(false);

    const mid = sampleSpring(0.15, { from: 0, to: 100, stiffness: 200, damping: 10 });
    expect(mid.value).toBeGreaterThan(0);

    // Overdamped case
    const overdamped = sampleSpring(0.5, { stiffness: 100, damping: 40 });
    expect(overdamped.value).toBeGreaterThan(0);
    expect(overdamped.value).toBeLessThanOrEqual(1.0);

    // Settle check at t=2.0s
    const settled = sampleSpring(2.0, { stiffness: 180, damping: 14, from: 0, to: 1 });
    expect(settled.value).toBeCloseTo(1, 2);
    expect(settled.settled).toBe(true);
  });

  it("handles windowed spring delays accurately", () => {
    const preWindow = sampleWindowedSpring(0.5, 1.0, { from: 0, to: 1 });
    expect(preWindow.value).toBe(0);

    const postWindow = sampleWindowedSpring(1.2, 1.0, { from: 0, to: 1 });
    expect(postWindow.value).toBeGreaterThan(0);
  });
});

describe("Deterministic Motion Runtime - Easing Curves", () => {
  it("evaluates polynomial easing curves deterministically", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);

    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
    expect(easeOutExpo(0.3)).toBeGreaterThan(0.8);

    expect(easeOutBack(0)).toBe(0);
    expect(easeOutBack(1)).toBe(1);
    expect(easeOutBack(0.7)).toBeGreaterThan(1.0); // Overshoot verified

    expect(easeOutElastic(0)).toBe(0);
    expect(easeOutElastic(1)).toBe(1);
  });

  it("solves cubic bezier accurately using Newton-Raphson", () => {
    const standardEase = cubicBezier(0.25, 0.1, 0.25, 1.0);
    expect(standardEase(0)).toBe(0);
    expect(standardEase(1)).toBe(1);
    expect(standardEase(0.5)).toBeGreaterThan(0.4);
    expect(standardEase(0.5)).toBeLessThan(0.9);
  });
});

describe("Deterministic Motion Runtime - Timing & Beat Grid", () => {
  it("calculates musical beat and bar intervals from BPM", () => {
    const grid = createBeatGrid(120, 4);
    expect(grid.secondsPerBeat).toBe(0.5);
    expect(grid.secondsPerBar).toBe(2.0);
    expect(grid.getBeatTime(3)).toBe(1.5);
    expect(grid.getBarTime(2)).toBe(4.0);
    expect(grid.getClosestBeat(1.15)).toBe(1.0);
    expect(grid.getClosestBeat(1.35)).toBe(1.5);
  });

  it("partitions motion clip duration into distinct phases", () => {
    const phases = partitionMotionPhases(3.0, 0.25, 0.2);
    expect(phases.totalDuration).toBe(3.0);
    expect(phases.entranceDuration).toBe(0.75);
    expect(phases.exitDuration).toBe(0.6);
    expect(phases.holdDuration).toBe(1.65);

    expect(phases.getPhase(-0.1)).toBe("pre");
    expect(phases.getPhase(0.3)).toBe("entrance");
    expect(phases.getPhase(1.5)).toBe("hold");
    expect(phases.getPhase(2.6)).toBe("exit");
    expect(phases.getPhase(3.5)).toBe("post");

    expect(phases.getPhaseProgress(0.375)).toBeCloseTo(0.5, 2);
  });

  it("quantizes timestamps cleanly to video frame intervals", () => {
    expect(quantizeToFrame(0.033, 30)).toBe(0.033);
    expect(quantizeToFrame(0.5, 30)).toBe(0.5);
    expect(quantizeToFrame(1.016, 60)).toBe(1.017);
  });
});

describe("Deterministic Motion Runtime - Client Script Generator", () => {
  it("generates standalone client script runtime without syntax errors", () => {
    const script = generateDeterministicMotionRuntimeScript();
    expect(script).toContain("window.__motionSeek");
    expect(script).toContain("window.__registerMotionScene");
    expect(script).toContain("sampleSpringMath");
    expect(script).toContain("easeInOutCubicMath");
  });
});
