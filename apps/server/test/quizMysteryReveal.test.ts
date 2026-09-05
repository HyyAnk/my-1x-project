import { describe, expect, it } from "vitest";
import {
  getQuizGameplayArchetype,
  getQuizPreviewLayoutCapability,
  QUIZ_LAYOUT_CATALOG,
  resolveQuizLayout,
} from "@studio/shared";
import { candyArcadeHeroAreaRatio } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import {
  getQuizLayoutRenderer,
  quizLayoutCss,
  renderQuizLayoutBody,
} from "../src/quiz/render/layouts/registry.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Mystery Reveal layout & archetype", () => {
  it("defines mystery_reveal capability in layout catalog correctly", () => {
    const capability = QUIZ_LAYOUT_CATALOG.mystery_reveal;
    expect(capability).toBeDefined();
    expect(capability.id).toBe("mystery_reveal");
    expect(capability.supportedAspectRatios).toEqual(["16:9", "9:16"]);
    expect(capability.supportedChoiceCounts).toEqual([0, 1, 2, 3]);
    expect(capability.recommendedFormats).toContain("image_guess");
    expect(capability.media.required).toContain("question");
  });

  it("defines mystery_reveal archetype blueprint", () => {
    const blueprint = getQuizGameplayArchetype("mystery_reveal");
    expect(blueprint).toBeDefined();
    expect(blueprint?.targetLayout).toBe("mystery_reveal");
    expect(blueprint?.defaultFormat).toBe("image_guess");
    expect(blueprint?.creativeAngles.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves auto layout to mystery_reveal for visual_reveal archetype or image_guess format", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "visual_reveal",
      questionFormat: "image_guess",
      choiceCount: 1,
    });
    expect(result).toMatchObject({
      ok: true,
      layoutId: "mystery_reveal",
      source: "auto",
    });
  });

  it("renders layout body slots correctly with backdrop, dual layers, and scanner bar", () => {
    const slots = {
      questionBoxHtml: "<header class=\"question-title\">Who's that Pokemon?</header>",
      heroHtml: "<figure class=\"hero-image\"><img src=\"pokemon.png\" /></figure>",
      choicesHtml: "<div class=\"answer-grid answer-count-1\"><span>Pikachu</span></div>",
      phaseHtml: "<div class=\"thinking\">3</div>",
    };

    const rendered = renderQuizLayoutBody("mystery_reveal", slots);
    expect(rendered).toContain("question-title");
    expect(rendered).toContain("mystery-stage-backdrop");
    expect(rendered).toContain("mystery-mosaic-layer");
    expect(rendered).toContain("mystery-revealed-layer");
    expect(rendered).toContain("mystery-scanner-bar");
    expect(rendered).toContain("answer-grid");
    expect(rendered).toContain("phase-region");
  });

  it("generates responsive CSS containing 16:9 studio layout and 9:16 vertical stack", () => {
    const renderer = getQuizLayoutRenderer("mystery_reveal");
    expect(renderer).toBeDefined();

    const css16x9 = renderer.css("16:9");
    expect(css16x9).toContain(".layout-mystery_reveal .game-stage");
    expect(css16x9).toContain(".mystery-stage-wrapper");
    expect(css16x9).toContain(".mystery-stage-backdrop");
    expect(css16x9).toContain("mystery-scanner-sweep");
    expect(css16x9).toContain("mystery-reveal-wipe");
    expect(css16x9).toContain("mystery-answer-dock");
    expect(css16x9).toContain("bottom: 28px;");

    const css9x16 = renderer.css("9:16");
    expect(css9x16).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-mystery_reveal .game-stage");
    expect(css9x16).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(css9x16).toContain("height: 1100px;");
  });

  it("verifies hero area ratio is substantial for cinematic visual impact", () => {
    const ratio = candyArcadeHeroAreaRatio("mystery_reveal");
    expect(ratio).toBeGreaterThan(0.25);
  });

  it("renders sandbox preview composition with 1 choice without schema errors", () => {
    const composition = buildSandboxComposition({
      layout_id: "mystery_reveal",
      choices: ["Pikachu"],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(composition.html).toContain("mystery-stage-wrapper");
    expect(composition.html).toContain("Pikachu");
  });

  it("renders sandbox preview composition with 0 choices (pure visual reveal) without schema errors", () => {
    const composition = buildSandboxComposition({
      layout_id: "mystery_reveal",
      choices: [],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(composition.html).toContain("hero-image");
  });

  it("renders sandbox preview composition with 2 or 3 choices smoothly", () => {
    const twoChoices = buildSandboxComposition({
      layout_id: "mystery_reveal",
      choices: ["Choice A", "Choice B"],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(twoChoices.html).toContain("Choice A");

    const threeChoices = buildSandboxComposition({
      layout_id: "mystery_reveal",
      choices: ["A", "B", "C"],
      correct_choice_index: 1,
      phase: "reveal",
    });
    expect(threeChoices.html).toContain("mystery-stage-wrapper");
  });

  it("strictly rejects more than 3 choices in sandbox preview schema", () => {
    expect(() => {
      buildSandboxComposition({
        layout_id: "mystery_reveal",
        choices: ["A", "B", "C", "D"],
        correct_choice_index: 0,
      });
    }).toThrow();
  });

  it("renders sandbox preview composition in rehearsal mode with standard block centering", () => {
    const composition = buildSandboxComposition({
      layout_id: "mystery_reveal",
      choices: ["Pikachu"],
      correct_choice_index: 0,
      mode: "rehearsal",
    });
    expect(composition.html).toContain("layout-mystery_reveal");
    expect(composition.html).toContain("mystery-stage-wrapper");
    expect(composition.html).toContain("window.__fontReadyPromise");
    expect(composition.html).toContain("margin-left: auto");
    expect(composition.html).toContain("margin-right: auto");
  });
});

