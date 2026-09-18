import { describe, expect, it } from "vitest";
import { splitVersusTwoLayout } from "../src/quiz/render/layouts/splitVersusTwo.js";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
import { SPLIT_VERSUS_TWO_GEOMETRY, VERDICT_TRUE_FALSE_GEOMETRY } from "@studio/shared";
import { resolveChoiceDecorationVariant } from "../src/quiz/render/choices/choiceSurfaceMarkup.js";

describe("Phase 07: Binary Layouts (Split Versus and Verdict True/False)", () => {
  describe("Split Versus Two (split_versus_two)", () => {
    it("exports layout with correct id and render functions", () => {
      expect(splitVersusTwoLayout.id).toBe("split_versus_two");
      expect(typeof splitVersusTwoLayout.renderBody).toBe("function");
      expect(typeof splitVersusTwoLayout.css).toBe("function");
    });

    it("matches canonical shared geometry specification", () => {
      const geom = SPLIT_VERSUS_TWO_GEOMETRY;
      expect(geom.arena.width).toBe(1420);
      expect(geom.arena.height).toBe(578);
      expect(geom.cardSize?.width).toBe(698);
      expect(geom.cardSize?.height).toBe(578);

      // Expanded media dimensions
      expect(geom.imageSlot?.mediaBorderBox.width).toBe(698);
      expect(geom.imageSlot?.mediaBorderBox.height).toBe(446);
      expect(geom.imageSlot?.viewport.width).toBe(674);
      expect(geom.imageSlot?.viewport.height).toBe(422);
      expect(geom.imageSlot?.borderEachSide).toBe(12);

      // Answer surface remains 10px below the expanded media
      const answers = geom.answerVariants[2];
      expect(answers).toBeDefined();
      expect(answers.outer[0].y).toBe(709);
      expect(answers.outer[0].height).toBe(122);
      expect(answers.outer[0].width).toBe(698);
      expect(answers.outer[1].y).toBe(709);
      expect(answers.outer[1].height).toBe(122);
      expect(answers.outer[1].width).toBe(698);

      // Columns expand inward while preserving the outer arena edges
      expect(answers.outer[0].x).toBe(380);
      expect(answers.outer[1].x).toBe(1102);
      expect(answers.outer[1].x - (answers.outer[0].x + answers.outer[0].width)).toBe(24);

      // VS emblem is centered between cards and overlaps each inner edge by 50px
      const vs = geom.extra?.versusEmblem as { x: number; y: number; width: number; height: number };
      expect(vs).toBeDefined();
      expect(vs.width).toBe(124);
      expect(vs.height).toBe(124);
      expect(vs.x + vs.width / 2).toBe(1090);
      expect(vs.y + vs.height / 2).toBe(476);
      expect(geom.extra?.versusEdgeOverlap).toBe(50);

      // Corner radii, media gap, and fact clearance stay safe
      expect(geom.extra?.mediaRadius).toBe(32);
      expect(geom.extra?.textRadius).toBe(32);
      expect(geom.extra?.mediaAnswerGap).toBe(10);
      expect(geom.extra?.factGap).toBe(55);
    });

    it("generates CSS with expanded media, separated answer surface and VS emblem", () => {
      const css = splitVersusTwoLayout.css();
      expect(css).toContain("--slot-media-height, 446px");
      expect(css).toContain("--slot-card-height, 578px");
      expect(css).toContain("--choice-surface-height, 122px");
      expect(css).toContain("margin-top: 10px;");
      expect(css).toContain("border-radius: 32px;");
      expect(css).toContain("grid-template-columns: 698px 698px;");
      expect(css).toContain("gap: 24px;");
      expect(css).toContain("left: 648px;");
      expect(css).toContain("top: 161px;");
      expect(css).toContain("width: 124px;");
      expect(css).toContain("height: 124px;");
      expect(css).toContain("font-size: 54px;");
      expect(css).toContain('content: "VS";');
      expect(css).toContain("linear-gradient(135deg, #FF1361 0%, #FFA800 50%, #FFDD00 100%)");
      expect(css).toContain("border: 8px solid #FFFFFF;");
      expect(css).toContain("z-index: 10;");
    });

    it("uses text_only choice decoration variant (no letter badges)", () => {
      expect(resolveChoiceDecorationVariant("split_versus_two")).toBe("text_only");
    });

    it("defines Player 1 Crimson and Player 2 Azure combat tokens with white card surfaces", () => {
      const css = splitVersusTwoLayout.css();
      // Player 1 (Crimson)
      expect(css).toContain(".layout-split_versus_two .choice-card:nth-child(1)");
      expect(css).toContain("--choice-stroke: #FF3366;");
      expect(css).toContain("--choice-depth-shadow: #8B1238;");
      expect(css).toContain("--choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #FFF1F2 100%);");
      expect(css).toContain("--choice-text-color: #881337;");

      // Player 2 (Azure)
      expect(css).toContain(".layout-split_versus_two .choice-card:nth-child(2)");
      expect(css).toContain("--choice-stroke: #0284C7;");
      expect(css).toContain("--choice-depth-shadow: #0A3D80;");
      expect(css).toContain("--choice-bg-tint: linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%);");
      expect(css).toContain("--choice-text-color: #075985;");
    });
  });

  describe("Verdict True/False (verdict_true_false)", () => {
    it("exports layout with correct id and render functions", () => {
      expect(verdictTrueFalseLayout.id).toBe("verdict_true_false");
      expect(typeof verdictTrueFalseLayout.renderBody).toBe("function");
      expect(typeof verdictTrueFalseLayout.css).toBe("function");
    });

    it("matches canonical shared geometry specification", () => {
      const geom = VERDICT_TRUE_FALSE_GEOMETRY;
      expect(geom.arena.width).toBe(1420);
      expect(geom.arena.height).toBe(565);

      // Hero image: 820x565 at (380, 253), viewport 800x545
      expect(geom.hero?.width).toBe(820);
      expect(geom.hero?.height).toBe(565);
      expect(geom.hero?.x).toBe(380);
      expect(geom.hero?.y).toBe(253);
      expect(geom.imageSlot?.viewport.width).toBe(800);
      expect(geom.imageSlot?.viewport.height).toBe(545);

      // Answers: two 560x164 buttons at y=349.5 and 557.5 with 44px gap
      const answers = geom.answerVariants[2];
      expect(answers).toBeDefined();
      expect(answers.outer[0].y).toBe(349.5);
      expect(answers.outer[0].height).toBe(164);
      expect(answers.outer[0].width).toBe(560);
      expect(answers.outer[1].y).toBe(557.5);
      expect(answers.outer[1].height).toBe(164);
      expect(answers.outer[1].width).toBe(560);
      expect(answers.gap).toBe(44);

      // Shared vertical center at 535.5
      const heroCenterY = geom.hero!.y + geom.hero!.height / 2;
      const answerSpanHeight = answers.outer[1].y + answers.outer[1].height - answers.outer[0].y;
      const answerCenterY = answers.outer[0].y + answerSpanHeight / 2;
      expect(heroCenterY).toBe(535.5);
      expect(answerCenterY).toBe(535.5);
      expect(geom.extra?.heroAndAnswerCenterY).toBe(535.5);
    });

    it("generates CSS with hero 820x565 and vertically centered 560x164 choice buttons", () => {
      const css = verdictTrueFalseLayout.css();
      expect(css).toContain("--slot-hero-width, 820px");
      expect(css).toContain("--slot-hero-height, 565px");
      expect(css).toContain("width: 560px;");
      expect(css).toContain("height: 164px;");
      expect(css).toContain("gap: 44px;");
      expect(css).toContain("justify-content: center;");
    });

    it("removes check/cross pseudo elements and letter badges from CSS", () => {
      const css = verdictTrueFalseLayout.css();
      expect(css).not.toContain('content: " ✓"');
      expect(css).not.toContain('content: " ✕"');
      expect(css).not.toContain("choice-label");
    });

    it("uses text_only choice decoration variant (no letter badges)", () => {
      expect(resolveChoiceDecorationVariant("verdict_true_false")).toBe("text_only");
    });
  });
});
