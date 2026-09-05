import { describe, expect, it } from "vitest";
import {
  getQuizGameplayArchetype,
  QUIZ_LAYOUT_CATALOG,
  resolveQuizLayout,
} from "@studio/shared";
import {
  getQuizLayoutRenderer,
  renderQuizLayoutBody,
} from "../src/quiz/render/layouts/registry.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Clue Deduction layout & archetype", () => {
  it("defines clue_deduction capability in layout catalog correctly", () => {
    const capability = QUIZ_LAYOUT_CATALOG.clue_deduction;
    expect(capability).toBeDefined();
    expect(capability.id).toBe("clue_deduction");
    expect(capability.supportedAspectRatios).toEqual(["16:9", "9:16"]);
    expect(capability.supportedChoiceCounts).toEqual([0, 1, 2, 3]);
    expect(capability.recommendedFormats).toContain("image_guess");
    expect(capability.recommendedFormats).toContain("multiple_choice");
    expect(capability.media.required).toContain("question");
  });

  it("defines clue_deduction archetype blueprint", () => {
    const blueprint = getQuizGameplayArchetype("clue_deduction");
    expect(blueprint).toBeDefined();
    expect(blueprint?.targetLayout).toBe("clue_deduction");
    expect(blueprint?.defaultFormat).toBe("image_guess");
    expect(blueprint?.creativeAngles.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves auto layout to clue_deduction for clue_deduction archetype", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "clue_deduction",
      questionFormat: "image_guess",
      choiceCount: 1,
    });
    expect(result).toMatchObject({
      ok: true,
      layoutId: "clue_deduction",
      source: "auto",
    });
  });

  it("renders layout body slots correctly with backdrop, hero frame, and docked answer grid", () => {
    const slots = {
      questionBoxHtml: "<header class=\"question-title\">What profession uses this tool?</header>",
      heroHtml: "<figure class=\"hero-image\"><img src=\"stethoscope.png\" /></figure>",
      choicesHtml: "<div class=\"answer-grid answer-count-1\"><span>Doctor</span></div>",
      phaseHtml: "<div class=\"thinking\">3</div>",
    };

    const rendered = renderQuizLayoutBody("clue_deduction", slots);
    expect(rendered).toContain("question-title");
    expect(rendered).toContain("clue-deduction-stage-wrapper");
    expect(rendered).toContain("clue-stage-backdrop");
    expect(rendered).toContain("clue-hero-frame");
    expect(rendered).toContain("hero-image");
    expect(rendered).toContain("answer-grid");
    expect(rendered).toContain("phase-region");
  });

  it("generates responsive CSS containing 16:9 studio layout and 9:16 vertical stack", () => {
    const renderer = getQuizLayoutRenderer("clue_deduction");
    expect(renderer).toBeDefined();

    const css16x9 = renderer.css("16:9");
    expect(css16x9).toContain(".layout-clue_deduction .game-stage");
    expect(css16x9).toContain(".clue-deduction-stage-wrapper");
    expect(css16x9).toContain("clue-reveal-pulse");
    expect(css16x9).toContain("clue-answer-dock");
    expect(css16x9).toContain("bottom: 28px;");

    const css9x16 = renderer.css("9:16");
    expect(css9x16).toContain("#stage[data-aspect-ratio=\"9:16\"] .layout-clue_deduction .game-stage");
    expect(css9x16).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(css9x16).toContain("height: 1100px;");
  });

  it("renders sandbox preview composition with 1 choice without schema errors", () => {
    const composition = buildSandboxComposition({
      layout_id: "clue_deduction",
      choices: ["Doctor"],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(composition.html).toContain("clue-deduction-stage-wrapper");
    expect(composition.html).toContain("Doctor");
  });

  it("renders sandbox preview composition with 0 choices (pure visual clue deduction) without schema errors", () => {
    const composition = buildSandboxComposition({
      layout_id: "clue_deduction",
      choices: [],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(composition.html).toContain("hero-image");
  });

  it("renders sandbox preview composition with 2 or 3 choices smoothly", () => {
    const twoChoices = buildSandboxComposition({
      layout_id: "clue_deduction",
      choices: ["Doctor", "Nurse"],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(twoChoices.html).toContain("Doctor");

    const threeChoices = buildSandboxComposition({
      layout_id: "clue_deduction",
      choices: ["Doctor", "Chef", "Engineer"],
      correct_choice_index: 0,
      phase: "reveal",
    });
    expect(threeChoices.html).toContain("clue-deduction-stage-wrapper");
  });

  it("strictly rejects more than 3 choices in sandbox preview schema", () => {
    expect(() => {
      buildSandboxComposition({
        layout_id: "clue_deduction",
        choices: ["A", "B", "C", "D"],
        correct_choice_index: 0,
      });
    }).toThrow();
  });
});
