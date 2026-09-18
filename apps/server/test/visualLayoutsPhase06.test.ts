import { describe, expect, it } from "vitest";
import { visualChoicesThreeLayout } from "../src/quiz/render/layouts/visualChoicesThree.js";
import { visualChoicesThreePureLayout } from "../src/quiz/render/layouts/visualChoicesThreePure.js";
import { VISUAL_CHOICES_THREE_GEOMETRY, VISUAL_CHOICES_THREE_PURE_GEOMETRY } from "@studio/shared";
import { LANDSCAPE_FRAME } from "../src/quiz/render/frame/landscapeFrameGeometry.js";

describe("Phase 06: Three-Choice Visual Layouts", () => {
  describe("3 Choice Visual Card (visual_choices_three)", () => {
    it("exports layout with correct id and render functions", () => {
      expect(visualChoicesThreeLayout.id).toBe("visual_choices_three");
      expect(typeof visualChoicesThreeLayout.renderBody).toBe("function");
      expect(typeof visualChoicesThreeLayout.css).toBe("function");
    });

    it("matches canonical shared geometry specification", () => {
      const geom = VISUAL_CHOICES_THREE_GEOMETRY;
      expect(geom.arena.width).toBe(1420);
      expect(geom.arena.height).toBe(586);
      expect(geom.cardSize?.width).toBe(452);
      expect(geom.cardSize?.height).toBe(586);

      // Media geometry
      expect(geom.imageSlot?.mediaBorderBox.height).toBe(461);
      expect(geom.imageSlot?.viewport.width).toBe(432);
      expect(geom.imageSlot?.viewport.height).toBe(441);
      expect(geom.extra?.mediaAnswerGap).toBe(21);

      // Answer assembly geometry
      const answers = geom.answerVariants[3];
      expect(answers).toBeDefined();
      expect(answers.outer[0].y).toBe(735);
      expect(answers.outer[0].height).toBe(104);
      expect(answers.badge[0].y).toBe(735);
      expect(answers.badge[0].height).toBe(104);
      expect(answers.badge[0].width).toBe(104);
      expect(answers.text[0].y).toBe(744);
      expect(answers.text[0].height).toBe(86);
      expect(answers.text[0].width).toBe(378);
      expect(answers.overlap).toBe(30);

      // Verify column positions
      expect(answers.outer.map((r) => r.x)).toEqual([380, 864, 1348]);
      expect(answers.badge.map((r) => r.x)).toEqual([380, 864, 1348]);
      expect(answers.text.map((r) => r.x)).toEqual([380 + 74, 864 + 74, 1348 + 74]);

      // Fact clearance
      const assemblyBottom = answers.outer[0].y + answers.outer[0].height;
      expect(assemblyBottom).toBe(839);
      expect(LANDSCAPE_FRAME.fact.y - assemblyBottom).toBe(47);
    });

    it("generates CSS with media height 461px and answer assembly top 735px", () => {
      const css = visualChoicesThreeLayout.css();
      expect(css).toContain("--slot-media-height, 461px");
      expect(css).toContain("--slot-card-height, 586px");
      expect(css).toContain("height: 586px;");
      expect(css).toContain("margin-top: 21px;");
      expect(css).toContain("--choice-badge-size: 104px;");
      expect(css).toContain("--choice-surface-height: 86px;");
      expect(css).toContain("--choice-badge-overlap: 30px;");
      expect(css).toContain("--choice-surface-padding: 6px 20px 6px 44px;");
    });
  });

  describe("3 Choice Pure Visual Cards (visual_choices_three_pure)", () => {
    it("exports layout with correct id and render functions", () => {
      expect(visualChoicesThreePureLayout.id).toBe("visual_choices_three_pure");
      expect(typeof visualChoicesThreePureLayout.renderBody).toBe("function");
      expect(typeof visualChoicesThreePureLayout.css).toBe("function");
    });

    it("matches canonical shared geometry specification", () => {
      const geom = VISUAL_CHOICES_THREE_PURE_GEOMETRY;
      expect(geom.arena.width).toBe(1420);
      expect(geom.arena.height).toBe(608);
      expect(geom.cardSize?.width).toBe(452);
      expect(geom.cardSize?.height).toBe(608);

      // Media geometry
      expect(geom.imageSlot?.mediaBorderBox.height).toBe(564);
      expect(geom.imageSlot?.viewport.width).toBe(432);
      expect(geom.imageSlot?.viewport.height).toBe(544);

      // Straddling badge geometry: centered on image bottom at y=817
      const answers = geom.answerVariants[3];
      expect(answers).toBeDefined();
      expect(answers.badge.map((r) => r.y)).toEqual([773, 773, 773]);
      expect(answers.badge.map((r) => r.x)).toEqual([562, 1046, 1530]);
      expect(answers.badge[0].height).toBe(88);
      expect(answers.badge[0].width).toBe(88);

      // Badge center is at y = 773 + 44 = 817
      expect(answers.badge[0].y + answers.badge[0].height / 2).toBe(817);

      // Fact dock clearance
      const badgeBottom = answers.badge[0].y + answers.badge[0].height;
      expect(badgeBottom).toBe(861);
      expect(LANDSCAPE_FRAME.fact.y - badgeBottom).toBe(25);
    });

    it("generates CSS with media height 564px and straddling badge at top: 520px", () => {
      const css = visualChoicesThreePureLayout.css();
      expect(css).toContain("--slot-media-height, 564px");
      expect(css).toContain("--slot-card-height, 608px");
      expect(css).toContain("height: 608px;");
      expect(css).toContain("top: 520px;");
      expect(css).toContain("--choice-badge-size: 88px;");
      expect(css).toContain("--choice-badge-font-size: 52px;");
    });

    it("preserves badge horizontal centering with translateX(-50%) across all reveal animation steps", () => {
      const css = visualChoicesThreePureLayout.css();
      expect(css).toContain("@keyframes visual-pure-correct-badge");
      expect(css).toContain("translateX(-50%) scale(1)");
      expect(css).toContain("translateX(-50%) scale(1.14)");
      expect(css).toContain("translateX(-50%) scale(1.06)");
      expect(css).toContain("visual-pure-correct-badge 0.62s");
    });

    it("prevents premature green border and glow leakage on answer-reveal-correct before scheduled reveal", () => {
      const css = visualChoicesThreePureLayout.css();
      // answer-reveal-correct on option-image must use animation without static green border override
      expect(css).not.toMatch(/\.answer-reveal-correct \.option-image\s*\{[^}]*border-color:\s*#22c55e/i);
      // answer-reveal-correct on choice-label must use animation without static green border override
      expect(css).not.toMatch(/\.answer-reveal-correct \.choice-label\s*\{[^}]*border-color:\s*#22c55e/i);
      expect(css).not.toMatch(/\.answer-reveal-correct \.choice-badge-pure\s*\{[^}]*border-color:\s*#22c55e/i);
    });

    it("supports 9:16 portrait mode with choice-badge-pure corner placement", () => {
      const cssPortrait = visualChoicesThreePureLayout.css("9:16");
      expect(cssPortrait).toContain(".layout-visual_choices_three_pure .choice-badge-pure");
      expect(cssPortrait).toContain("top: 12px;");
      expect(cssPortrait).toContain("left: 12px;");
      expect(cssPortrait).toContain("transform: none;");
    });
  });
});
