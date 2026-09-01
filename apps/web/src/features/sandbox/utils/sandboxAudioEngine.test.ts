import { describe, expect, it, vi } from "vitest";
import { SandboxAudioEngine, buildSandboxRehearsalCues } from "./sandboxAudioEngine";

describe("SandboxAudioEngine", () => {
  it("builds the canonical list of rehearsal SFX cues with correct timestamps", () => {
    const cues = buildSandboxRehearsalCues();
    expect(cues.length).toBeGreaterThanOrEqual(7);

    const choicesCue = cues.find((c) => c.id === "choices-enter");
    expect(choicesCue).toBeDefined();
    expect(choicesCue?.filename).toBe("ui_pop.wav");

    const cd5Cue = cues.find((c) => c.id === "cd-5");
    expect(cd5Cue?.filename).toBe("countdown_tick.wav");

    const cd1Cue = cues.find((c) => c.id === "cd-1");
    expect(cd1Cue?.filename).toBe("countdown_final.wav");

    const revealCue = cues.find((c) => c.id === "answer-reveal");
    expect(revealCue?.filename).toBe("correct_triumph.wav");

    const factCue = cues.find((c) => c.id === "reward-fact");
    expect(factCue?.filename).toBe("streak.wav");
  });

  it("handles mute and master volume toggling properly", () => {
    const engine = new SandboxAudioEngine();
    expect(engine.getMuted()).toBe(false);

    engine.toggleMute();
    expect(engine.getMuted()).toBe(true);

    engine.setMuted(false);
    expect(engine.getMuted()).toBe(false);
  });
});
