import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeSandboxPhaseTimeline,
  getSandboxPhaseAtTime,
  getSandboxPhaseTimestamps,
  REHEARSAL_PHASE_START_TIMESTAMPS,
  REVEAL_ANIMATION_DURATION_SECONDS,
  SETTLED_SANDBOX_PHASE_TIMESTAMPS,
  timingPolicyForAgeBand,
} from "../src/timing.js";

describe("Quiz Timing Engine & Settled Phase Resolution", () => {
  it("defines exact settled keyframe timestamps for all preview phases", () => {
    assert.equal(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question, 0.6);
    assert.equal(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices, 2.0);
    assert.equal(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking, 3.5);
    assert.equal(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal, 8.1);
    assert.equal(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain, 8.8);
    assert.equal(REVEAL_ANIMATION_DURATION_SECONDS, 0.62);
    assert.equal(REHEARSAL_PHASE_START_TIMESTAMPS.reveal, 7.47);
  });

  it("returns calibrated settled keyframe timestamps via getSandboxPhaseTimestamps", () => {
    const buttons = getSandboxPhaseTimestamps();
    assert.equal(buttons.length, 5);
    assert.deepEqual(
      buttons.map((b) => b.id),
      ["question", "choices", "thinking", "reveal", "explain"],
    );

    const questionBtn = buttons.find((b) => b.id === "question");
    const choicesBtn = buttons.find((b) => b.id === "choices");
    const thinkingBtn = buttons.find((b) => b.id === "thinking");
    const revealBtn = buttons.find((b) => b.id === "reveal");
    const explainBtn = buttons.find((b) => b.id === "explain");

    assert.equal(questionBtn?.time, 0.6);
    assert.equal(choicesBtn?.time, 2.0);
    assert.equal(thinkingBtn?.time, 3.5);
    assert.equal(revealBtn?.time, 8.1);
    assert.equal(explainBtn?.time, 8.8);
  });

  it("maps calibrated settled keyframe timestamps to their respective phase IDs", () => {
    assert.equal(getSandboxPhaseAtTime(0.6), "question");
    assert.equal(getSandboxPhaseAtTime(2.0), "choices");
    assert.equal(getSandboxPhaseAtTime(3.5), "thinking");
    assert.equal(getSandboxPhaseAtTime(8.1), "reveal");
    assert.equal(getSandboxPhaseAtTime(8.8), "explain");
  });

  it("computes exact sandbox phase timeline boundaries", () => {
    const policy = timingPolicyForAgeBand("7-9");
    const timeline = computeSandboxPhaseTimeline(policy);

    assert.equal(timeline.questionStart, 0);
    assert.equal(timeline.choicesStart, 0.85);
    assert.equal(timeline.thinkingStart, 2.47);
    assert.equal(timeline.revealStart, 7.47);
    assert.equal(timeline.explainStart, 8.27);
    assert.equal(timeline.totalDuration, 8.27 + policy.explanation_hold_seconds);
  });

  it("resolves phase boundaries accurately across edge transitions", () => {
    const timeline = computeSandboxPhaseTimeline();

    // Start of question
    assert.equal(getSandboxPhaseAtTime(0), "question");
    // Just before choices entrance (0.85s)
    assert.equal(getSandboxPhaseAtTime(timeline.choicesStart - 0.01), "question");
    // Choices start
    assert.equal(getSandboxPhaseAtTime(timeline.choicesStart), "choices");
    // Just before thinking begins (2.47s)
    assert.equal(getSandboxPhaseAtTime(timeline.thinkingStart - 0.01), "choices");
    // Thinking start
    assert.equal(getSandboxPhaseAtTime(timeline.thinkingStart), "thinking");
    // Just before reveal pop (7.47s)
    assert.equal(getSandboxPhaseAtTime(timeline.revealStart - 0.01), "thinking");
    // Reveal start
    assert.equal(getSandboxPhaseAtTime(timeline.revealStart), "reveal");
    // Just before explanation card appears (8.27s)
    assert.equal(getSandboxPhaseAtTime(timeline.explainStart - 0.01), "reveal");
    // Explain start
    assert.equal(getSandboxPhaseAtTime(timeline.explainStart), "explain");
    // Deep into explain hold
    assert.equal(getSandboxPhaseAtTime(timeline.explainStart + 1.5), "explain");
  });

  it("provides tailored thinking pacing by age band in timingPolicyForAgeBand", () => {
    const youngPolicy = timingPolicyForAgeBand("4-6");
    const middlePolicy = timingPolicyForAgeBand("7-9");
    const olderPolicy = timingPolicyForAgeBand("10-12");
    const familyPolicy = timingPolicyForAgeBand("family");

    assert.equal(youngPolicy.minimum_thinking_seconds, 7.2);
    assert.equal(youngPolicy.maximum_thinking_seconds, 8.5);

    assert.equal(middlePolicy.minimum_thinking_seconds, 6.8);
    assert.equal(middlePolicy.maximum_thinking_seconds, 8.0);

    assert.equal(olderPolicy.minimum_thinking_seconds, 6.5);
    assert.equal(olderPolicy.maximum_thinking_seconds, 7.8);

    assert.equal(familyPolicy.minimum_thinking_seconds, 6.8);
    assert.equal(familyPolicy.maximum_thinking_seconds, 8.0);
  });
});
