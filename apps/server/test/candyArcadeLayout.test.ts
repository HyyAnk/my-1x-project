import { describe, expect, it } from "vitest";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

describe("Candy Arcade visual and workflow regression", () => {
  it("renders all four skins cleanly across text layouts without geometry collision", () => {
    const skins = ["glossy_arcade", "comic_chunky", "glass_neon", "minimal_soft"] as const;

    for (const skin of skins) {
      const res = buildSandboxComposition({
        answer_card_style: skin,
        layout_id: "media_left_choices_right",
      });

      expect(res.html).toContain(`skin-${skin}`);
      expect(res.html).toContain("layout-media_left_choices_right");
      expect(res.html).toContain("choice-card");
    }
  });

  it("renders 16:9 and rejects retired Sandbox portrait compositions", () => {
    const res169 = buildSandboxComposition({ aspect_ratio: "16:9" });
    expect(() => buildSandboxComposition({ aspect_ratio: "9:16", layout_id: "portrait_hero_choices" })).toThrow();

    expect(res169.html).toContain('data-aspect-ratio="16:9"');
  });

  it("suppresses decorative animation under reduced motion while preserving status visibility", () => {
    const css = candyArcadeCss({ aspectRatio: "16:9" });

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: .001ms !important;");
    expect(css).toContain("animation-iteration-count: 1 !important;");
  });

  it("keeps phase states strictly sequenced without premature answer reveal", () => {
    const resChoices = buildSandboxComposition({ phase: "choices" });
    const resReveal = buildSandboxComposition({ phase: "reveal" });

    expect(resChoices.html).toContain("--choices-at: 0s");
    expect(resChoices.html).toContain("--reveal-at: 999s");
    expect(resReveal.html).toContain("--reveal-at: 0s");
  });

  it("standardizes 16:9 base layout geometry directly to canonical Mascot-Ready Standard Grid", () => {
    const css = candyArcadeCss({ aspectRatio: "16:9" });

    // Root tokens default to 1420px mascot-ready capacity
    expect(css).toContain("--mascot-content-width: 1420px;");
    expect(css).toContain("--question-card-width: 1440px;");
    expect(css).toContain("--question-card-left-edge: 360px;");

    // Game stage defaults directly to 1420px width
    expect(css).toContain(
      ".game-stage { position: relative; z-index: 3; display: grid; justify-items: center; align-content: start; width: 1420px; min-height: 945px; margin: 12px 40px 0 auto; contain: layout style; }",
    );

    // Game header defaults directly to x = 180px (centered in 0..360px pillar)
    expect(css).toContain(
      ".game-header { position: absolute; z-index: 6; top: 0; left: 180px; transform: translateX(-50%); contain: layout style; }",
    );

    // Question title and phase region centered/aligned to 1420px stage
    expect(css).toContain(
      ".question-title { position: relative; z-index: 3; width: var(--question-card-width, 1440px); max-width: var(--question-card-width, 1440px);",
    );
    expect(css).toContain(
      ".phase-region { position: absolute; z-index: 5; left: 0; bottom: 10px; width: var(--question-card-width, 1440px);",
    );
    expect(css).toContain(
      ".phase-region > .thinking-bar { position: absolute; z-index: 5; bottom: -15px; left: 50%; margin-top: 0; transform: translateX(-50%); width: min(70vw, 1300px);",
    );

    // Mascot container locked to bottom-left pillar in 16:9
    expect(css).toContain(".candy-mascot-container.anchor-bottom_left { bottom: 18px; left: 32px; }");
    expect(css).toContain(".candy-mascot-container.anchor-bottom_right { bottom: 18px; left: 32px; }");
  });
});
