import { describe, expect, it } from "vitest";
import { mediaLeftChoicesRightLayout } from "../src/quiz/render/layouts/mediaLeftChoicesRight.js";
import { fullStackListLayout } from "../src/quiz/render/layouts/fullStackList.js";
import { MEDIA_LEFT_CHOICES_RIGHT_GEOMETRY, FULL_STACK_LIST_GEOMETRY } from "@studio/shared";

describe("Phase 05: Media Left and Full Stack Text Layouts", () => {
  describe("Media Left Choices Right Layout Geometry & Styles", () => {
    it("exports layout with correct id and render function", () => {
      expect(mediaLeftChoicesRightLayout.id).toBe("media_left_choices_right");
      expect(typeof mediaLeftChoicesRightLayout.renderBody).toBe("function");
      expect(typeof mediaLeftChoicesRightLayout.css).toBe("function");
    });

    it("matches canonical shared geometry specification", () => {
      const geom = MEDIA_LEFT_CHOICES_RIGHT_GEOMETRY;
      expect(geom.arena.width).toBe(1420);
      expect(geom.arena.height).toBe(570);
      expect(geom.hero?.width).toBe(720);
      expect(geom.hero?.height).toBe(570);
      expect(geom.imageSlot?.viewport.width).toBe(696);
      expect(geom.imageSlot?.viewport.height).toBe(546);

      // 3-choice geometry
      const threeAnswers = geom.answerVariants[3];
      expect(threeAnswers).toBeDefined();
      expect(threeAnswers.outer[0].height).toBe(132);
      expect(threeAnswers.badge[0].height).toBe(132);
      expect(threeAnswers.badge[0].width).toBe(132);
      expect(threeAnswers.text[0].height).toBe(108);
      expect(threeAnswers.text[0].width).toBe(566);
      expect(threeAnswers.gap).toBe(36);
      expect(threeAnswers.overlap).toBe(38);
      expect(threeAnswers.outer.map((r) => r.y)).toEqual([304, 472, 640]);
      expect(threeAnswers.text.map((r) => r.y)).toEqual([316, 484, 652]);

      // 2-choice geometry
      const twoAnswers = geom.answerVariants[2];
      expect(twoAnswers).toBeDefined();
      expect(twoAnswers.outer[0].height).toBe(152);
      expect(twoAnswers.badge[0].height).toBe(152);
      expect(twoAnswers.text[0].height).toBe(124);
      expect(twoAnswers.text[0].width).toBe(552);
      expect(twoAnswers.gap).toBe(40);
      expect(twoAnswers.overlap).toBe(44);
      expect(twoAnswers.outer.map((r) => r.y)).toEqual([366, 558]);
      expect(twoAnswers.text.map((r) => r.y)).toEqual([380, 572]);
    });

    it("generates CSS with expanded 720x570 hero and centered answer stack", () => {
      const css = mediaLeftChoicesRightLayout.css();
      expect(css).toContain("var(--slot-hero-width, 720px)");
      expect(css).toContain("var(--slot-hero-height, 570px)");
      expect(css).toContain("left: 760px;");
      expect(css).toContain("width: 660px;");
      expect(css).toContain("height: 570px;");
      expect(css).toContain("gap: 36px;");
      expect(css).toContain("--choice-badge-size: 132px;");
      expect(css).toContain("--choice-surface-height: 108px;");
      expect(css).toContain("--choice-badge-overlap: 38px;");
      expect(css).toContain("--choice-surface-padding: 10px 24px 10px 56px;");
      expect(css).toContain("gap: 40px;");
      expect(css).toContain("--choice-badge-size: 152px;");
      expect(css).toContain("--choice-surface-height: 124px;");
      expect(css).toContain("--choice-badge-overlap: 44px;");
      expect(css).toContain("--choice-surface-padding: 10px 24px 10px 58px;");
    });

    it("includes required animation and reveal keyframes", () => {
      const css = mediaLeftChoicesRightLayout.css();
      expect(css).toContain("@keyframes choice-card-enter-right");
      expect(css).toContain("@keyframes incorrect-card-settle-media-left");
      expect(css).toContain("choice-card-enter-right");
    });
  });

  describe("Full Stack List Layout Geometry & Styles", () => {
    it("exports layout with correct id and render function", () => {
      expect(fullStackListLayout.id).toBe("full_stack_list");
      expect(typeof fullStackListLayout.renderBody).toBe("function");
      expect(typeof fullStackListLayout.css).toBe("function");
    });

    it("matches canonical shared geometry specification", () => {
      const geom = FULL_STACK_LIST_GEOMETRY;
      expect(geom.arena.width).toBe(1420);
      expect(geom.arena.height).toBe(528);
      expect(geom.hero).toBeNull();

      // 3-choice geometry: A fixed at 275, B at 458, C at 641
      const threeAnswers = geom.answerVariants[3];
      expect(threeAnswers).toBeDefined();
      expect(threeAnswers.outer[0].height).toBe(140);
      expect(threeAnswers.badge[0].height).toBe(140);
      expect(threeAnswers.badge[0].width).toBe(140);
      expect(threeAnswers.text[0].height).toBe(116);
      expect(threeAnswers.text[0].width).toBe(1180);
      expect(threeAnswers.gap).toBe(43);
      expect(threeAnswers.overlap).toBe(40);
      expect(threeAnswers.outer.map((r) => r.y)).toEqual([275, 458, 641]);
      expect(threeAnswers.text.map((r) => r.y)).toEqual([287, 470, 653]);

      // 2-choice geometry: A fixed at 329, B at 548
      const twoAnswers = geom.answerVariants[2];
      expect(twoAnswers).toBeDefined();
      expect(twoAnswers.outer[0].height).toBe(164);
      expect(twoAnswers.badge[0].height).toBe(164);
      expect(twoAnswers.text[0].height).toBe(136);
      expect(twoAnswers.text[0].width).toBe(1162);
      expect(twoAnswers.gap).toBe(55);
      expect(twoAnswers.overlap).toBe(46);
      expect(twoAnswers.outer.map((r) => r.y)).toEqual([329, 548]);
      expect(twoAnswers.text.map((r) => r.y)).toEqual([343, 562]);
    });

    it("locks A at top: 22px with 43px gap for 3 answers, removing vertical centering", () => {
      const css = fullStackListLayout.css();
      expect(css).toContain("left: 70px;");
      expect(css).toContain("width: 1280px;");
      expect(css).toContain("height: auto;");
      expect(css).toContain("top: 22px;");
      expect(css).toContain("gap: 43px;");
      expect(css).toContain("--choice-badge-size: 140px;");
      expect(css).toContain("--choice-surface-height: 116px;");
      expect(css).toContain("--choice-badge-overlap: 40px;");
      expect(css).toContain("--choice-surface-padding: 10px 28px 10px 58px;");
    });

    it("locks 2-answer variant at top: 76px with 55px gap", () => {
      const css = fullStackListLayout.css();
      expect(css).toContain("top: 76px;");
      expect(css).toContain("gap: 55px;");
      expect(css).toContain("--choice-badge-size: 164px;");
      expect(css).toContain("--choice-surface-height: 136px;");
      expect(css).toContain("--choice-badge-overlap: 46px;");
      expect(css).toContain("--choice-surface-padding: 10px 28px 10px 64px;");
    });

    it("includes required animation and waterfall stagger keyframes", () => {
      const css = fullStackListLayout.css();
      expect(css).toContain("@keyframes choice-card-pop-in");
      expect(css).toContain("@keyframes incorrect-card-settle-full-stack");
      expect(css).toContain("choice-card-pop-in");
    });
  });
});
