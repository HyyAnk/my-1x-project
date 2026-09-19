import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES } from "@studio/shared";
import { glossyArcadeVariant } from "../src/quiz/visual/elements/answerCard/variants/glossyArcade.js";
import { glassNeonVariant } from "../src/quiz/visual/elements/answerCard/variants/glassNeon.js";
import { minimalSoftVariant } from "../src/quiz/visual/elements/answerCard/variants/minimalSoft.js";
import { comicChunkyVariant } from "../src/quiz/visual/elements/answerCard/variants/comicChunky.js";
import { steelBeamPlateVariant } from "../src/quiz/visual/elements/answerCard/variants/steelBeamPlate.js";
import { pastelMarshmallowVariant } from "../src/quiz/visual/elements/answerCard/variants/pastelMarshmallow.js";
import { rusticWoodPlankVariant } from "../src/quiz/visual/elements/answerCard/variants/rusticWoodPlank.js";
import { resolveAnswerCardSkin, answerCardRegistry } from "../src/quiz/visual/elements/answerCard/registry.js";
import { renderChoiceGroup } from "../src/quiz/render/choices/renderChoiceGroup.js";
import type { ChoiceGroupRenderInput } from "../src/quiz/render/choices/choiceGroup.types.js";
import type { QuizSceneChoice } from "../src/quiz/render/scene/quizScene.types.js";

function choice(id: string, order: number, text: string): QuizSceneChoice {
  return { id, order, text, media: { source: null, altText: text, fallback: { subject: text, seed: order + 1 } } };
}

function createInput(
  skinId: Exclude<(typeof ALL_ANSWER_CARD_STYLES)[number], "auto">,
  overrides: Partial<ChoiceGroupRenderInput> = {},
): ChoiceGroupRenderInput {
  const skin = answerCardRegistry.get(skinId);
  if (!skin) throw new Error(`Missing skin: ${skinId}`);
  return {
    questionId: "q-test",
    items: [choice("c-1", 0, "Choice A"), choice("c-2", 1, "Choice B"), choice("c-3", 2, "Choice C")],
    correctChoiceId: "c-1",
    phase: "reveal",
    visible: true,
    presentation: "text",
    skin,
    layoutId: "media_left_choices_right",
    hasMascot: false,
    ...overrides,
  };
}

