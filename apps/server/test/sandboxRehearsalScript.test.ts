import { describe, expect, it, vi } from "vitest";
import { computeSandboxPhaseTimeline } from "@studio/shared";
import { getSandboxRehearsalClientScript } from "../src/quiz/render/sandbox/sandboxRehearsalScript.js";

function createMockAnimation(initialState: "running" | "paused" | "finished" = "paused", initialTime = 0) {
  return {
    playState: initialState,
    currentTime: initialTime,
    play: vi.fn(function (this: { playState: string; currentTime: number }) {
      this.playState = "running";
    }),
    pause: vi.fn(function (this: { playState: string; currentTime: number }) {
      this.playState = "paused";
    }),
  };
}

function setupMockRehearsalEnvironment(totalDuration: number | ReturnType<typeof computeSandboxPhaseTimeline> = 10.0) {
  const animations = [
    createMockAnimation("paused", 0),
    createMockAnimation("paused", 0),
  ];

  const messageListeners: Array<(event: { data: unknown }) => void> = [];

  const mockWindow: Record<string, any> = {
    addEventListener: vi.fn((event: string, handler: (e: any) => void) => {
      if (event === "message") {
        messageListeners.push(handler);
      }
    }),
    postMessage: vi.fn(),
  };

  const mockDocument: Record<string, any> = {
    getAnimations: vi.fn(() => animations),
  };

  const fn = new Function("window", "document", getSandboxRehearsalClientScript(totalDuration));
  fn(mockWindow, mockDocument);

  return {
    animations,
    messageListeners,
    window: mockWindow,
    rehearsal: mockWindow.__hyperframesRehearsal,
    dispatchMessage: (data: unknown) => {
      for (const listener of messageListeners) {
        listener({ data });
      }
    },
  };
}

