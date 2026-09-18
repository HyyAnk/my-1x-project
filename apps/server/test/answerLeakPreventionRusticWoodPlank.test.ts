import { describe, expect, it } from "vitest";
import { SandboxPreviewInputSchema } from "@studio/shared";
import { visualChoicesThreePureLayout } from "../src/quiz/render/layouts/visualChoicesThreePure.js";
import { splitVersusTwoLayout } from "../src/quiz/render/layouts/splitVersusTwo.js";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
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
      expect(scheduledDefeatRule![1]).toContain("animation: split-versus-loser-defeat");
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
        correct_choice_index: 0,
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
});