describe("Answer Card Skin Enhancements & Celebration Glow (Phase 2)", () => {
  describe("Glossy Arcade 3D Skin (glossyArcade.ts)", () => {
    const css = glossyArcadeVariant.renderCss();

    it("provides resilient fallbacks for choice-pattern and choice-bg-tint to preserve white glossy surface", () => {
      expect(css).toContain("var(--choice-pattern,");
      expect(css).toContain("var(--choice-bg-tint,");
      expect(css).toContain("rgba(255, 255, 255, 0.9)");
      expect(css).toContain("#FFFFFF");
    });

    it("defines vibrant 3D win styles with green depth shadow and halo", () => {
      expect(css).toContain(".ac-glossy-arcade.answer-correct");
      expect(css).toContain(".ac-glossy-arcade.answer-reveal-correct");
      expect(css).toContain("#15803D");
      expect(css).toContain("rgba(74, 222, 128, 0.85)");
      expect(css).toContain("#22C55E");
    });

    it("defines badge victory bounce and text shadow enhancement", () => {
      expect(css).toContain(".ac-glossy-arcade.answer-correct > b");
      expect(css).toContain(".ac-glossy-arcade.answer-reveal-correct > b");
      expect(css).toContain("@keyframes ac-glossy-arcade-badge-bounce");
      expect(css).toContain("@keyframes ac-glossy-arcade-win");
      expect(css).toContain("#064E3B");
    });

    it("settles incorrect choices to opacity 0.35 and grayscale 78%", () => {
      expect(css).toContain(".ac-glossy-arcade.answer-incorrect");
      expect(css).toContain(".ac-glossy-arcade.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("grayscale(78%)");
      expect(css).toContain("@keyframes ac-glossy-arcade-settle");
    });

    it("supports visual choice option image and labels", () => {
      expect(css).toContain(".skin-glossy_arcade.choice-card-visual.answer-correct .option-image");
      expect(css).toContain(".skin-glossy_arcade.choice-card-visual.answer-reveal-correct .option-image");
      expect(css).toContain(".visual-answer-card.answer-correct .ac-glossy-arcade");
    });
  });

  describe("Glassmorphism Neon Skin (glassNeon.ts)", () => {
    const css = glassNeonVariant.renderCss();

    it("defines cyber neon victory styling with edge glow and border pulse", () => {
      expect(css).toContain(".ac-glass-neon.answer-correct");
      expect(css).toContain(".ac-glass-neon.answer-reveal-correct");
      expect(css).toContain("0 0 32px rgba(34, 197, 94, 0.8)");
      expect(css).toContain("inset 0 0 16px rgba(34, 197, 94, 0.35)");
      expect(css).toContain("#22C55E");
      expect(css).toContain("@keyframes ac-glass-neon-pulse");
    });

    it("defines badge glow bloom and cyber text styling", () => {
      expect(css).toContain(".ac-glass-neon.answer-correct > b");
      expect(css).toContain("0 0 28px rgba(34, 197, 94, 0.9)");
      expect(css).toContain("@keyframes ac-glass-neon-badge-pop");
      expect(css).toContain("#064E3B");
    });

    it("settles incorrect choices to opacity 0.35 and grayscale 78%", () => {
      expect(css).toContain(".ac-glass-neon.answer-incorrect");
      expect(css).toContain(".ac-glass-neon.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("grayscale(78%)");
      expect(css).toContain("@keyframes ac-glass-neon-settle");
    });

    it("supports visual choice option image and neon edge styling", () => {
      expect(css).toContain(".skin-glass_neon.choice-card-visual.answer-correct .option-image");
      expect(css).toContain(".glass-neon-edge");
      expect(css).toContain("@keyframes ac-glass-neon-edge-glow");
    });
  });

  describe("Minimal Soft Card Skin (minimalSoft.ts)", () => {
    const css = minimalSoftVariant.renderCss();

    it("defines ultra-clean modern victory highlight with crisp green border and drop shadow", () => {
      expect(css).toContain(".ac-minimal-soft.answer-correct");
      expect(css).toContain(".ac-minimal-soft.answer-reveal-correct");
      expect(css).toContain("border-color: #22C55E");
      expect(css).toContain("rgba(34, 197, 94, 0.28)");
      expect(css).toContain("@keyframes ac-minimal-soft-win");
    });

    it("defines badge victory pop and high contrast text", () => {
      expect(css).toContain(".ac-minimal-soft.answer-correct > b");
      expect(css).toContain("@keyframes ac-minimal-soft-badge-pop");
      expect(css).toContain("#14532D");
    });

    it("settles incorrect choices to opacity 0.35 and grayscale 78%", () => {
      expect(css).toContain(".ac-minimal-soft.answer-incorrect");
      expect(css).toContain(".ac-minimal-soft.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("grayscale(78%)");
      expect(css).toContain("@keyframes ac-minimal-soft-settle");
    });

    it("supports visual choice option image and labels", () => {
      expect(css).toContain(".skin-minimal_soft.choice-card-visual.answer-correct .option-image");
      expect(css).toContain(".visual-answer-card.answer-correct .ac-minimal-soft");
    });
  });

  describe("Comic Pop Art Skin (comicChunky.ts)", () => {
    const css = comicChunkyVariant.renderCss();

    it("defines celebration glow with luminous green halo and comic pop win", () => {
      expect(css).toContain(".ac-comic-chunky.answer-correct");
      expect(css).toContain(".ac-comic-chunky.answer-reveal-correct");
      expect(css).toContain("#0F5132");
      expect(css).toContain("rgba(34, 197, 94, 0.75)");
      expect(css).toContain("@keyframes comic-pop-win");
    });

    it("defines comic badge bounce and high contrast text", () => {
      expect(css).toContain(".ac-comic-chunky.answer-correct > b");
      expect(css).toContain("@keyframes comic-badge-bounce");
      expect(css).toContain("#111827");
    });

    it("settles incorrect choices to opacity 0.35 and grayscale 78% in alignment with system", () => {
      expect(css).toContain(".ac-comic-chunky.answer-incorrect");
      expect(css).toContain(".ac-comic-chunky.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("grayscale(78%)");
      expect(css).toContain("@keyframes comic-dud-settle");
    });

    it("supports visual choice option image with comic chunky border", () => {
      expect(css).toContain(".skin-comic_chunky.choice-card-visual.answer-correct .option-image");
      expect(css).toContain(".visual-answer-card.answer-correct .ac-comic-chunky");
    });

    it("preserves centered straddling badge with translateX(-50%) on pure visual cards without transform: none override", () => {
      // Ensure generic and nth-child choice-label rules do not wipe out layout transforms
      expect(css).not.toMatch(/\.choice-card\.skin-comic_chunky:nth-child\(\d+\)\s+\.choice-label\s*\{[^}]*transform:\s*none/i);
      expect(css).not.toMatch(/\.skin-comic_chunky\s+\.choice-label\s*\{[^}]*transform:\s*none/i);

      // Dedicated pure visual straddling badge centering
      expect(css).toContain(".choice-card-visual.choice-pure-visual.skin-comic_chunky .choice-badge-pure");
      expect(css).toContain("transform: translateX(-50%)");

      // Keyframes preserve translateX(-50%) across animation phases
      expect(css).toContain("@keyframes comic-pure-badge-bounce");
      const pureBounceIdx = css.indexOf("@keyframes comic-pure-badge-bounce");
      expect(pureBounceIdx).toBeGreaterThan(-1);
      const pureBounceSnippet = css.slice(pureBounceIdx, pureBounceIdx + 350);
      expect(pureBounceSnippet).toContain("transform: translateX(-50%) scale(1)");
      expect(pureBounceSnippet).toContain("transform: translateX(-50%) scale(1.22)");
      expect(pureBounceSnippet).toContain("transform: translateX(-50%) scale(1.1)");
    });

    it("renders comic_chunky in visual_choices_three_pure with choice-badge-pure markup", () => {
      const input = createInput("comic_chunky", {
        layoutId: "visual_choices_three_pure",
        presentation: "visual",
      });
      const html = renderChoiceGroup(input);
      expect(html).toContain("skin-comic_chunky");
      expect(html).toContain("choice-badge-pure");
      expect(html).toContain("choice-pure-visual");
    });
  });

  describe("Steel Beam Plate Skin (steelBeamPlate.ts)", () => {
    const css = steelBeamPlateVariant.renderCss();

    it("defines industrial heavy container and metallic rivets styling", () => {
      expect(css).toContain(".ac-steel-beam-plate");
      expect(css).toContain(".steel-hazard-trim");
      expect(css).toContain(".steel-tread-texture");
      expect(css).toContain(".steel-rivet");
      expect(css).toContain("var(--bg-primary");
      expect(css).toContain("var(--bg-secondary");
      expect(css).toContain("var(--bg-accent");
    });

    it("defines celebration emerald win with hydraulic slam and halo", () => {
      expect(css).toContain(".ac-steel-beam-plate.answer-correct");
      expect(css).toContain(".ac-steel-beam-plate.is-correct");
      expect(css).toContain(".ac-steel-beam-plate.answer-reveal-correct");
      expect(css).toContain("#22C55E");
      expect(css).toContain("#14532D");
      expect(css).toContain("@keyframes ac-steel-beam-plate-win");
    });

    it("defines embossed badge slam and high-contrast text", () => {
      expect(css).toContain(".ac-steel-beam-plate.answer-correct > b");
      expect(css).toContain(".ac-steel-beam-plate.is-correct > b");
      expect(css).toContain(".ac-steel-beam-plate.answer-reveal-correct > b");
      expect(css).toContain("@keyframes ac-steel-beam-plate-badge-slam");
      expect(css).toContain("#DCFCE7");
    });

    it("settles incorrect choices to opacity 0.35 and grayscale 78%", () => {
      expect(css).toContain(".ac-steel-beam-plate.answer-incorrect");
      expect(css).toContain(".ac-steel-beam-plate.is-wrong");
      expect(css).toContain(".ac-steel-beam-plate.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("grayscale(78%)");
      expect(css).toContain("@keyframes ac-steel-beam-plate-settle");
    });

    it("supports visual choice option image and labels", () => {
      expect(css).toContain(".skin-steel_beam_plate.choice-card-visual.answer-correct .option-image");
      expect(css).toContain(".skin-steel_beam_plate.choice-card-visual.is-correct .option-image");
      expect(css).toContain(".visual-answer-card.answer-correct .ac-steel-beam-plate");
    });

    it("renders markup decorations including hazard trims, tread texture and rivets", () => {
      const decorations = steelBeamPlateVariant.renderDecorations?.({
        order: 0,
        presentation: "text",
        state: "pending",
      });
      expect(decorations?.beforeLabelHtml).toContain("steel-hazard-trim");
      expect(decorations?.beforeLabelHtml).toContain("steel-tread-texture");
      expect(decorations?.beforeLabelHtml).toContain("steel-rivet");
      expect(decorations?.labelSuffixHtml).toContain("steel-badge-bracket");
    });
  });

  describe("Pastel Marshmallow Skin (pastelMarshmallow.ts)", () => {
    const css = pastelMarshmallowVariant.renderCss();

    it("defines soft rounded puffy pill card with candy pastel inner glow", () => {
      expect(css).toContain(".ac-pastel-marshmallow");
      expect(css).toContain(".marshmallow-inner-glow");
      expect(css).toContain(".marshmallow-sprinkle");
      expect(css).toContain("border-radius: 9999px");
      expect(css).toContain("var(--bg-primary");
      expect(css).toContain("var(--bg-secondary");
      expect(css).toContain("var(--bg-accent");
    });

    it("defines sweet mint jelly celebration glow and jelly bounce win", () => {
      expect(css).toContain(".ac-pastel-marshmallow.answer-correct");
      expect(css).toContain(".ac-pastel-marshmallow.is-correct");
      expect(css).toContain(".ac-pastel-marshmallow.answer-reveal-correct");
      expect(css).toContain("#4ADE80");
      expect(css).toContain("rgba(34, 197, 94, 0.4)");
      expect(css).toContain("@keyframes ac-pastel-marshmallow-win");
    });

    it("defines circular marshmallow letter badge jiggle and soft text win", () => {
      expect(css).toContain(".ac-pastel-marshmallow > b");
      expect(css).toContain(".ac-pastel-marshmallow.answer-correct > b");
      expect(css).toContain(".ac-pastel-marshmallow.is-correct > b");
      expect(css).toContain("@keyframes ac-pastel-marshmallow-badge-jiggle");
      expect(css).toContain("#064E3B");
    });

    it("settles incorrect choices to opacity 0.35 and grayscale 78%", () => {
      expect(css).toContain(".ac-pastel-marshmallow.answer-incorrect");
      expect(css).toContain(".ac-pastel-marshmallow.is-wrong");
      expect(css).toContain(".ac-pastel-marshmallow.answer-reveal-incorrect");
      expect(css).toContain("opacity: 0.35");
      expect(css).toContain("grayscale(78%)");
      expect(css).toContain("@keyframes ac-pastel-marshmallow-settle");
    });

    it("supports visual choice option image and labels", () => {
      expect(css).toContain(".skin-pastel_marshmallow.choice-card-visual.answer-correct .option-image");
      expect(css).toContain(".skin-pastel_marshmallow.choice-card-visual.is-correct .option-image");
      expect(css).toContain(".visual-answer-card.answer-correct .ac-pastel-marshmallow");
    });

    it("renders markup decorations including inner glow, sprinkles and badge swirl", () => {
      const decorations = pastelMarshmallowVariant.renderDecorations?.({
        order: 0,
        presentation: "text",
        state: "pending",
      });
      expect(decorations?.beforeLabelHtml).toContain("marshmallow-inner-glow");
      expect(decorations?.beforeLabelHtml).toContain("marshmallow-sprinkle");
      expect(decorations?.labelSuffixHtml).toContain("marshmallow-badge-swirl");
    });

    it("preserves centered straddling badge with translateX(-50%) on pure visual cards without position: relative override", () => {
      // Ensure choice-label rules do not override position to relative
      expect(css).not.toMatch(/\.choice-card\.skin-pastel_marshmallow\s+\.choice-label\s*\{[^}]*position:\s*relative/i);
      expect(css).not.toMatch(/\.skin-pastel_marshmallow\s+\.choice-label\s*\{[^}]*position:\s*relative/i);

      // Dedicated pure visual straddling badge centering
      expect(css).toContain(".choice-card-visual.choice-pure-visual.skin-pastel_marshmallow .choice-badge-pure");
      expect(css).toContain("transform: translateX(-50%)");

      // Keyframes preserve translateX(-50%) across animation phases
      expect(css).toContain("@keyframes ac-pastel-marshmallow-pure-badge-jiggle");
      const pureBounceIdx = css.indexOf("@keyframes ac-pastel-marshmallow-pure-badge-jiggle");
      expect(pureBounceIdx).toBeGreaterThan(-1);
      const pureBounceSnippet = css.slice(pureBounceIdx, pureBounceIdx + 500);
      expect(pureBounceSnippet).toContain("transform: translateX(-50%) scale(1)");
      expect(pureBounceSnippet).toContain("transform: translateX(-50%) scale(1.24)");
      expect(pureBounceSnippet).toContain("transform: translateX(-50%) scale(1.1)");
    });

    it("renders pastel_marshmallow in visual_choices_three_pure with choice-badge-pure markup", () => {
      const input = createInput("pastel_marshmallow", {
        layoutId: "visual_choices_three_pure",
        presentation: "visual",
      });
      const html = renderChoiceGroup(input);
      expect(html).toContain("skin-pastel_marshmallow");
      expect(html).toContain("choice-badge-pure");
      expect(html).toContain("choice-pure-visual");
    });

    it("does not leak reveal colors or box-shadow at 0% keyframe for pure visual badge in pastelMarshmallow", () => {
      const pureSlamIdx = css.indexOf("@keyframes ac-pastel-marshmallow-pure-badge-jiggle");
      expect(pureSlamIdx).toBeGreaterThan(-1);
      const pureSlamSnippet = css.slice(pureSlamIdx, pureSlamIdx + 300);
      const zeroPercent = pureSlamSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroPercent).toBeTruthy();
      expect(zeroPercent![1]).toContain("translateX(-50%)");
      expect(zeroPercent![1]).not.toContain("border-color");
      expect(zeroPercent![1]).not.toContain("box-shadow");
      expect(zeroPercent![1]).not.toContain("background");
    });
  });

  describe("Universal Quality & Accessibility Across All 7 Skins", () => {
    const skins = [
      glossyArcadeVariant,
      glassNeonVariant,
      minimalSoftVariant,
      comicChunkyVariant,
      steelBeamPlateVariant,
      pastelMarshmallowVariant,
      rusticWoodPlankVariant,
    ];

    it("maintains strict zero !important across all skin style rules", () => {
      for (const skin of skins) {
        expect(skin.renderCss()).not.toContain("!important");
      }
    });

    it("preserves layout separation with zero grid placement rules in skins", () => {
      for (const skin of skins) {
        const css = skin.renderCss();
        expect(css).not.toContain("grid-template-columns");
        expect(css).not.toContain("grid-template-areas");
        expect(css).not.toContain("grid-area:");
      }
    });

    it("ensures skins do not leak static winning styles on .answer-reveal-correct", () => {
      for (const skin of skins) {
        const css = skin.renderCss();
        // Static background colors or borders should not be applied to .answer-reveal-correct outside keyframes
        // Ensure .answer-reveal-correct is not directly grouped with snapshot victory classes that set static color/background
        const lines = css.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(".answer-reveal-correct") && line.includes("{") && !line.includes("@keyframes")) {
            // Must only contain animation or will-change, not static colors
            expect(line).not.toMatch(/background\s*:/);
            expect(line).not.toMatch(/color\s*:\s*#/);
          }
        }
      }
    });

    it("resolves all skins from the registry cleanly", () => {
      for (const style of ALL_ANSWER_CARD_STYLES) {
        const skin = resolveAnswerCardSkin(style);
        expect(skin).toBeDefined();
        expect(skin.className).toBeTruthy();
        expect(skin.renderCss()).toContain(skin.className);
      }
    });

    it("renders both text and visual presentations cleanly with correct and scheduled classes", () => {
      for (const skin of skins) {
        const textStatic = renderChoiceGroup(createInput(skin.id, { presentation: "text", phase: "reveal" }));
        expect(textStatic).toContain(skin.className);
        expect(textStatic).toContain("answer-correct");
        expect(textStatic).toContain("answer-incorrect");

        const visualStatic = renderChoiceGroup(createInput(skin.id, { presentation: "visual", phase: "reveal" }));
        expect(visualStatic).toContain(skin.className);
        expect(visualStatic).toContain("visual-answer-card");
        expect(visualStatic).toContain("option-image");

        const textScheduled = renderChoiceGroup(createInput(skin.id, { presentation: "text", revealMode: "scheduled" }));
        expect(textScheduled).toContain("answer-reveal-correct");
        expect(textScheduled).toContain("answer-reveal-incorrect");

        const visualScheduled = renderChoiceGroup(createInput(skin.id, { presentation: "visual", revealMode: "scheduled" }));
        expect(visualScheduled).toContain("answer-reveal-correct");
        expect(visualScheduled).toContain("answer-reveal-incorrect");
      }
    });
  });
});