describe("sandboxRehearsalScript", () => {
  it("generates script with valid syntax and duration from timeline", () => {
    const timeline = computeSandboxPhaseTimeline();
    const script = getSandboxRehearsalClientScript(timeline);
    expect(script).toContain(`duration: ${timeline.totalDuration.toFixed(3)}`);
    expect(script).toContain("window.__hyperframesRehearsal =");
    expect(script).toContain("REHEARSAL_SEEK");
    expect(script).toContain("REHEARSAL_PLAY");
    expect(script).toContain("REHEARSAL_PAUSE");
  });

  it("handles numeric duration input", () => {
    const script = getSandboxRehearsalClientScript(12.5);
    expect(script).toContain("duration: 12.500");
  });

  it("initializes rehearsal controller in paused state at 0s", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);
    expect(rehearsal).toBeDefined();
    expect(rehearsal.duration).toBe(11.8);
    expect(rehearsal.isPlaying).toBe(false);
    expect(rehearsal.currentTimeSec).toBe(0);

    for (const anim of animations) {
      expect(anim.pause).toHaveBeenCalled();
      expect(anim.currentTime).toBe(0);
    }
  });

  it("seeks animations cleanly and keeps them strictly paused when isPlaying is false", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.seek(3.5);
    expect(rehearsal.currentTimeSec).toBe(3.5);
    expect(rehearsal.isPlaying).toBe(false);

    for (const anim of animations) {
      expect(anim.pause).toHaveBeenCalled();
      expect(anim.currentTime).toBe(3500);
    }
  });

  it("clamps negative seek times to 0 and handles non-numeric values safely", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.seek(-2.5);
    expect(rehearsal.currentTimeSec).toBe(0);
    expect(animations[0].currentTime).toBe(0);

    rehearsal.seek(Number.NaN);
    expect(rehearsal.currentTimeSec).toBe(0);
    expect(animations[0].currentTime).toBe(0);
  });

  it("plays animations and synchronizes currentTime cleanly", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.play(2.47);
    expect(rehearsal.isPlaying).toBe(true);
    expect(rehearsal.currentTimeSec).toBe(2.47);

    for (const anim of animations) {
      expect(anim.play).toHaveBeenCalled();
      expect(anim.currentTime).toBe(2470);
    }
  });

  it("restarts finished animations cleanly when seeking while playing", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    animations[0].playState = "finished";
    rehearsal.isPlaying = true;
    rehearsal.seek(5.0);

    expect(animations[0].play).toHaveBeenCalled();
    expect(animations[0].currentTime).toBe(5000);
  });

  it("pauses animations and preserves currentTime", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.play(4.0);
    animations[0].currentTime = 4250;
    animations[1].currentTime = 4250;

    rehearsal.pause();
    expect(rehearsal.isPlaying).toBe(false);

    for (const anim of animations) {
      expect(anim.pause).toHaveBeenCalled();
      expect(anim.currentTime).toBe(4250);
    }
  });

  it("safely handles postMessage events for SEEK, PLAY, and PAUSE", () => {
    const { rehearsal, dispatchMessage, animations } = setupMockRehearsalEnvironment(11.8);

    dispatchMessage({ type: "REHEARSAL_SEEK", time: 7.47 });
    expect(rehearsal.currentTimeSec).toBe(7.47);
    expect(animations[0].currentTime).toBe(7470);
    expect(rehearsal.isPlaying).toBe(false);

    dispatchMessage({ type: "REHEARSAL_PLAY", time: 7.47 });
    expect(rehearsal.isPlaying).toBe(true);
    expect(animations[0].play).toHaveBeenCalled();

    dispatchMessage({ type: "REHEARSAL_PAUSE" });
    expect(rehearsal.isPlaying).toBe(false);
    expect(animations[0].pause).toHaveBeenCalled();
  });

  it("safely ignores non-object or invalid postMessage events", () => {
    const { rehearsal, dispatchMessage } = setupMockRehearsalEnvironment(11.8);

    expect(() => {
      dispatchMessage(null);
      dispatchMessage("invalid-string");
      dispatchMessage(123);
      dispatchMessage({ type: "UNKNOWN_TYPE" });
    }).not.toThrow();

    expect(rehearsal.isPlaying).toBe(false);
  });

  it("supports bi-directional seeking while paused without getting stuck in finished state or resetting to 0", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    // Scrub forward to 8.0s
    rehearsal.seek(8.0);
    expect(rehearsal.currentTimeSec).toBe(8.0);
    expect(rehearsal.isPlaying).toBe(false);
    expect(animations[0].currentTime).toBe(8000);

    // Simulate an animation reaching finished state at 8.0s
    animations[0].playState = "finished";

    // Scrub backward to 3.2s
    rehearsal.seek(3.2);
    expect(rehearsal.currentTimeSec).toBe(3.2);
    expect(rehearsal.isPlaying).toBe(false);
    expect(animations[0].pause).toHaveBeenCalled();
    expect(animations[0].currentTime).toBe(3200);
    expect(animations[0].playState).toBe("paused");

    // Scrub backward further to 0.5s
    rehearsal.seek(0.5);
    expect(rehearsal.currentTimeSec).toBe(0.5);
    expect(animations[0].currentTime).toBe(500);
    expect(animations[0].playState).toBe("paused");

    // Scrub forward again to 6.0s
    rehearsal.seek(6.0);
    expect(rehearsal.currentTimeSec).toBe(6.0);
    expect(animations[0].currentTime).toBe(6000);
    expect(animations[0].playState).toBe("paused");
  });

  it("supports bi-directional seeking while playing and unfinishes animations cleanly", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.play(2.0);
    expect(rehearsal.isPlaying).toBe(true);

    // Simulate an animation completing at 9.0s
    animations[0].playState = "finished";
    animations[0].currentTime = 9000;

    // Scrub backward to 4.0s while playing
    rehearsal.seek(4.0);
    expect(rehearsal.isPlaying).toBe(true);
    expect(rehearsal.currentTimeSec).toBe(4.0);
    expect(animations[0].play).toHaveBeenCalled();
    expect(animations[0].currentTime).toBe(4000);
    expect(animations[0].playState).toBe("running");
  });

  it("resumes playback smoothly from current playhead when play() is called without arguments", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.seek(3.8);
    expect(rehearsal.isPlaying).toBe(false);
    expect(rehearsal.currentTimeSec).toBe(3.8);

    // Resume from current playhead
    rehearsal.play();
    expect(rehearsal.isPlaying).toBe(true);
    expect(rehearsal.currentTimeSec).toBe(3.8);

    for (const anim of animations) {
      expect(anim.play).toHaveBeenCalled();
      expect(anim.currentTime).toBe(3800);
    }
  });

  it("resets to 0 when resuming playback without time if already at or past duration", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(10.0);

    rehearsal.seek(10.0);
    expect(rehearsal.currentTimeSec).toBe(10.0);

    rehearsal.play();
    expect(rehearsal.isPlaying).toBe(true);
    expect(rehearsal.currentTimeSec).toBe(0);

    for (const anim of animations) {
      expect(anim.play).toHaveBeenCalled();
      expect(anim.currentTime).toBe(0);
    }
  });

  it("resumes finished animations cleanly without stutter under realistic WAAPI spec resetting behavior", () => {
    // Under WAAPI specification, calling anim.play() on an animation with playState === 'finished'
    // synchronously resets currentTime to 0. Our engine must overwrite currentTime with the target time.
    const realisticAnim = {
      playState: "finished",
      currentTime: 10000,
      play: vi.fn(function (this: { playState: string; currentTime: number }) {
        this.playState = "running";
        this.currentTime = 0; // Spec behavior
      }),
      pause: vi.fn(function (this: { playState: string; currentTime: number }) {
        this.playState = "paused";
      }),
    };

    const mockWindow: Record<string, any> = {
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
    };
    const mockDocument: Record<string, any> = {
      getAnimations: vi.fn(() => [realisticAnim]),
    };

    const fn = new Function("window", "document", getSandboxRehearsalClientScript(10.0));
    fn(mockWindow, mockDocument);
    const rehearsal = mockWindow.__hyperframesRehearsal;

    // Test seek while playing
    rehearsal.isPlaying = true;
    realisticAnim.playState = "finished";
    realisticAnim.currentTime = 10000;
    rehearsal.seek(4.5);
    expect(realisticAnim.play).toHaveBeenCalled();
    expect(realisticAnim.currentTime).toBe(4500); // Must be 4500, not 0!

    // Test play(timeSec)
    realisticAnim.playState = "finished";
    realisticAnim.currentTime = 10000;
    rehearsal.play(3.0);
    expect(realisticAnim.play).toHaveBeenCalled();
    expect(realisticAnim.currentTime).toBe(3000); // Must be 3000, not 0!
  });

  it("freezes animations at exact current time during pause() and synchronizes currentTimeSec", () => {
    const { rehearsal, animations } = setupMockRehearsalEnvironment(11.8);

    rehearsal.play(1.0);
    animations[0].currentTime = 5678;
    animations[1].currentTime = 5678;

    rehearsal.pause();
    expect(rehearsal.isPlaying).toBe(false);
    expect(animations[0].pause).toHaveBeenCalled();
    expect(animations[0].currentTime).toBe(5678);
    expect(rehearsal.currentTimeSec).toBe(5.678);
  });

  it("handles postMessage bi-directional scrubbing and playhead resume seamlessly", () => {
    const { rehearsal, dispatchMessage, animations } = setupMockRehearsalEnvironment(11.8);

    // Scrub forward
    dispatchMessage({ type: "REHEARSAL_SEEK", time: 6.5 });
    expect(rehearsal.currentTimeSec).toBe(6.5);
    expect(animations[0].currentTime).toBe(6500);

    // Scrub backward
    dispatchMessage({ type: "REHEARSAL_SEEK", time: 1.2 });
    expect(rehearsal.currentTimeSec).toBe(1.2);
    expect(animations[0].currentTime).toBe(1200);

    // Resume play without specifying time in message
    dispatchMessage({ type: "REHEARSAL_PLAY" });
    expect(rehearsal.isPlaying).toBe(true);
    expect(rehearsal.currentTimeSec).toBe(1.2);
    expect(animations[0].play).toHaveBeenCalled();
    expect(animations[0].currentTime).toBe(1200);

    // Pause
    dispatchMessage({ type: "REHEARSAL_PAUSE" });
    expect(rehearsal.isPlaying).toBe(false);
    expect(animations[0].pause).toHaveBeenCalled();
  });
});
