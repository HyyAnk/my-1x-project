import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES, type QuizPreviewLayoutId } from "@studio/shared";
import { renderChoiceGroup } from "../src/quiz/render/choices/renderChoiceGroup.js";
import { resolveChoiceDecorationVariant, type ChoiceDecorationVariant } from "../src/quiz/render/choices/choiceSurfaceMarkup.js";
import { detachedChoiceStyles } from "../src/quiz/render/choices/detachedChoiceStyles.js";
import { choiceIdentityStyles } from "../src/quiz/render/choices/choiceIdentityStyles.js";
import { answerCardRegistry } from "../src/quiz/visual/elements/answerCard/registry.js";
import type { ChoiceGroupRenderInput } from "../src/quiz/render/choices/choiceGroup.types.js";
import type { QuizSceneChoice } from "../src/quiz/render/scene/quizScene.types.js";

function choice(id: string, order: number, text: string): QuizSceneChoice {
  return { id, order, text, media: { source: null, altText: text, fallback: { subject: text, seed: order + 1 } } };
}

function createChoiceInput(overrides: Partial<ChoiceGroupRenderInput> = {}): ChoiceGroupRenderInput {
  const skin = answerCardRegistry.get("glossy_arcade")!;
  return {
    questionId: "q-primitives",
    items: [choice("c-1", 0, "Choice Alpha"), choice("c-2", 1, "Choice Beta"), choice("c-3", 2, "Choice Gamma")],
    correctChoiceId: "c-1",
    phase: "choices",
    visible: true,
    presentation: "text",
    skin,
    layoutId: "media_left_choices_right",
    hasMascot: false,
    ...overrides,
  };
}

