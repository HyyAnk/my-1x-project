import { describe, expect, it } from "vitest";
import { SandboxAudioEngine, buildSandboxRehearsalCues } from "./sandboxAudioEngine";

describe("SandboxAudioEngine", () => {
  it("builds the canonical list of rehearsal SFX cues with exact calibrated timestamps", () => {
    const cues = buildSandboxRehearsalCues();
    expect(cues.length).toBe(9);

    // 1. Choices entrance pop at choicesStart (0.85s)
    const choicesCue = cues.find((c) => c.id === "choices-enter");
    expect(choicesCue).toBeDefined();
    expect(choicesCue?.filename).toBe("ui_pop.wav");
    expect(choicesCue?.timeSeconds).toBe(0.85);

    // 2. Countdown 5-to-1 ticks (2.47s, 3.47s, 4.47s, 5.47s, 6.47s)
    const cd5Cue = cues.find((c) => c.id === "cd-5");
    expect(cd5Cue?.filename).toBe("countdown_5.wav");
    expect(cd5Cue?.timeSeconds).toBe(2.47);

    const cd4Cue = cues.find((c) => c.id === "cd-4");
    expect(cd4Cue?.filename).toBe("countdown_4.wav");
    expect(cd4Cue?.timeSeconds).toBe(3.47);

    const cd3Cue = cues.find((c) => c.id === "cd-3");
    expect(cd3Cue?.filename).toBe("countdown_3.wav");
    expect(cd3Cue?.timeSeconds).toBe(4.47);

    const cd2Cue = cues.find((c) => c.id === "cd-2");
    expect(cd2Cue?.filename).toBe("countdown_2.wav");
    expect(cd2Cue?.timeSeconds).toBe(5.47);

    const cd1Cue = cues.find((c) => c.id === "cd-1");
    expect(cd1Cue?.filename).toBe("countdown_1.wav");
    expect(cd1Cue?.timeSeconds).toBe(6.47);

    // 3. Countdown final chime & Answer Reveal triumph at revealStart (7.47s)
    const cdFinalCue = cues.find((c) => c.id === "cd-final");
    expect(cdFinalCue).toBeDefined();
    expect(cdFinalCue?.filename).toBe("countdown_final.wav");
    expect(cdFinalCue?.timeSeconds).toBe(7.47);

    const revealCue = cues.find((c) => c.id === "answer-reveal");
    expect(revealCue).toBeDefined();
    expect(revealCue?.filename).toBe("correct_triumph.wav");
    expect(revealCue?.timeSeconds).toBe(7.47);
    expect(revealCue?.durationSeconds).toBe(0.62);
    expect(revealCue?.targetAnimation).toBe("correct-card-reveal");

    // 4. Fun fact reward stars burst at explainStart (8.27s)
    const factCue = cues.find((c) => c.id === "reward-fact");
    expect(factCue).toBeDefined();
    expect(factCue?.filename).toBe("streak.wav");
    expect(factCue?.timeSeconds).toBe(8.27);
  });

  it("handles wrong or timeout reveal outcomes with streak SFX and provides playRevealSfx helper", () => {
    const wrongCues = buildSandboxRehearsalCues(undefined, "wrong");
    const wrongRevealCue = wrongCues.find((c) => c.id === "answer-reveal");
    expect(wrongRevealCue?.filename).toBe("streak.wav");

    const timeoutCues = buildSandboxRehearsalCues(undefined, "timeout");
    const timeoutRevealCue = timeoutCues.find((c) => c.id === "answer-reveal");
    expect(timeoutRevealCue?.filename).toBe("streak.wav");

    const engine = new SandboxAudioEngine();
    // Verify playRevealSfx can be called safely without errors
    expect(() => engine.playRevealSfx("correct")).not.toThrow();
    expect(() => engine.playRevealSfx("wrong")).not.toThrow();
  });

  it("handles mute, master volume bounds, and stopAll properly", () => {
    const engine = new SandboxAudioEngine();
    expect(engine.getMuted()).toBe(false);

    engine.toggleMute();
    expect(engine.getMuted()).toBe(true);

    engine.setMuted(false);
    expect(engine.getMuted()).toBe(false);

    engine.setMasterVolume(0.5);
    expect(engine.getMasterVolume()).toBe(0.5);

    // Clamps within [0, 1]
    engine.setMasterVolume(-0.5);
    expect(engine.getMasterVolume()).toBe(0);

    engine.setMasterVolume(1.8);
    expect(engine.getMasterVolume()).toBe(1);

    // stopAll operates safely
    expect(() => engine.stopAll()).not.toThrow();
  });
});
