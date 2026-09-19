import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "@playwright/test";
import { SandboxPreviewInputSchema } from "@studio/shared";
import { visualChoicesThreeLayout } from "../src/quiz/render/layouts/visualChoicesThree.js";
import { visualChoicesThreePureLayout } from "../src/quiz/render/layouts/visualChoicesThreePure.js";
import { splitVersusTwoLayout } from "../src/quiz/render/layouts/splitVersusTwo.js";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
import { candyArcadeKeyframesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeKeyframes.js";
import { choiceStateStyles } from "../src/quiz/render/choices/choiceStateStyles.js";
import { rusticWoodPlankVariant } from "../src/quiz/visual/elements/answerCard/variants/rusticWoodPlank.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Answer Leak Prevention for Rustic Wood Plank across Binary and Visual Layouts", () => {
  describe("Layout: 3 Choice Pure Visual Cards (visual_choices_three_pure)", () => {
    it("does not leak reveal colors or box-shadow at 0% keyframe in visualChoicesThreePure layout", () => {
      const css = visualChoicesThreePureLayout.css();

      // Ensure keyframes for pure badges and winner surfaces do not leak reveal styling at 0%
      const badgeKeyframesIdx = css.indexOf("@keyframes visual-pure-correct-badge");
      expect(badgeKeyframesIdx).toBeGreaterThan(-1);
      const badgeSnippet = css.slice(badgeKeyframesIdx, badgeKeyframesIdx + 300);
      const zeroBadge = badgeSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroBadge).toBeTruthy();
      expect(zeroBadge![1]).not.toContain("border-color");
      expect(zeroBadge![1]).not.toContain("box-shadow");

      const celebrateKeyframesIdx = css.indexOf("@keyframes visual-pure-correct-celebrate");
      expect(celebrateKeyframesIdx).toBeGreaterThan(-1);
      const celebrateSnippet = css.slice(celebrateKeyframesIdx, celebrateKeyframesIdx + 300);
      const zeroCelebrate = celebrateSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroCelebrate).toBeTruthy();
      expect(zeroCelebrate![1]).not.toContain("border-color");
      expect(zeroCelebrate![1]).not.toContain("box-shadow");
    });

    it("provides centered pure seal slam animation without premature styling at 0% in rusticWoodPlank", () => {
      const skinCss = rusticWoodPlankVariant.renderCss();

      // Pure seal slam keyframe preserves translateX(-50%) and has clean 0%
      const pureSlamIdx = skinCss.indexOf("@keyframes ac-wood-pure-seal-slam");
      expect(pureSlamIdx).toBeGreaterThan(-1);
      const pureSlamSnippet = skinCss.slice(pureSlamIdx, pureSlamIdx + 300);
      const zeroPercent = pureSlamSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroPercent).toBeTruthy();
      expect(zeroPercent![1]).toContain("translateX(-50%)");
      expect(zeroPercent![1]).not.toContain("border-color");
      expect(zeroPercent![1]).not.toContain("box-shadow");
      expect(zeroPercent![1]).not.toContain("background");

      // Scheduled animation rule targets pure badge with pure slam animation
      expect(skinCss).toContain(".choice-card-visual.choice-pure-visual.answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure");
      expect(skinCss).toContain("ac-wood-pure-seal-slam");
    });

    it("preserves centered straddling badge with translateX(-50%) on pure visual cards without ac-wood-seal-slam override", () => {
      const skinCss = rusticWoodPlankVariant.renderCss();

      // Dedicated pure visual straddling badge centering in rusticWoodPlank
      expect(skinCss).toContain(".choice-card-visual.choice-pure-visual.skin-rustic_wood_plank .choice-badge-pure");
      expect(skinCss).toContain("transform: translateX(-50%)");

      // High-specificity pure visual reveal overrides to prevent generic ac-wood-seal-slam from removing translateX(-50%)
      expect(skinCss).toContain(
        ".quiz-question-clip .choice-card-visual.choice-pure-visual:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure",
      );
      expect(skinCss).toContain(
        ".layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-badge-pure",
      );
    });
  });

  describe("Layout: 1v1 Split Versus Two Choices (split_versus_two)", () => {
    it("decouples scheduled answer-reveal-correct and answer-reveal-incorrect from static reveal styling", () => {
      const css = splitVersusTwoLayout.css();

      // Winner surface: scheduled class must not have static green border or box shadow declaration
      const scheduledWinRule = css.match(
        /\.layout-split_versus_two\s+\.choice-card\.answer-reveal-correct\s+\.choice-card-surface[\s\S]*?\{([^}]+)\}/,
      );
      expect(scheduledWinRule).toBeTruthy();
      expect(scheduledWinRule![1]).toContain("animation: split-versus-surface-win");
      expect(scheduledWinRule![1]).not.toContain("border-color: #22C55E");
      expect(scheduledWinRule![1]).not.toContain("box-shadow: ");

      // Winner surface: snapshot class maintains static green border and glowing shadow
      const snapshotWinRule = css.match(
        /\.layout-split_versus_two\s+\.choice-card\.answer-correct\s+\.choice-card-surface[\s\S]*?\{([^}]+)\}/,
      );
      expect(snapshotWinRule).toBeTruthy();
      expect(snapshotWinRule![1]).toContain("border-color: #22C55E;");
      expect(snapshotWinRule![1]).toContain("box-shadow:");

      // Loser surface: scheduled class must not have static opacity 0.35 or grayscale filter
      const scheduledDefeatRule = css.match(/\.layout-split_versus_two\s+\.choice-card\.answer-reveal-incorrect[\s\S]*?\{([^}]+)\}/);
      expect(scheduledDefeatRule).toBeTruthy();
      expect(scheduledDefeatRule![1]).toContain("split-versus-loser-defeat");
      expect(scheduledDefeatRule![1]).not.toContain("opacity: 0.35");
      expect(scheduledDefeatRule![1]).not.toContain("grayscale(78%)");

      // Loser surface: snapshot class maintains static opacity 0.35 and grayscale filter
      const snapshotDefeatRule = css.match(/\.layout-split_versus_two\s+\.choice-card\.answer-incorrect[\s\S]*?\{([^}]+)\}/);
      expect(snapshotDefeatRule).toBeTruthy();
      expect(snapshotDefeatRule![1]).toContain("opacity: 0.35;");
      expect(snapshotDefeatRule![1]).toContain("grayscale(78%)");
    });

    it("ensures split versus keyframes start at 100% resting parity during countdown delay", () => {
      const css = splitVersusTwoLayout.css();

      // Win keyframe 0% must not leak green border or glowing shadow
      const winKeyframesIdx = css.indexOf("@keyframes split-versus-surface-win");
      expect(winKeyframesIdx).toBeGreaterThan(-1);
      const winKeyframesSnippet = css.slice(winKeyframesIdx, winKeyframesIdx + 300);
      const zeroWin = winKeyframesSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroWin).toBeTruthy();
      expect(zeroWin![1]).not.toContain("border-color");
      expect(zeroWin![1]).not.toContain("box-shadow");

      // Defeat keyframe 0% must start fully opaque and non-grayscale
      const defeatKeyframesIdx = css.indexOf("@keyframes split-versus-loser-defeat");
      expect(defeatKeyframesIdx).toBeGreaterThan(-1);
      const defeatKeyframesSnippet = css.slice(defeatKeyframesIdx, defeatKeyframesIdx + 300);
      const zeroDefeat = defeatKeyframesSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroDefeat).toBeTruthy();
      expect(zeroDefeat![1]).toContain("opacity: 1;");
      expect(zeroDefeat![1]).toContain("filter: grayscale(0%);");

      // VS badge victory flare must not statically apply gold gradient before reveal
      const scheduledBadgeRule = css.match(
        /\.layout-split_versus_two\s+\.answer-grid:has\(\.answer-reveal-correct\)::after[\s\S]*?\{([^}]+)\}/,
      );
      expect(scheduledBadgeRule).toBeTruthy();
      expect(scheduledBadgeRule![1]).not.toContain("background: linear-gradient(135deg, #FFD700");
    });
  });

  describe("Layout: Verdict True/False (verdict_true_false)", () => {
    it("decouples scheduled answer-reveal-correct and answer-reveal-incorrect from static reveal styling", () => {
      const css = verdictTrueFalseLayout.css();

      // Winner surface: scheduled class must not have static green border or box shadow
      const scheduledWinRule = css.match(
        /\.layout-verdict_true_false\s+\.choice-card\.answer-reveal-correct\s+\.choice-card-surface[\s\S]*?\{([^}]+)\}/,
      );
      expect(scheduledWinRule).toBeTruthy();
      expect(scheduledWinRule![1]).toContain("animation: verdict-surface-pop");
      expect(scheduledWinRule![1]).not.toContain("border-color: #22C55E");
      expect(scheduledWinRule![1]).not.toContain("box-shadow: ");

      // Winner surface: snapshot class maintains static green border and glowing shadow
      const snapshotWinRule = css.match(
        /\.layout-verdict_true_false\s+\.choice-card\.answer-correct\s+\.choice-card-surface[\s\S]*?\{([^}]+)\}/,
      );
      expect(snapshotWinRule).toBeTruthy();
      expect(snapshotWinRule![1]).toContain("border-color: #22C55E;");
      expect(snapshotWinRule![1]).toContain("box-shadow:");

      // Loser card: scheduled class must not have static opacity 0.58 or grayscale filter
      const scheduledDefeatRule = css.match(/\.layout-verdict_true_false\s+\.choice-card\.answer-reveal-incorrect[\s\S]*?\{([^}]+)\}/);
      expect(scheduledDefeatRule).toBeTruthy();
      expect(scheduledDefeatRule![1]).toContain("animation: verdict-incorrect-settle");
      expect(scheduledDefeatRule![1]).not.toContain("opacity: 0.58");
      expect(scheduledDefeatRule![1]).not.toContain("grayscale(65%)");

      // Loser card: snapshot class maintains static opacity 0.58 and grayscale filter
      const snapshotDefeatRule = css.match(/\.layout-verdict_true_false\s+\.choice-card\.answer-incorrect[\s\S]*?\{([^}]+)\}/);
      expect(snapshotDefeatRule).toBeTruthy();
      expect(snapshotDefeatRule![1]).toContain("opacity: 0.58;");
      expect(snapshotDefeatRule![1]).toContain("grayscale(65%)");
    });

    it("ensures verdict keyframes start at resting parity during countdown delay", () => {
      const css = verdictTrueFalseLayout.css();

      // Verdict win keyframe 0% must not leak green border or glowing shadow
      const winKeyframesIdx = css.indexOf("@keyframes verdict-surface-pop");
      expect(winKeyframesIdx).toBeGreaterThan(-1);
      const winKeyframesSnippet = css.slice(winKeyframesIdx, winKeyframesIdx + 300);
      const zeroWin = winKeyframesSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroWin).toBeTruthy();
      expect(zeroWin![1]).not.toContain("border-color");
      expect(zeroWin![1]).not.toContain("box-shadow");

      // Verdict defeat keyframe 0% must start fully opaque and non-grayscale
      const defeatKeyframesIdx = css.indexOf("@keyframes verdict-incorrect-settle");
      expect(defeatKeyframesIdx).toBeGreaterThan(-1);
      const defeatKeyframesSnippet = css.slice(defeatKeyframesIdx, defeatKeyframesIdx + 300);
      const zeroDefeat = defeatKeyframesSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroDefeat).toBeTruthy();
      expect(zeroDefeat![1]).toContain("opacity: 1;");
      expect(zeroDefeat![1]).toContain("grayscale(0%);");
    });

    it("contains complete button styling for rustic_wood_plank skin", () => {
      const css = verdictTrueFalseLayout.css();

      expect(css).toContain(".layout-verdict_true_false .skin-rustic_wood_plank:nth-child(1) .choice-card-surface");
      expect(css).toContain(".layout-verdict_true_false .skin-rustic_wood_plank:nth-child(2) .choice-card-surface");
      expect(css).toContain(".layout-verdict_true_false .skin-rustic_wood_plank:nth-child(1) .choice-text");
      expect(css).toContain(".layout-verdict_true_false .skin-rustic_wood_plank:nth-child(2) .choice-text");
    });
  });

  describe("Sandbox Composition Visual Sanity during Choices Countdown Phase", () => {
    it("renders rustic_wood_plank in visual_choices_three_pure with skin classes and decorations", () => {
      const input = SandboxPreviewInputSchema.parse({
        layout_id: "visual_choices_three_pure",
        aspect_ratio: "16:9",
        phase: "choices",
        choices: ["Option A", "Option B", "Option C"],
        choice_images: ["/test/a.png", "/test/b.png", "/test/c.png"],
        correct_choice_index: 1,
        question_text: "Which one is correct?",
        answer_card_style: "rustic_wood_plank",
        mascot_enabled: false,
      });

      const composition = buildSandboxComposition(input);
      expect(composition.html).toContain("layout-visual_choices_three_pure");
      expect(composition.html).toContain("skin-rustic_wood_plank");
      expect(composition.html).toContain("choice-badge-pure");
      expect(composition.html).toContain("answer-normal answer-pending");
    });

    it("renders rustic_wood_plank in split_versus_two with skin classes and decorations", () => {
      const input = SandboxPreviewInputSchema.parse({
        layout_id: "split_versus_two",
        aspect_ratio: "16:9",
        phase: "choices",
        choices: ["Fighter One", "Fighter Two"],
        choice_images: ["/test/p1.png", "/test/p2.png"],
        correct_choice_index: 1,
        question_text: "Who will emerge victorious?",
        answer_card_style: "rustic_wood_plank",
        mascot_enabled: false,
      });

      const composition = buildSandboxComposition(input);
      expect(composition.html).toContain("layout-split_versus_two");
      expect(composition.html).toContain("skin-rustic_wood_plank");
      expect(composition.html).toContain("wood-bracket");
      expect(composition.html).toContain("wood-nail");
      expect(composition.html).toContain("answer-normal answer-pending");
    });

    it("renders rustic_wood_plank in verdict_true_false with skin classes and decorations", () => {
      const input = SandboxPreviewInputSchema.parse({
        layout_id: "verdict_true_false",
        aspect_ratio: "16:9",
        phase: "choices",
        choices: ["True", "False"],
        question_format: "true_false",
        correct_choice_index: 0,
        question_text: "Is this claim accurate?",
        answer_card_style: "rustic_wood_plank",
        mascot_enabled: false,
      });

      const composition = buildSandboxComposition(input);
      expect(composition.html).toContain("layout-verdict_true_false");
      expect(composition.html).toContain("skin-rustic_wood_plank");
      expect(composition.html).toContain("wood-bracket");
      expect(composition.html).toContain("wood-nail");
      expect(composition.html).toContain("answer-normal answer-pending");
    });
  });

  describe("Layout: 3 Choice Visual Card (visual_choices_three)", () => {
    it("does not leak reveal border color or box-shadow at 0% keyframe in visual-correct-border and visual-correct-label-reveal", () => {
      const css = candyArcadeKeyframesCss();

      const borderKeyframeIdx = css.indexOf("@keyframes visual-correct-border");
      expect(borderKeyframeIdx).toBeGreaterThan(-1);
      const borderSnippet = css.slice(borderKeyframeIdx, borderKeyframeIdx + 300);
      const zeroBorder = borderSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroBorder).toBeTruthy();
      expect(zeroBorder![1]).not.toContain("border-color");
      expect(zeroBorder![1]).not.toContain("box-shadow");
      expect(zeroBorder![1]).not.toContain("transform");

      const labelKeyframeIdx = css.indexOf("@keyframes visual-correct-label-reveal");
      expect(labelKeyframeIdx).toBeGreaterThan(-1);
      const labelSnippet = css.slice(labelKeyframeIdx, labelKeyframeIdx + 300);
      const zeroLabel = labelSnippet.match(/0%\s*\{([^}]*)\}/);
      expect(zeroLabel).toBeTruthy();
      expect(zeroLabel![1]).not.toContain("border-color");
      expect(zeroLabel![1]).not.toContain("box-shadow");
    });

    it("decouples scheduled answer-reveal-incorrect from static opacity and grayscale in visualChoicesThreeLayout", () => {
      const css = visualChoicesThreeLayout.css("16:9");

      // Scheduled animation rule must not contain static opacity: 0.35 or filter: grayscale(78%)
      const scheduledRule = css.match(/\.layout-visual_choices_three[\s\S]*?\.answer-reveal-incorrect[\s\S]*?\{([^}]+)\}/);
      expect(scheduledRule).toBeTruthy();
      expect(scheduledRule![1]).toContain("animation: incorrect-card-settle-visual-three");
      expect(scheduledRule![1]).not.toContain("opacity: 0.35");
      expect(scheduledRule![1]).not.toContain("grayscale(78%)");

      // Snapshot class preserves static opacity and grayscale
      const snapshotRule = css.match(/\.layout-visual_choices_three[\s\S]*?\.answer-incorrect[\s\S]*?\{([^}]+)\}/);
      expect(snapshotRule).toBeTruthy();
      expect(snapshotRule![1]).toContain("opacity: 0.35;");
      expect(snapshotRule![1]).toContain("grayscale(78%)");
    });

    it("chains visual-choice-float with visual-correct-border on option-image in choiceStateStyles", () => {
      const css = choiceStateStyles();
      const optionImageIdx = css.indexOf(".choice-card-visual:nth-child(n).answer-reveal-correct .option-image");
      expect(optionImageIdx).toBeGreaterThan(-1);
      const snippet = css.slice(optionImageIdx, optionImageIdx + 350);
      expect(snippet).toContain("visual-choice-float");
      expect(snippet).toContain("visual-correct-border");
    });

    it("ensures rusticWoodPlankVariant chains float and overrides generic arcade styles with high specificity", () => {
      const skinCss = rusticWoodPlankVariant.renderCss();
      expect(skinCss).toContain(".quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .option-image");
      expect(skinCss).toContain("visual-choice-float");
      expect(skinCss).toContain("visual-correct-border");

      expect(skinCss).toContain(
        ".quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .ac-rustic-wood-plank",
      );
      expect(skinCss).toContain(".quiz-question-clip .choice-card:nth-child(n).answer-reveal-correct.skin-rustic_wood_plank .choice-label");
      expect(skinCss).toContain("ac-wood-seal-slam");
    });
  });

  describe("Chromium Browser Rehearsal Parity (Zero Leakage Check)", () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await page.route(/^https?:/, (route) => route.abort());
    });

    afterAll(async () => {
      await browser?.close();
    });

    it("maintains 100% computed style parity between winner and loser at t=1.0s and reveals gold at t=8.0s", async () => {
      const input = SandboxPreviewInputSchema.parse({
        layout_id: "visual_choices_three",
        aspect_ratio: "16:9",
        phase: "choices",
        mode: "rehearsal",
        choices: ["Option A", "Option B", "Option C"],
        choice_images: ["/test/a.png", "/test/b.png", "/test/c.png"],
        correct_choice_index: 1,
        question_text: "Which one is correct?",
        answer_card_style: "rustic_wood_plank",
        mascot_enabled: false,
      });

      const composition = buildSandboxComposition(input);
      await page.setContent(composition.html);

      // Seek to t=1.0s (countdown phase, prior to reveal at ~6.0s)
      await page.evaluate(`window.__hyperframesRehearsal.seek(1.0)`);
      await page.waitForTimeout(50);

      const preReveal = (await page.evaluate(`(() => {
        const cards = document.querySelectorAll(".choice-card-visual");
        const surf0 = window.getComputedStyle(cards[0].querySelector(".choice-card-surface"));
        const surf1 = window.getComputedStyle(cards[1].querySelector(".choice-card-surface"));
        const img0 = window.getComputedStyle(cards[0].querySelector(".option-image"));
        const img1 = window.getComputedStyle(cards[1].querySelector(".option-image"));
        const card0 = window.getComputedStyle(cards[0]);
        const card1 = window.getComputedStyle(cards[1]);

        return {
          surf0_border: surf0.borderColor,
          surf1_border: surf1.borderColor,
          surf0_border_width: surf0.borderWidth,
          surf1_border_width: surf1.borderWidth,
          surf0_shadow: surf0.boxShadow,
          surf1_shadow: surf1.boxShadow,
          surf0_outline: surf0.outline,
          surf1_outline: surf1.outline,
          img0_border: img0.borderColor,
          img1_border: img1.borderColor,
          img0_transform: img0.transform,
          img1_transform: img1.transform,
          card0_opacity: card0.opacity,
          card1_opacity: card1.opacity,
        };
      })()`)) as Record<string, string>;

      // Both cards must have identical rustic wood oak border (rgb(125, 67, 27)), NOT white or green
      expect(preReveal.surf0_border).toBe("rgb(125, 67, 27)");
      expect(preReveal.surf1_border).toBe("rgb(125, 67, 27)");
      expect(preReveal.surf0_border_width).toBe(preReveal.surf1_border_width);
      expect(preReveal.surf0_shadow).toBe(preReveal.surf1_shadow);
      expect(preReveal.surf0_outline).toBe(preReveal.surf1_outline);

      // Option images must both have white border (rgb(255, 255, 255)), NOT green
      expect(preReveal.img0_border).toBe("rgb(255, 255, 255)");
      expect(preReveal.img1_border).toBe("rgb(255, 255, 255)");

      // Both cards must have full opacity 1 (no premature dimming on losers)
      expect(preReveal.card0_opacity).toBe("1");
      expect(preReveal.card1_opacity).toBe("1");

      // Option images must both be actively floating (transforms are active, card 0 is not frozen)
      expect(preReveal.img0_transform).not.toBe("none");
      expect(preReveal.img1_transform).not.toBe("none");

      // Seek to t=8.0s (reveal phase)
      await page.evaluate(`window.__hyperframesRehearsal.seek(8.0)`);
      await page.waitForTimeout(50);

      const postReveal = (await page.evaluate(`(() => {
        const cards = document.querySelectorAll(".choice-card-visual");
        const surf1 = window.getComputedStyle(cards[1].querySelector(".choice-card-surface"));
        const card0 = window.getComputedStyle(cards[0]);

        return {
          surf1_border: surf1.borderColor,
          card0_opacity: card0.opacity,
        };
      })()`)) as Record<string, string>;

      // Winner card 1 has transitioned to glowing gold treasure border
      expect(postReveal.surf1_border).toBe("rgb(245, 156, 10)");
      // Loser card 0 has dimmed to 0.35 opacity
      expect(postReveal.card0_opacity).toBe("0.35");
    });

    it("maintains 100% computed style parity in split_versus_two at t=3.0s (countdown) and reveals gold at t=8.0s", async () => {
      const input = SandboxPreviewInputSchema.parse({
        layout_id: "split_versus_two",
        aspect_ratio: "16:9",
        phase: "choices",
        mode: "rehearsal",
        choices: ["Contender 1", "Contender 2"],
        choice_images: ["/test/c1.png", "/test/c2.png"],
        correct_choice_index: 1,
        question_text: "Who will emerge victorious?",
        answer_card_style: "rustic_wood_plank",
        mascot_enabled: false,
      });

      const composition = buildSandboxComposition(input);
      await page.setContent(composition.html);

      // Seek to t=3.0s (middle of countdown phase, prior to reveal at ~7.47s)
      await page.evaluate(`window.__hyperframesRehearsal.seek(3.0)`);
      await page.waitForTimeout(50);

      const preReveal = (await page.evaluate(`(() => {
        const cards = document.querySelectorAll(".choice-card");
        const surf0 = window.getComputedStyle(cards[0].querySelector(".choice-card-surface"));
        const surf1 = window.getComputedStyle(cards[1].querySelector(".choice-card-surface"));
        const img0 = window.getComputedStyle(cards[0].querySelector(".option-image"));
        const img1 = window.getComputedStyle(cards[1].querySelector(".option-image"));
        const card0 = window.getComputedStyle(cards[0]);
        const card1 = window.getComputedStyle(cards[1]);
        const versusBadge = window.getComputedStyle(document.querySelector(".visual-answer-grid, .answer-grid"), "::after");

        return {
          surf0_border: surf0.borderColor,
          surf1_border: surf1.borderColor,
          surf0_border_width: surf0.borderWidth,
          surf1_border_width: surf1.borderWidth,
          surf0_shadow: surf0.boxShadow,
          surf1_shadow: surf1.boxShadow,
          surf0_outline: surf0.outline,
          surf1_outline: surf1.outline,
          img0_border: img0.borderColor,
          img1_border: img1.borderColor,
          card0_opacity: card0.opacity,
          card1_opacity: card1.opacity,
          card0_transform: card0.transform,
          card1_transform: card1.transform,
          versus_badge_animations: versusBadge.animationName,
        };
      })()`)) as Record<string, string>;

      // Both cards must have identical rustic wood oak border (rgb(125, 67, 27)), NOT white or green
      expect(preReveal.surf0_border).toBe("rgb(125, 67, 27)");
      expect(preReveal.surf1_border).toBe("rgb(125, 67, 27)");
      expect(preReveal.surf0_border_width).toBe(preReveal.surf1_border_width);
      expect(preReveal.surf0_shadow).toBe(preReveal.surf1_shadow);
      expect(preReveal.surf0_outline).toBe(preReveal.surf1_outline);

      // Media option images must both have white border (rgb(255, 255, 255)), NOT green
      expect(preReveal.img0_border).toBe("rgb(255, 255, 255)");
      expect(preReveal.img1_border).toBe("rgb(255, 255, 255)");

      // Both cards must have full opacity 1 (no premature dimming on losers)
      expect(preReveal.card0_opacity).toBe("1");
      expect(preReveal.card1_opacity).toBe("1");

      // Both cards must be actively animated / floating (transforms are active)
      expect(preReveal.card0_transform).not.toBe("none");
      expect(preReveal.card1_transform).not.toBe("none");

      // The scheduled reveal must remain a valid third animation without changing the badge early.
      expect(preReveal.versus_badge_animations).toContain("split-versus-badge-slam");
      expect(preReveal.versus_badge_animations).toContain("split-versus-badge-pulse");
      expect(preReveal.versus_badge_animations).toContain("split-versus-badge-victory");

      // Seek to t=8.0s (reveal phase)
      await page.evaluate(`window.__hyperframesRehearsal.seek(8.0)`);
      await page.waitForTimeout(50);

      const postReveal = (await page.evaluate(`(() => {
        const cards = document.querySelectorAll(".choice-card");
        const surf1 = window.getComputedStyle(cards[1].querySelector(".choice-card-surface"));
        const card0 = window.getComputedStyle(cards[0]);

        return {
          surf1_border: surf1.borderColor,
          card0_opacity: card0.opacity,
        };
      })()`)) as Record<string, string>;

      // Winner card 1 has transitioned to glowing gold treasure border
      expect(postReveal.surf1_border).toBe("rgb(245, 156, 10)");
      // Loser card 0 has dimmed to 0.35 opacity
      expect(postReveal.card0_opacity).toBe("0.35");
    });
  });
});
