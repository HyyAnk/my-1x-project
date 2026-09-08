import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUIZ_PALETTE_FALLBACK,
  serializeQuizPaletteCss,
  serializeQuizPaletteCssVariables,
  serializeQuizPaletteInlineStyle,
} from "@studio/shared";
import { baseChoiceStyles } from "../src/quiz/render/choices/baseChoiceStyles.js";
import { choiceTypographyStyles } from "../src/quiz/render/choices/choiceTypographyStyles.js";
import { choiceStateStyles } from "../src/quiz/render/choices/choiceStateStyles.js";
import { fullStackListLayout } from "../src/quiz/render/layouts/fullStackList.js";
import { mediaLeftChoicesRightLayout } from "../src/quiz/render/layouts/mediaLeftChoicesRight.js";
import { visualChoicesThreeLayout } from "../src/quiz/render/layouts/visualChoicesThree.js";
import { splitVersusTwoLayout } from "../src/quiz/render/layouts/splitVersusTwo.js";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
import { mysteryRevealLayout } from "../src/quiz/render/layouts/mysteryReveal.js";
import { clueDeductionLayout } from "../src/quiz/render/layouts/clueDeduction.js";
import { baselineLayout } from "../src/quiz/render/layouts/baseline.js";
import { glossyArcadeVariant } from "../src/quiz/visual/elements/answerCard/variants/glossyArcade.js";
import { comicChunkyVariant } from "../src/quiz/visual/elements/answerCard/variants/comicChunky.js";
import { glassNeonVariant } from "../src/quiz/visual/elements/answerCard/variants/glassNeon.js";
import { minimalSoftVariant } from "../src/quiz/visual/elements/answerCard/variants/minimalSoft.js";
import { candyArcadePalettes } from "../src/quiz/visual/candyArcade.js";

