import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES, resolveQuizLayout } from "@studio/shared";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";
import { textLayout } from "../src/quiz/visual/candyArcade.js";
import { answerCardRegistry, resolveAnswerCardSkin } from "../src/quiz/visual/elements/answerCard/registry.js";

const slots = {
  questionBoxHtml: "<question-box />",
  heroHtml: "<hero />",
  choicesHtml: "<choices />",
  phaseHtml: "<phase />",
};

describe("Phase 1 layout and resolver characterization", () => {
  it("R-01 through R-03 preserve current auto layout resolution", () => {
    for (const archetype of ["text_multiple_choice", "illustrated_multiple_choice"] as const) {
      expect(resolveQuizLayout({ requestedLayout: "auto", archetype, questionFormat: "multiple_choice", choiceCount: 3 })).toMatchObject({
        ok: true,
        layoutId: "media_left_choices_right",
      });
    }
    expect(
      resolveQuizLayout({
        requestedLayout: "auto",
        archetype: "visual_multiple_choice",
        questionFormat: "multiple_choice",
        choiceCount: 3,
      }),
    ).toMatchObject({ ok: true, layoutId: "visual_choices_three" });
    expect(
      resolveQuizLayout({ requestedLayout: "auto", archetype: "text_multiple_choice", questionFormat: "odd_one_out", choiceCount: 3 }),
    ).toMatchObject({ ok: true, layoutId: "visual_choices_three" });
  });

  it("R-04 now rejects an incompatible explicit layout without fallback", () => {
    expect(
      resolveQuizLayout({
        requestedLayout: "visual_choices_three",
        archetype: "true_false",
        questionFormat: "true_false",
        choiceCount: 2,
      }),
    ).toMatchObject({ ok: false, requestedLayout: "visual_choices_three", source: "explicit" });
  });

  it("L-02 through L-04 preserve registered slots", () => {
    expect(renderQuizLayoutBody("baseline", slots)).toBe('<question-box /><hero /><choices /><div class="phase-region"><phase /></div>');
    expect(renderQuizLayoutBody("media_left_choices_right", slots)).toBe(
      '<question-box /><hero /><choices /><div class="phase-region"><phase /></div>',
    );
    expect(renderQuizLayoutBody("visual_choices_three", slots)).toBe(
      '<question-box /><choices /><div class="phase-region"><phase /></div>',
    );
    expect(renderQuizLayoutBody("full_stack_list", slots)).toBe('<question-box /><choices /><div class="phase-region"><phase /></div>');
  });
});

describe("Answer Card skin registry", () => {
  it("P4-SKIN-01, P4-SKIN-04, and P4-SKIN-05 preserve parity, defaults, and skin-only hooks", () => {
    expect([...answerCardRegistry.keys()].sort()).toEqual(ALL_ANSWER_CARD_STYLES.filter((style) => style !== "auto").sort());
    expect(resolveAnswerCardSkin("auto").id).toBe("glossy_arcade");
    expect(resolveAnswerCardSkin(null).id).toBe("glossy_arcade");
    expect(resolveAnswerCardSkin(undefined).id).toBe("glossy_arcade");
    for (const skin of answerCardRegistry.values()) {
      expect(skin.className).toMatch(/^ac-/);
      expect(typeof skin.renderCss).toBe("function");
      expect(skin).not.toHaveProperty("renderHtml");
    }
  });
});

describe("Phase 1 typography and aspect-ratio characterization", () => {
  it("T-01 and T-02 preserve every current choice-tier boundary", () => {
    const tiersAt = (lengths: number[], hasMascot: boolean) =>
      lengths.map((length) => textLayout("x".repeat(length), "choice", { hasMascot }).tier);

    expect(tiersAt([18, 19, 34, 35, 58, 59, 82, 83], false)).toEqual([
      "short",
      "medium",
      "medium",
      "long",
      "long",
      "very_long",
      "very_long",
      "overflow",
    ]);
    expect(tiersAt([10, 11, 22, 23, 40, 41, 60, 61], true)).toEqual([
      "short",
      "medium",
      "medium",
      "long",
      "long",
      "very_long",
      "very_long",
      "overflow",
    ]);
  });

  it("A-02 and B-03 preserve portrait selectors and reduced-motion CSS", () => {
    const css = candyArcadeCss({ fontMode: "preview", aspectRatio: "9:16" });
    expect(css).toContain(
      '#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage { grid-template-columns: minmax(0, 1fr);',
    );
    expect(css).toContain('#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .visual-answer-grid');
    expect(css).toContain('#stage[data-aspect-ratio="9:16"] .layout-visual_choices_three .option-image { height: 320px; }');
    expect(css).toContain("padding-bottom: 160px; box-sizing: border-box;");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: .001ms !important");
  });
});
