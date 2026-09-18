import { describe, expect, it } from "vitest";
import { LAYOUT_CONTENT_GEOMETRY } from "../src/quiz/render/layouts/layoutContentGeometry.js";
import { QUIZ_LANDSCAPE_LAYOUT_IDS } from "@studio/shared";

describe("quizLayoutContentGeometry", () => {
  it("defines content geometry for all seven active landscape layouts", () => {
    for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
      expect(LAYOUT_CONTENT_GEOMETRY[layoutId]).toBeDefined();
    }
  });

  describe("media_left_choices_right", () => {
    it("defines hero and answers for 2 and 3 choices", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.media_left_choices_right;
      expect(g.hero).toEqual({ x: 380, y: 253, width: 720, height: 570 });
      expect(g.answers[2]).toEqual([
        { x: 1140, y: 366, width: 660, height: 152 },
        { x: 1140, y: 558, width: 660, height: 152 },
      ]);
      expect(g.answers[3]).toEqual([
        { x: 1140, y: 304, width: 660, height: 132 },
        { x: 1140, y: 472, width: 660, height: 132 },
        { x: 1140, y: 640, width: 660, height: 132 },
      ]);
    });
  });

  describe("visual_choices_three", () => {
    it("defines null hero and 3 choice cards", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.visual_choices_three;
      expect(g.hero).toBeNull();
      expect(g.answers[3]).toEqual([
        { x: 380, y: 735, width: 452, height: 104 },
        { x: 864, y: 735, width: 452, height: 104 },
        { x: 1348, y: 735, width: 452, height: 104 },
      ]);
    });
  });

  describe("visual_choices_three_pure", () => {
    it("defines null hero and 3 choice cards matching pure visual media bounds", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.visual_choices_three_pure;
      expect(g.hero).toBeNull();
      expect(g.answers[3]).toEqual([
        { x: 380, y: 253, width: 452, height: 564 },
        { x: 864, y: 253, width: 452, height: 564 },
        { x: 1348, y: 253, width: 452, height: 564 },
      ]);
    });
  });

  describe("split_versus_two", () => {
    it("defines null hero and 2 choice cards with versus emblem", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.split_versus_two;
      expect(g.hero).toBeNull();
      expect(g.answers[2]).toEqual([
        { x: 380, y: 709, width: 698, height: 122 },
        { x: 1102, y: 709, width: 698, height: 122 },
      ]);
    });
  });

  describe("verdict_true_false", () => {
    it("defines hero and 2 stacked verdict choice cards", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.verdict_true_false;
      expect(g.hero).toEqual({ x: 380, y: 253, width: 820, height: 565 });
      expect(g.answers[2]).toEqual([
        { x: 1240, y: 349.5, width: 560, height: 164 },
        { x: 1240, y: 557.5, width: 560, height: 164 },
      ]);
    });
  });

  describe("full_stack_list", () => {
    it("defines null hero and answer cards for 2 and 3 choices centered in arena", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.full_stack_list;
      expect(g.hero).toBeNull();
      expect(g.answers[2]).toEqual([
        { x: 450, y: 329, width: 1280, height: 164 },
        { x: 450, y: 548, width: 1280, height: 164 },
      ]);
      expect(g.answers[3]).toEqual([
        { x: 450, y: 275, width: 1280, height: 140 },
        { x: 450, y: 458, width: 1280, height: 140 },
        { x: 450, y: 641, width: 1280, height: 140 },
      ]);
    });
  });

  describe("mystery_reveal", () => {
    it("defines 920x540 hero viewport and answer strips", () => {
      const g = LAYOUT_CONTENT_GEOMETRY.mystery_reveal;
      expect(g.hero).toEqual({ x: 630, y: 253, width: 920, height: 540 });
      expect(g.answers[1]).toEqual([{ x: 630, y: 890, width: 920, height: 120 }]);
    });
  });
});
