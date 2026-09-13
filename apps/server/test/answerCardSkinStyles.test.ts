import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES } from "@studio/shared";
import { glossyArcadeVariant } from "../src/quiz/visual/elements/answerCard/variants/glossyArcade.js";
import { glassNeonVariant } from "../src/quiz/visual/elements/answerCard/variants/glassNeon.js";
import { minimalSoftVariant } from "../src/quiz/visual/elements/answerCard/variants/minimalSoft.js";
import { comicChunkyVariant } from "../src/quiz/visual/elements/answerCard/variants/comicChunky.js";
import { resolveAnswerCardSkin, answerCardRegistry } from "../src/quiz/visual/elements/answerCard/registry.js";
import { renderChoiceGroup } from "../src/quiz/render/choices/renderChoiceGroup.js";
import type { ChoiceGroupRenderInput } from "../src/quiz/render/choices/choiceGroup.types.js";
import type { QuizSceneChoice } from "../src/quiz/render/scene/quizScene.types.js";

function choice(id: string, order: number, text: string): QuizSceneChoice {
  return { id, order, text, media: { source: null, altText: text, fallback: { subject: text, seed: order + 1 } } };
}

function createInput(skinId: Exclude<typeof ALL_ANSWER_CARD_STYLES[number], "auto">, overrides: Partial<ChoiceGroupRenderInput> = {}): ChoiceGroupRenderInput {
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
  });

  describe("Universal Quality & Accessibility Across All 4 Skins", () => {
    const skins = [glossyArcadeVariant, glassNeonVariant, minimalSoftVariant, comicChunkyVariant];

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