describe("Candy Arcade CSS architecture, boundaries & tokens", () => {
  it("owns placement, dimensions, and capacity tokens in layout CSS without selecting private skin classes", () => {
    const mlcrCss = mediaLeftChoicesRightLayout.css("16:9");
    const vc3Css = visualChoicesThreeLayout.css("16:9");
    const baseCss = baselineLayout.css("16:9");

    expect(mlcrCss).toContain("--choice-card-min-height");
    expect(mlcrCss).toContain("--choice-badge-size");
    expect(mlcrCss).toContain("--choice-font-size-base");
    expect(vc3Css).toContain("--choice-media-height");
    expect(vc3Css).toContain("--choice-label-font-size-base");
    expect(baseCss).toContain("--choice-card-min-height");

    expect(mlcrCss).not.toContain(".ac-glossy-arcade");
    expect(mlcrCss).not.toContain(".ac-comic-chunky");
    expect(mlcrCss).not.toContain(".ac-glass-neon");
    expect(mlcrCss).not.toContain(".ac-minimal-soft");
    expect(vc3Css).not.toContain(".ac-glossy-arcade");
    expect(vc3Css).not.toContain(".ac-comic-chunky");

    expect(mlcrCss).not.toContain("border: 8px solid");
    expect(mlcrCss).not.toContain("border: 7px solid");
    expect(mlcrCss).not.toContain("border: 4px solid");
  });

  it("owns stable internal structure in base choice CSS independent of skin and layout", () => {
    const base = baseChoiceStyles();

    expect(base).toContain(".choice-group");
    expect(base).toContain(".choice-card");
    expect(base).toContain(".choice-card-text");
    expect(base).toContain(".choice-card-visual");
    expect(base).toContain(".choice-label");
    expect(base).toContain(".choice-text");
    expect(base).toContain(".choice-media");

    expect(base).toContain("var(--choice-card-min-height");
    expect(base).toContain("var(--choice-badge-size");
    expect(base).toContain("var(--choice-media-height");
    expect(base).toContain('.choice-group[data-choice-fit-lines="2"] .choice-text');
    expect(base).toContain("-webkit-line-clamp: 2");
  });

  it("keeps visual answer tracks and cards inside allocated grid width", () => {
    const base = baseChoiceStyles();

    expect(base).toContain("grid-template-columns: var(--choice-grid-columns, repeat(3, minmax(0, 1fr)));");
    expect(base).toMatch(/\.choice-card-visual,[\s\S]*?\.visual-answer-card \{[\s\S]*?min-width: 0;/);
    expect(base).toMatch(/\.visual-answer-label \{[\s\S]*?min-width: 0;/);
  });

  it("owns shared answer outcome states without icon bloat", () => {
    const state = choiceStateStyles();

    expect(state).toContain(".answer-correct");
    expect(state).toContain(".answer-incorrect");
    expect(state).toContain("correct-card-reveal");
    expect(state).toContain("incorrect-card-settle");
    expect(state).not.toContain(".answer-check");
    expect(state).not.toContain(".answer-cross");
  });

  it("provides typography tier system consuming layout capacity tokens", () => {
    const typo = choiceTypographyStyles();

    expect(typo).toContain(".choice-card-text .choice-text");
    expect(typo).toContain(".choice-tier-medium");
    expect(typo).toContain(".choice-tier-long");
    expect(typo).toContain(".choice-tier-very_long");
    expect(typo).toContain(".choice-tier-overflow");

    expect(typo).toContain("var(--choice-font-size-base");
    expect(typo).toContain("var(--choice-font-size-medium");
    expect(typo).toContain("var(--choice-font-size-long");
    expect(typo).toContain("var(--choice-font-size-very_long");
    expect(typo).toContain("var(--choice-label-font-size-base");
    expect(typo).toContain("var(--choice-label-font-size-medium");
    expect(typo).toContain("var(--choice-fitted-font-size, var(--choice-font-size-base");
    expect(typo).toContain("var(--choice-fitted-font-size, var(--choice-label-font-size-base");
  });

  it("owns decoration in skin CSS without outer layout placement", () => {
    const skins = [glossyArcadeVariant, comicChunkyVariant, glassNeonVariant, minimalSoftVariant];

    for (const skin of skins) {
      const css = skin.renderCss();
      expect(css).toContain(skin.className);

      expect(css).not.toContain("grid-template-columns");
      expect(css).not.toContain("grid-template-areas");
      expect(css).not.toContain("grid-area: hero");
      expect(css).not.toContain("grid-area: answers");
    }
  });

  it("maintains normal cascade with no !important cross-layer dependencies", () => {
    const base = baseChoiceStyles();
    const typo = choiceTypographyStyles();
    const state = choiceStateStyles();
    const mlcr = mediaLeftChoicesRightLayout.css("16:9");
    const vc3 = visualChoicesThreeLayout.css("16:9");
    const glossy = glossyArcadeVariant.renderCss();
    const comic = comicChunkyVariant.renderCss();
    const glass = glassNeonVariant.renderCss();
    const minimal = minimalSoftVariant.renderCss();

    expect(base).not.toContain("!important");
    expect(typo).not.toContain("!important");
    expect(state).not.toContain("!important");
    expect(mlcr).not.toContain("!important");
    expect(vc3).not.toContain("!important");
    expect(glossy).not.toContain("!important");
    expect(comic).not.toContain("!important");
    expect(glass).not.toContain("!important");
    expect(minimal).not.toContain("!important");
  });

  it("serializes identical semantic palette variables for production and sandbox", () => {
    for (const palette of candyArcadePalettes) {
      const vars = serializeQuizPaletteCssVariables(palette);
      const css = serializeQuizPaletteCss(palette);
      const inline = serializeQuizPaletteInlineStyle(palette);

      expect(vars["--bg-primary"]).toBe(palette.backgroundPrimary);
      expect(vars["--bg-secondary"]).toBe(palette.backgroundSecondary);
      expect(vars["--accent"]).toBe(palette.accent);
      expect(vars["--surface-accent"]).toBe(palette.surfaceAccent);
      expect(vars["--on-accent"]).toBe(palette.onAccent);
      expect(vars["--answer-badge"]).toBe(palette.answerBadge);
      expect(vars["--badge"]).toBe(palette.answerBadge);
      expect(vars["--correct"]).toBe(palette.correct);
      expect(vars["--incorrect"]).toBe(palette.incorrect);
      expect(vars["--surface"]).toBe(palette.surface);
      expect(vars["--text"]).toBe(palette.text);
      expect(vars["--ink"]).toBe(palette.text);
      expect(vars["--muted"]).toBe(palette.muted);

      expect(css).toContain(`--bg-primary: ${palette.backgroundPrimary};`);
      expect(css).toContain(`--text: ${palette.text};`);
      expect(inline).toContain(`--bg-primary:${palette.backgroundPrimary};`);
      expect(inline).toContain(`--ink:${palette.text};`);
    }
  });

  it("falls back safely for null or empty palette without emitting invalid CSS", () => {
    const nullVars = serializeQuizPaletteCssVariables(null);
    const emptyVars = serializeQuizPaletteCssVariables({});

    expect(nullVars["--bg-primary"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.backgroundPrimary);
    expect(nullVars["--text"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.text);
    expect(emptyVars["--correct"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.correct);
    expect(emptyVars["--incorrect"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.incorrect);
  });

  it("publishes complete capacity custom properties for 16:9 and 9:16 aspect ratios", () => {
    const mlcr = mediaLeftChoicesRightLayout.css("16:9");
    const vc3 = visualChoicesThreeLayout.css("16:9");

    expect(mlcr).toContain("--choice-card-min-height: 116px;");
    expect(mlcr).toContain("--choice-badge-size: 138px;");
    expect(mlcr).toContain("--choice-font-size-base: 38px;");
    expect(mlcr).toContain("--choice-font-size-medium: 30px;");
    expect(mlcr).toContain("--choice-font-size-long: 24px;");
    expect(mlcr).toContain("--choice-font-size-very_long: 20px;");

    expect(vc3).toContain("--choice-media-height: 320px;");
    expect(vc3).toContain("--choice-badge-size: 72px;");
    expect(vc3).toContain("--choice-label-min-height: 70px;");
    expect(vc3).toContain("--choice-label-font-size-base: 26px;");

    const mlcr916 = mediaLeftChoicesRightLayout.css("9:16");
    const vc3916 = visualChoicesThreeLayout.css("9:16");

    expect(mlcr916).not.toContain('#stage[data-aspect-ratio="9:16"]');

    expect(vc3916).toContain('#stage[data-aspect-ratio="9:16"]');
    expect(vc3916).toContain("--choice-media-height: 360px;");
    expect(vc3916).toContain("--choice-badge-size: 104px;");
    expect(vc3916).toContain("--choice-label-min-height: 74px;");

    const sv2 = splitVersusTwoLayout.css("16:9");
    const vtf = verdictTrueFalseLayout.css("16:9");

    expect(sv2).toContain("--choice-card-min-height: 500px;");
    expect(sv2).toContain("--choice-card-height: 500px;");
    expect(sv2).toContain("--choice-media-height: 410px;");
    expect(sv2).toContain("--choice-badge-size: 116px;");
    expect(sv2).toContain("--choice-badge-font-size: 60px;");
    expect(sv2).toContain("--choice-font-size-base: 40px;");
    expect(sv2).toContain("--choice-font-size-medium: 32px;");
    expect(sv2).toContain("--choice-font-size-long: 25px;");
    expect(sv2).toContain("--choice-font-size-very_long: 21px;");
    expect(sv2).toContain("--choice-font-size-overflow: 20px;");
    expect(sv2).toContain("--choice-fit-min: 20px;");
    expect(sv2).toContain("--choice-fit-max: 56px;");
    expect(sv2).toContain("width: 1420px;");
    expect(sv2).toContain("max-width: 1360px;");
    expect(sv2).not.toContain(".has-mascot");

    expect(vtf).toContain("--choice-card-min-height: 140px;");
    expect(vtf).toContain("--choice-card-height: 140px;");
    expect(vtf).toContain("--choice-badge-size: 148px;");
    expect(vtf).toContain("--choice-badge-font-size: 80px;");
    expect(vtf).toContain("--choice-font-size-base: 46px;");
    expect(vtf).toContain("--choice-font-size-medium: 38px;");
    expect(vtf).toContain("--choice-font-size-long: 30px;");
    expect(vtf).toContain("--choice-font-size-very_long: 24px;");
    expect(vtf).toContain("--choice-font-size-overflow: 22px;");
    expect(vtf).toContain("--choice-fit-min: 24px;");
    expect(vtf).toContain("--choice-fit-max: 68px;");
    expect(vtf).toContain("width: 1420px;");
    expect(vtf).toContain("max-width: 1420px;");
    expect(vtf).toContain("width: min(1260px, 100%);");
    expect(vtf).toContain("width: min(1220px, 100%);");
    expect(vtf).not.toContain(".has-mascot");

    const mr = mysteryRevealLayout.css("16:9");
    const cd = clueDeductionLayout.css("16:9");

    expect(mr).toContain("--mystery-stage-width: 1100px;");
    expect(mr).toContain("--mystery-stage-height: 590px;");
    expect(mr).toContain("width: 1420px;");
    expect(mr).toContain("max-width: 1420px;");
    expect(mr).toContain("max-width: 1380px;");
    expect(mr).toContain("max-width: var(--mystery-stage-width, 1100px);");
    expect(mr).toContain("width: var(--mystery-stage-width, 1100px);");
    expect(mr).toContain("max-width: 1360px;");
    expect(mr).toContain("width: min(75vw, 1100px);");
    expect(mr).toContain("width: min(1080px, 100%);");
    expect(mr).not.toContain(".has-mascot");

    expect(cd).toContain("--clue-stage-width: 1180px;");
    expect(cd).toContain("--clue-stage-height: 560px;");
    expect(cd).toContain("width: var(--mascot-content-width, 1420px);");
    expect(cd).toContain("max-width: 1420px;");
    expect(cd).toContain("max-width: 1380px;");
    expect(cd).toContain("max-width: 1180px;");
    expect(cd).toContain("max-width: 1360px;");
    expect(cd).toContain("width: min(72vw, 1180px);");
    expect(cd).toContain("width: min(1180px, 100%);");
    expect(cd).not.toContain(".has-mascot");
  });

  it("publishes answer card auto-fit tokens for all layouts and aspect ratios", () => {
    const baseline = baselineLayout.css("16:9");
    const mediaLeft = mediaLeftChoicesRightLayout.css("16:9");
    const mediaLeftPortrait = mediaLeftChoicesRightLayout.css("9:16");
    const fullStack = fullStackListLayout.css("16:9");
    const fullStackPortrait = fullStackListLayout.css("9:16");
    const visual = visualChoicesThreeLayout.css("16:9");
    const visualPortrait = visualChoicesThreeLayout.css("9:16");

    expect(baseline).toContain("--choice-fit-max: 64px;");
    expect(mediaLeft).toContain("--choice-fit-max: 64px;");
    expect(mediaLeftPortrait).toContain("--choice-fit-max: 64px;");
    expect(fullStack).toContain("--choice-fit-max: 64px;");
    expect(fullStackPortrait).toContain("--choice-fit-max: 64px;");
    expect(visual).toContain("--choice-fit-max: 30px;");
    expect(visualPortrait).toContain("--choice-fit-max: 42px;");

    for (const css of [baseline, mediaLeft, fullStack, visual]) {
      expect(css).toContain("--choice-fit-min:");
      expect(css).toContain("--choice-fit-max-lines: 2;");
      expect(css).toContain("--choice-fit-leading: 1.08;");
      expect(css).toContain("--choice-fit-multiline-gain: 6px;");
    }
  });
});