describe("Phase 04: Choice Primitives and Answer Surfaces", () => {
  describe("Layout Decoration Policy Resolution", () => {
    const expectedVariants: Record<QuizPreviewLayoutId, ChoiceDecorationVariant> = {
      media_left_choices_right: "detached_badge",
      visual_choices_three: "detached_badge",
      full_stack_list: "detached_badge",
      visual_choices_three_pure: "media_bottom_badge",
      split_versus_two: "text_only",
      verdict_true_false: "text_only",
      mystery_reveal: "single_reveal",
    };

    for (const [layoutId, expected] of Object.entries(expectedVariants)) {
      it(`resolves ${layoutId} to ${expected}`, () => {
        expect(resolveChoiceDecorationVariant(layoutId as QuizPreviewLayoutId)).toBe(expected);
      });
    }
  });

  describe("Detached Badge Variant (Media Left, Visual Card, Full Stack)", () => {
    it("renders badge and painted text surface as siblings in text layout", () => {
      const html = renderChoiceGroup(createChoiceInput({ layoutId: "media_left_choices_right" }));
      expect(html).toContain('class="choice-label"');
      expect(html).toContain('class="choice-card-surface');
      expect(html).toContain('data-choice-variant="detached_badge"');

      // Verify sibling placement: .choice-label followed by .choice-card-surface
      expect(html).toMatch(/<b class="choice-label"[^>]*>A<\/b><div class="choice-card-surface/);
    });

    it("renders badge and painted text surface as siblings in visual card assembly", () => {
      const html = renderChoiceGroup(
        createChoiceInput({
          layoutId: "visual_choices_three",
          presentation: "visual",
        }),
      );
      expect(html).toContain("choice-media");
      expect(html).toContain("visual-answer-assembly");
      expect(html).toMatch(/<b class="choice-label"[^>]*>A<\/b><div class="choice-card-surface visual-answer-label/);
    });

    it("matches exact spec height ratios between badge and text surface", () => {
      const ratios = [
        { name: "Media Left / 3", badge: 132, text: 108, expectedRatio: 0.8182 },
        { name: "Media Left / 2", badge: 152, text: 124, expectedRatio: 0.8158 },
        { name: "Visual Card", badge: 104, text: 86, expectedRatio: 0.8269 },
        { name: "Full Stack / 3", badge: 140, text: 116, expectedRatio: 0.8286 },
        { name: "Full Stack / 2", badge: 164, text: 136, expectedRatio: 0.8293 },
      ];

      for (const item of ratios) {
        const ratio = Number((item.text / item.badge).toFixed(4));
        expect(ratio).toBeCloseTo(item.expectedRatio, 3);
      }
    });
  });

  describe("Text-Only Variant (Split Versus, Verdict)", () => {
    it("omits .choice-label and data-choice-label entirely for Split Versus", () => {
      const html = renderChoiceGroup(
        createChoiceInput({
          layoutId: "split_versus_two",
          items: [choice("c-1", 0, "Option One"), choice("c-2", 1, "Option Two")],
          correctChoiceId: "c-1",
        }),
      );
      expect(html).not.toContain("choice-label");
      expect(html).not.toContain("data-choice-label");
      expect(html).toContain("choice-text-only");
      expect(html).toContain('aria-label="Option One"');
      expect(html).toContain('aria-label="Option Two"');
      expect(html).not.toContain("A:");
      expect(html).not.toContain("B:");
    });

    it("omits .choice-label and data-choice-label entirely for Verdict True/False", () => {
      const html = renderChoiceGroup(
        createChoiceInput({
          layoutId: "verdict_true_false",
          items: [choice("c-1", 0, "True"), choice("c-2", 1, "False")],
          correctChoiceId: "c-1",
        }),
      );
      expect(html).not.toContain("choice-label");
      expect(html).not.toContain("data-choice-label");
      expect(html).toContain("choice-text-only");
      expect(html).toContain('aria-label="True"');
      expect(html).toContain('aria-label="False"');
      expect(html).not.toContain("A:");
      expect(html).not.toContain("B:");
    });
  });

  describe("Single Reveal Variant (Mystery Reveal)", () => {
    it("omits badge and labels for Mystery Reveal single answer", () => {
      const html = renderChoiceGroup(
        createChoiceInput({
          layoutId: "mystery_reveal",
          items: [choice("c-1", 0, "Mystery Answer")],
          correctChoiceId: "c-1",
        }),
      );
      expect(html).not.toContain("choice-label");
      expect(html).not.toContain("data-choice-label");
      expect(html).toContain("choice-single-reveal");
      expect(html).toContain('aria-label="Mystery Answer"');
      expect(html).not.toContain("A:");
    });
  });

  describe("Pure Visual Variant (media_bottom_badge)", () => {
    it("renders centered bottom badge and hides text visually via sr-only", () => {
      const html = renderChoiceGroup(
        createChoiceInput({
          layoutId: "visual_choices_three_pure",
          presentation: "visual",
        }),
      );
      expect(html).toContain("choice-badge-pure");
      expect(html).toContain('class="choice-text sr-only"');
      expect(html).toContain('class="choice-text sr-only" data-layout-ignore');
      expect(html).not.toContain("choice-card-surface");
    });
  });

  describe("Skin Integration with All Variants", () => {
    const activeSkins = ALL_ANSWER_CARD_STYLES.filter((s) => s !== "auto");

    for (const skinId of activeSkins) {
      it(`renders correctly with skin: ${skinId}`, () => {
        const skin = answerCardRegistry.get(skinId)!;
        const detached = renderChoiceGroup(createChoiceInput({ skin, layoutId: "media_left_choices_right" }));
        const textOnly = renderChoiceGroup(
          createChoiceInput({
            skin,
            layoutId: "split_versus_two",
            items: [choice("c-1", 0, "One"), choice("c-2", 1, "Two")],
          }),
        );

        expect(detached).toContain(skin.className);
        expect(detached).toContain("choice-label");
        expect(textOnly).toContain(skin.className);
        expect(textOnly).not.toContain("choice-label");
      });
    }
  });

  describe("CSS Rules and Detached Styles", () => {
    it("exports detached CSS with transparent assembly and badge overlap rules", () => {
      const css = detachedChoiceStyles();
      expect(css).toContain(".choice-card.choice-card-text.answer-card");
      expect(css).toContain("background: transparent;");
      expect(css).toContain("border: 0;");
      expect(css).toContain("box-shadow: none;");
      expect(css).toContain(".choice-card .choice-label + .choice-card-surface");
      expect(css).toContain("calc(-1 * var(--choice-badge-overlap, 24px))");
      expect(css).toMatch(/\.visual-answer-assembly \.choice-card-surface \{[^}]*margin: 0;/s);
      expect(css).toContain(".choice-text-only");
      expect(css).toContain(".choice-pure-visual .choice-badge-pure");
      expect(css).toContain(".choice-pure-visual .choice-text");
      expect(css).toContain("clip: rect(0, 0, 0, 0);");
      expect(css).not.toContain("clip-path");
      expect(css).not.toContain("!important");
    });

    it("scopes the A/B/C identity palette to visible-badge variants", () => {
      const css = choiceIdentityStyles();
      expect(css).toContain('.choice-card[data-choice-variant="detached_badge"]');
      expect(css).toContain('.choice-card[data-choice-variant="media_bottom_badge"]');
      expect(css).toContain(":where(");
      expect(css).toContain(":nth-child(1)");
      expect(css).toContain(":nth-child(3)");
      expect(css).not.toContain('[data-choice-variant="text_only"]');
      expect(css).not.toContain('[data-choice-variant="single_reveal"]');
      expect(css).not.toMatch(/\.choice-card:nth-child\(/);
    });
  });
});
