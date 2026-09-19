import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES, SandboxPreviewInputSchema } from "@studio/shared";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Verdict True/False Answer Card Skin Styles", () => {
  it("exports CSS containing style definitions for all 7 answer card skins", () => {
    const css = verdictTrueFalseLayout.css();
    expect(css).toContain("skin-glossy_arcade");
    expect(css).toContain("skin-comic_chunky");
    expect(css).toContain("skin-glass_neon");
    expect(css).toContain("skin-minimal_soft");
    expect(css).toContain("skin-steel_beam_plate");
    expect(css).toContain("skin-pastel_marshmallow");
    expect(css).toContain("skin-rustic_wood_plank");
  });

  it("does not contain letter badge nodes or pseudo content", () => {
    const css = verdictTrueFalseLayout.css();
    expect(css).not.toContain("choice-label");
    expect(css).not.toContain('content: " ✓"');
    expect(css).not.toContain('content: " ✕"');
  });

  it.each(ALL_ANSWER_CARD_STYLES.filter((s) => s !== "auto"))("renders distinct markup and skin surface for style %s", (skinId) => {
    const input = SandboxPreviewInputSchema.parse({
      layout_id: "verdict_true_false",
      aspect_ratio: "16:9",
      phase: "choices",
      choices: ["True", "False"],
      question_format: "true_false",
      correct_choice_index: 0,
      question_text: "The Great Wall of China is visible from the Moon?",
      answer_card_style: skinId,
      mascot_enabled: false,
    });

    const composition = buildSandboxComposition(input);
    expect(composition.html).toContain(`skin-${skinId}`);
    expect(composition.html).not.toContain('<b class="choice-label');
    expect(composition.html).toContain("choice-text-only");
    expect(composition.html).toContain("True");
    expect(composition.html).toContain("False");

    // Verify skin-specific surface decorations
    if (skinId === "comic_chunky") {
      expect(composition.html).toContain("comic-halftone-overlay");
    } else if (skinId === "steel_beam_plate") {
      expect(composition.html).toContain("steel-hazard-trim");
      expect(composition.html).toContain("steel-rivet");
    } else if (skinId === "glass_neon") {
      expect(composition.html).toContain("glass-neon-edge");
    } else if (skinId === "pastel_marshmallow") {
      expect(composition.html).toContain("marshmallow-inner-glow");
    } else if (skinId === "rustic_wood_plank") {
      expect(composition.html).toContain("wood-bracket");
      expect(composition.html).toContain("wood-nail");
    }
  });

  it("provides high-contrast, clean white pill styling for minimal_soft skin", () => {
    const css = verdictTrueFalseLayout.css();
    // Pristine white background and semantic borders
    expect(css).toContain(".layout-verdict_true_false .skin-minimal_soft:nth-child(1) .choice-card-surface");
    expect(css).toContain("border: 5px solid #10B981;");
    expect(css).toContain("border: 5px solid #F43F5E;");
    expect(css).toContain("color: #065F46 !important;");
    expect(css).toContain("color: #9F1239 !important;");

    // Glossy arcade scoped rules must not clobber other skins
    expect(css).not.toContain(".layout-verdict_true_false .choice-card:nth-child(1) .choice-text,");
    expect(css).toContain('.layout-verdict_true_false .choice-card:not([class*="skin-"]):nth-child(1) .choice-text,');

    // Reveal states for minimal_soft
    expect(css).toContain(".layout-verdict_true_false .choice-card.skin-minimal_soft.answer-reveal-correct .choice-card-surface");
    expect(css).toContain(".layout-verdict_true_false .choice-card.skin-minimal_soft.answer-reveal-incorrect .choice-text");
  });

  it("provides high-legibility headline typography and uppercase text for comic_chunky skin", () => {
    const css = verdictTrueFalseLayout.css();
    expect(css).toContain(".layout-verdict_true_false .skin-comic_chunky .choice-text");
    expect(css).toContain('font-family: var(--font-display, "SVN-Hello Headline", "Fredoka", "Baloo 2", sans-serif);');
    expect(css).toContain("text-transform: uppercase;");
    expect(css).not.toContain("Comic Sans MS");
    expect(css).not.toContain("Bangers");
  });
});
