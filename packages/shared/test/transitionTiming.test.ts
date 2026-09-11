import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import { resolveTransitionInstance } from "../src/transitions/resolveTransition.js";
import { quantizeSecondsToFrames } from "../src/transitions/transitionTiming.js";
import { transitionContext } from "./helpers/transitionContext.js";

describe("Transition Timing & Quantization (Task 1)", () => {
  it("does not move the production source handoff", () => {
    const instance = resolveTransitionInstance(
      { id: "stinger_swipe", durationSeconds: 0.5 },
      transitionContext({
        placement: "intro",
        boundaryFrame: 45,
        startFrame: 30,
        availableEndFrameExclusive: 60,
      }),
    );
    assert.equal(instance.boundaryFrame, 45);
    assert.ok(instance.startFrame >= 30, `startFrame ${instance.startFrame} should be >= 30`);
    assert.ok(instance.endFrameExclusive <= 60, `endFrameExclusive ${instance.endFrameExclusive} should be <= 60`);
    assert.equal(instance.endFrameExclusive - instance.startFrame, instance.durationFrames);
  });

  it("resolves cut with zero effect frames anchored at boundaryFrame", () => {
    const instance = resolveTransitionInstance(
      { id: "cut" },
      transitionContext({
        placement: "intro",
        boundaryFrame: 45,
        startFrame: 0,
        availableEndFrameExclusive: 90,
      }),
    );
    assert.equal(instance.id, "cut");
    assert.equal(instance.durationFrames, 0);
    assert.equal(instance.effectiveDurationSeconds, 0);
    assert.equal(instance.boundaryFrame, 45);
    assert.equal(instance.startFrame, 45);
    assert.equal(instance.endFrameExclusive, 45);
    assert.equal(instance.timingAdjustment, "none");
  });

  it("quantizes duration cleanly with rational FPS", () => {
    // 0.5s at 30/1 FPS = 15 frames
    assert.equal(quantizeSecondsToFrames(0.5, { numerator: 30, denominator: 1 }), 15);
    // 0.5s at 60/1 FPS = 30 frames
    assert.equal(quantizeSecondsToFrames(0.5, { numerator: 60, denominator: 1 }), 30);
    // 0.5s at 24/1 FPS = 12 frames
    assert.equal(quantizeSecondsToFrames(0.5, { numerator: 24, denominator: 1 }), 12);
    // 0.5s at 30000/1001 FPS (~29.97) = 15 frames
    assert.equal(quantizeSecondsToFrames(0.5, { numerator: 30000, denominator: 1001 }), 15);
  });

  it("handles window-limited timing adjustments when boundary is tight", () => {
    // Available window from 40 to 50 = 10 frames max.
    // Requested 0.8s at 30 FPS = 24 frames.
    // Must scale down to fit within available window and mark timingAdjustment as window-limited.
    const instance = resolveTransitionInstance(
      { id: "bubble_splash", durationSeconds: 0.8 },
      transitionContext({
        placement: "scene",
        startFrame: 40,
        boundaryFrame: 45,
        availableEndFrameExclusive: 50,
      }),
    );
    assert.ok(instance.durationFrames <= 10);
    assert.ok(instance.startFrame >= 40);
    assert.ok(instance.endFrameExclusive <= 50);
    assert.equal(instance.timingAdjustment, "window-limited");
  });

  it("rejects invalid windows and malformed inputs", () => {
    assert.throws(() =>
      resolveTransitionInstance(
        { id: "bubble_splash" },
        transitionContext({ startFrame: 50, boundaryFrame: 45, availableEndFrameExclusive: 60 }),
      ),
    );

    assert.throws(() =>
      resolveTransitionInstance(
        { id: "bubble_splash" },
        transitionContext({ startFrame: 0, boundaryFrame: 60, availableEndFrameExclusive: 50 }),
      ),
    );

    assert.throws(() =>
      resolveTransitionInstance(
        { id: "bubble_splash" },
        transitionContext({ fps: { numerator: 0, denominator: 1 } }),
      ),
    );
  });
});
