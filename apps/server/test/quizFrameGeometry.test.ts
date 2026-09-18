import { describe, expect, it } from "vitest";
import { LANDSCAPE_FRAME, LAYOUT_ARENA_GEOMETRY, REFERENCE_THINKING_RECT } from "../src/quiz/render/frame/landscapeFrameGeometry.js";

describe("landscapeFrameGeometry", () => {
  it("defines the canonical 1920x1080 canvas size", () => {
    expect(LANDSCAPE_FRAME.canvas).toEqual({ width: 1920, height: 1080 });
  });

  it("defines the fixed question card rectangle matching Media Left reference", () => {
    expect(LANDSCAPE_FRAME.question).toEqual({ x: 380, y: 53, width: 1420, height: 168 });
  });

  it("moves thinking bar down exactly 114 canvas pixels from reference", () => {
    expect(REFERENCE_THINKING_RECT).toEqual({ x: 470, y: 822, width: 1240, height: 84 });
    expect(LANDSCAPE_FRAME.thinking).toEqual({ x: 470, y: 936, width: 1240, height: 84 });
    expect(LANDSCAPE_FRAME.thinking.y - REFERENCE_THINKING_RECT.y).toBe(114);
  });

  it("verifies thinking bar distance to bottom of canvas is exactly 60px", () => {
    const thinkingBottom = LANDSCAPE_FRAME.thinking.y + LANDSCAPE_FRAME.thinking.height;
    expect(LANDSCAPE_FRAME.canvas.height - thinkingBottom).toBe(60);
  });

  it("moves fact card down 40px to y=886 with 38px bottom clearance", () => {
    expect(LANDSCAPE_FRAME.fact).toEqual({ x: 470, y: 886, width: 1240, height: 156 });
    const factBottom = LANDSCAPE_FRAME.fact.y + LANDSCAPE_FRAME.fact.height;
    expect(factBottom).toBe(1042);
    expect(LANDSCAPE_FRAME.canvas.height - factBottom).toBe(38);
  });

  it("defines fixed counter and brand rail anchors", () => {
    expect(LANDSCAPE_FRAME.counter).toEqual({
      x: 0,
      top: 53,
      width: 380,
      height: 168,
      centerX: 190,
      bodyCenterY: 137,
    });
    expect(LANDSCAPE_FRAME.brand).toEqual({ centerX: 180, top: 390, width: 320 });
  });

  it("defines canonical base arena and per-layout arena heights", () => {
    expect(LANDSCAPE_FRAME.arena).toEqual({ x: 380, y: 253, width: 1420, height: 520 });
    expect(LAYOUT_ARENA_GEOMETRY.media_left_choices_right.height).toBe(570);
    expect(LAYOUT_ARENA_GEOMETRY.visual_choices_three.height).toBe(586);
    expect(LAYOUT_ARENA_GEOMETRY.visual_choices_three_pure.height).toBe(608);
    expect(LAYOUT_ARENA_GEOMETRY.split_versus_two.height).toBe(578);
    expect(LAYOUT_ARENA_GEOMETRY.verdict_true_false.height).toBe(565);
    expect(LAYOUT_ARENA_GEOMETRY.full_stack_list.height).toBe(528);
    expect(LAYOUT_ARENA_GEOMETRY.mystery_reveal.height).toBe(757);
  });
});
