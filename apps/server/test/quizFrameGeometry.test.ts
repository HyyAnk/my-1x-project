import { describe, expect, it } from "vitest";
import { LANDSCAPE_FRAME, REFERENCE_THINKING_RECT } from "../src/quiz/render/frame/landscapeFrameGeometry.js";

describe("landscapeFrameGeometry", () => {
  it("defines the canonical 1920x1080 canvas size", () => {
    expect(LANDSCAPE_FRAME.canvas).toEqual({ width: 1920, height: 1080 });
  });

  it("defines the fixed question card rectangle matching Media Left reference", () => {
    expect(LANDSCAPE_FRAME.question).toEqual({ x: 380, y: 53, width: 1420, height: 168 });
  });

  it("moves thinking bar down exactly 60 canvas pixels from reference", () => {
    expect(REFERENCE_THINKING_RECT).toEqual({ x: 470, y: 822, width: 1240, height: 84 });
    expect(LANDSCAPE_FRAME.thinking).toEqual({ x: 470, y: 882, width: 1240, height: 84 });
    expect(LANDSCAPE_FRAME.thinking.y - REFERENCE_THINKING_RECT.y).toBe(60);
  });

  it("places fact card on the exact same lower dock center as the thinking bar", () => {
    expect(LANDSCAPE_FRAME.fact).toEqual({ x: 470, y: 846, width: 1240, height: 156 });
    const thinkingCenterY = LANDSCAPE_FRAME.thinking.y + LANDSCAPE_FRAME.thinking.height / 2;
    const factCenterY = LANDSCAPE_FRAME.fact.y + LANDSCAPE_FRAME.fact.height / 2;
    expect(thinkingCenterY).toBe(924);
    expect(factCenterY).toBe(924);
  });

  it("defines fixed counter and brand rail anchors", () => {
    expect(LANDSCAPE_FRAME.counter).toEqual({ centerX: 180, top: 0 });
    expect(LANDSCAPE_FRAME.brand).toEqual({ centerX: 180, top: 390, width: 320 });
  });

  it("defines canonical variable arena and timer protection bounds", () => {
    expect(LANDSCAPE_FRAME.arena).toEqual({ x: 380, y: 253, width: 1420, height: 520 });
    expect(LANDSCAPE_FRAME.timerProtection).toEqual({ x: 350, y: 804, width: 1480, height: 240 });
  });

  it("ensures arena bottom leaves clearance above the timer envelope", () => {
    const arenaBottom = LANDSCAPE_FRAME.arena.y + LANDSCAPE_FRAME.arena.height;
    expect(arenaBottom).toBe(773);
    expect(arenaBottom).toBeLessThanOrEqual(780);
    expect(LANDSCAPE_FRAME.timerProtection.y - arenaBottom).toBe(31);
  });
});
