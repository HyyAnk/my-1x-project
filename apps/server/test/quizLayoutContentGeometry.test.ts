import { describe, expect, it } from "vitest";
import { LAYOUT_CONTENT_GEOMETRY } from "../src/quiz/render/layouts/layoutContentGeometry.js";
import { QUIZ_LANDSCAPE_LAYOUT_IDS } from "@studio/shared";

describe("quizLayoutContentGeometry", () => {
  it("defines content geometry for all eight active landscape layouts", () => {
    for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
      expect(LAYOUT_CONTENT_GEOMETRY[layoutId]).toBeDefined();
    }
  });

  describe("media_left_choices_right", () => {
    it("defines hero and answers for 2 and 3 choices", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.media_left_choices_right;
      expect(g.hero).toEqual({ x: 380, y: 253, width: 720, height: 510 });
      expect(g.answers[2]).toEqual([
        { x: 1140, y: 336, width: 660, height: 152 },
        { x: 1140, y: 528, width: 660, height: 152 },
      ]);
      expect(g.answers[3]).toEqual([
        { x: 1140, y: 274, width: 660, height: 132 },
        { x: 1140, y: 442, width: 660, height: 132 },
        { x: 1140, y: 610, width: 660, height: 132 },
      ]);
    });
  });

  describe("visual_choices_three", () => {
    it("defines null hero and 3 choice cards", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.visual_choices_three;
      expect(g.hero).toBeNull();
      expect(g.answers[3]).toEqual([
        { x: 380, y: 253, width: 452, height: 504 },
        { x: 864, y: 253, width: 452, height: 504 },
        { x: 1348, y: 253, width: 452, height: 504 },
      ]);
    });
  });

  describe("visual_choices_three_pure", () => {
    it("defines null hero and 3 choice cards matching visual_choices_three outer bounds", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.visual_choices_three_pure;
      expect(g.hero).toBeNull();
      expect(g.answers[3]).toEqual([
        { x: 380, y: 253, width: 452, height: 504 },
        { x: 864, y: 253, width: 452, height: 504 },
        { x: 1348, y: 253, width: 452, height: 504 },
      ]);
    });
  });

  describe("split_versus_two", () => {
    it("defines null hero and 2 choice cards with versus emblem", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.split_versus_two;
      expect(g.hero).toBeNull();
      expect(g.answers[2]).toEqual([
        { x: 380, y: 253, width: 646, height: 504 },
        { x: 1154, y: 253, width: 646, height: 504 },
      ]);
    });
  });

  describe("verdict_true_false", () => {
    it("defines hero and 2 stacked verdict choice cards", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.verdict_true_false;
      expect(g.hero).toEqual({ x: 380, y: 253, width: 820, height: 510 });
      expect(g.answers[2]).toEqual([
        { x: 1240, y: 322, width: 560, height: 164 },
        { x: 1240, y: 530, width: 560, height: 164 },
      ]);
    });
  });

  describe("full_stack_list", () => {
    it("defines null hero and answer cards for 2 and 3 choices centered in arena", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.full_stack_list;
      expect(g.hero).toBeNull();
      expect(g.answers[2]).toEqual([
        { x: 450, y: 329, width: 1280, height: 164 },
        { x: 450, y: 533, width: 1280, height: 164 },
      ]);
      expect(g.answers[3]).toEqual([
        { x: 450, y: 275, width: 1280, height: 140 },
        { x: 450, y: 443, width: 1280, height: 140 },
        { x: 450, y: 611, width: 1280, height: 140 },
      ]);
    });
  });

  describe("mystery_reveal", () => {
    it("defines 920x360 hero viewport and answer strips for 0, 1, 2, and 3 counts", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.mystery_reveal;
      expect(g.hero).toEqual({ x: 630, y: 253, width: 920, height: 360 });
      expect(g.answers[0]).toEqual([]);
      expect(g.answers[1]).toEqual([{ x: 630, y: 637, width: 920, height: 120 }]);
      expect(g.answers[2]).toEqual([
        { x: 470, y: 637, width: 600, height: 120 },
        { x: 1110, y: 637, width: 600, height: 120 },
      ]);
      expect(g.answers[3]).toEqual([
        { x: 380, y: 637, width: 452, height: 120 },
        { x: 864, y: 637, width: 452, height: 120 },
        { x: 1348, y: 637, width: 452, height: 120 },
      ]);
    });
  });

  describe("clue_deduction", () => {
    it("defines evidence hero and candidates for 0, 1, 2, and 3 counts", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.clue_deduction;
      expect(g.hero).toEqual({ x: 400, y: 329, width: 824, height: 410 });
      expect(g.answers[0]).toEqual([]);
      expect(g.answers[1]).toEqual([{ x: 1256, y: 462, width: 524, height: 144 }]);
      expect(g.answers[2]).toEqual([
        { x: 1256, y: 376, width: 524, height: 144 },
        { x: 1256, y: 548, width: 524, height: 144 },
      ]);
      expect(g.answers[3]).toEqual([
        { x: 1256, y: 340, width: 524, height: 116 },
        { x: 1256, y: 476, width: 524, height: 116 },
        { x: 1256, y: 612, width: 524, height: 116 },
      ]);
    });
  });
});
