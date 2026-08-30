import { describe, expect, it } from "vitest";
import { glassMorphismVariant } from "../src/quiz/visual/elements/questionBox/variants/glassMorphism.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Frosted Glassmorphism Question Box Variant", () => {
  it("has the correct metadata", () => {
    expect(glassMorphismVariant.id).toBe("glass_morphism");
    expect(glassMorphismVariant.displayName).toBe("Frosted Glassmorphism");
    expect(glassMorphismVariant.description).toBeTruthy();
  });

  it("renders clean HTML without redundant 'QUESTION' badge pill", () => {
    const html = glassMorphismVariant.renderHtml({
      question: "Which planet is known as the Red Planet?",
      tier: "short",
    });

    expect(html).toContain("qb-glass-morphism");
    expect(html).toContain("glass-card-inner");
    expect(html).toContain("Which planet is known as the Red Planet?");
    // Ensure no redundant uppercase QUESTION pill
    expect(html).not.toContain("glass-top-pill");
    expect(html).not.toContain("QUESTION");
    // Ensure specular and corner accents exist
    expect(html).toContain("glass-ambient-glow");
    expect(html).toContain("glass-specular-edge");
    expect(html).toContain("glass-corner-accent");
  });

  it("renders highlighted html if provided", () => {
    const html = glassMorphismVariant.renderHtml({
      question: "Which planet is known as the Red Planet?",
      highlightedHtml: "Which planet is known as the <span class=\"keyword-highlight\">Red Planet</span>?",
      tier: "short",
    });

    expect(html).toContain('<span class="keyword-highlight">Red Planet</span>');
  });

  it("renders high-contrast CSS for readability and frosted glass styling", () => {
    const css = glassMorphismVariant.renderCss?.() ?? "";

    expect(css).toContain(".qb-glass-morphism .glass-card-inner");
    expect(css).toContain("backdrop-filter: blur(16px)");
    expect(css).toContain("#0F172A"); // High-contrast text color
    expect(css).toContain(".qb-glass-morphism h1");
    expect(css).toContain(".qb-glass-morphism .keyword-highlight");
  });

  it("integrates seamlessly into sandbox composition preview with high QA contrast", () => {
    const composition = buildSandboxComposition({
      theme: "candy_arcade",
      palette_id: "purple",
      question_box_style: "glass_morphism",
      thinking_bar_style: "energy_laser",
      counter_style: "neon_badge",
      phase: "thinking",
      question_text: "What is the fastest animal on land?",
      choices: ["Cheetah", "Lion", "Falcon"],
      correct_choice_index: 0,
      question_number: 1,
      total_questions: 5,
    });

    expect(composition.html).toContain("qb-glass-morphism");
    expect(composition.html).toContain("What is the fastest animal on land?");
    expect(composition.html).not.toContain("glass-top-pill");
    expect(composition.contrast_report.ok).toBe(true);
  });
});
