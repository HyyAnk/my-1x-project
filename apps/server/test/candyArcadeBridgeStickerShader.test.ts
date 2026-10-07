import { describe, expect, it } from "vitest";
import { renderBridgeStickerFilterSvg } from "../src/quiz/render/candyArcade/candyArcadeSvg.js";
import { candyArcadeBridgeTopicStylesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeBridgeTopicStyles.js";

describe("CandyArcade Bridge Sticker Shader & Photo Card Styles (Phase 5)", () => {
  describe("renderBridgeStickerFilterSvg", () => {
    it("renders valid SVG markup defining the die-cut sticker filter", () => {
      const svg = renderBridgeStickerFilterSvg();

      expect(svg).toContain('<filter id="bridge-sticker-filter"');
      expect(svg).toContain('<feMorphology in="SourceAlpha" result="DILATED" operator="dilate" radius="7"/>');
      expect(svg).toContain('<feFlood flood-color="#FFFFFF" flood-opacity="1" result="WHITE_FLOOD"/>');
      expect(svg).toContain('<feComposite in="WHITE_FLOOD" in2="DILATED" operator="in" result="STROKE"/>');
      expect(svg).toContain('<feDropShadow in="STROKE"');
      expect(svg).toContain('<feMergeNode in="SHADOW"/>');
      expect(svg).toContain('<feMergeNode in="STROKE"/>');
      expect(svg).toContain('<feMergeNode in="SourceGraphic"/>');
      expect(svg).toContain('pointer-events:none;');
    });
  });

  describe("candyArcadeBridgeTopicStylesCss", () => {
    it("contains showcase row and card/sticker presentation classes", () => {
      const css = candyArcadeBridgeTopicStylesCss();

      expect(css).toContain(".bridge-showcase-row");
      expect(css).toContain(".bridge-showcase-item");
      expect(css).toContain(".is-sticker");
      expect(css).toContain(".is-photo-card");
      expect(css).toContain("filter: url(#bridge-sticker-filter)");
      expect(css).toContain("border: 5px solid #FFFFFF");
    });

    it("contains staggered entrance keyframes and idle float animations", () => {
      const css = candyArcadeBridgeTopicStylesCss();

      expect(css).toContain("@keyframes bridge-item-pop");
      expect(css).toContain("@keyframes bridge-item-float");
      expect(css).toContain(".item-1");
      expect(css).toContain(".item-2");
      expect(css).toContain(".item-3");
      expect(css).toContain(".item-4");
      expect(css).toContain("calc(var(--clip-start, 0s) + 0.30s)");
      expect(css).toContain("calc(var(--clip-start, 0s) + 0.66s)");
    });
  });
});
