import { describe, expect, it } from "vitest";
import { mediaLeftChoicesRightLayout } from "../src/quiz/render/layouts/mediaLeftChoicesRight.js";
import { visualChoicesThreeLayout } from "../src/quiz/render/layouts/visualChoicesThree.js";
import { visualChoicesThreePureLayout } from "../src/quiz/render/layouts/visualChoicesThreePure.js";
import { splitVersusTwoLayout } from "../src/quiz/render/layouts/splitVersusTwo.js";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
import { candyArcadeKeyframesCss } from "../src/quiz/render/candyArcade/styles/candyArcadeKeyframes.js";

describe("Image Box Floating Motion Animation Across Layouts", () => {
  it("defines canonical visual-card-float in candyArcadeKeyframes", () => {
    const keyframes = candyArcadeKeyframesCss();
    expect(keyframes).toContain("@keyframes visual-card-float");
    expect(keyframes).toContain("transform: translateY(-6px)");
  });

  describe("Reference Layout: 3 Choice Visual Card (visual_choices_three)", () => {
    it("features visual-card-float animation for visual cards", () => {
      const css = visualChoicesThreeLayout.css("16:9");
      expect(css).toContain("visual-card-float 3.8s ease-in-out");
      expect(css).toContain("@keyframes visual-card-float");
    });
  });

  describe("Layout 1: Media Left + 3 Choices Right (media_left_choices_right)", () => {
    it("applies visual-card-float floating motion to the hero image box", () => {
      const css = mediaLeftChoicesRightLayout.css("16:9");
      expect(css).toContain(".layout-media_left_choices_right.quiz-question-clip .hero-image");
      expect(css).toContain("visual-card-float 3.8s ease-in-out");
      expect(css).toContain("@keyframes visual-card-float");
    });
  });

  describe("Layout 2: 3 Choice Pure Visual Cards (visual_choices_three_pure)", () => {
    it("applies visual-card-float floating motion with staggered delays to visual cards", () => {
      const css = visualChoicesThreePureLayout.css("16:9");
      expect(css).toContain(".layout-visual_choices_three_pure.quiz-question-clip .choice-card:nth-child(1)");
      expect(css).toContain(".layout-visual_choices_three_pure.quiz-question-clip .visual-answer-card:nth-child(1)");
      expect(css).toContain("visual-card-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s)");
      expect(css).toContain("visual-card-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.66s)");
      expect(css).toContain("visual-card-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.78s)");
      expect(css).toContain("@keyframes visual-card-float");
    });
  });

  describe("Layout 3: 1v1 Split Versus (split_versus_two)", () => {
    it("applies visual-card-float floating motion to contender choice image boxes", () => {
      const css = splitVersusTwoLayout.css("16:9");
      expect(css).toContain(".layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1) .choice-media");
      expect(css).toContain(".layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1) .option-image");
      expect(css).toContain(".layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2) .choice-media");
      expect(css).toContain(".layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2) .option-image");
      expect(css).toContain("visual-card-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.54s)");
      expect(css).toContain("visual-card-float 3.8s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s)");
      expect(css).toContain("@keyframes visual-card-float");
    });
  });

  describe("Layout 4: Verdict True/False (verdict_true_false)", () => {
    it("applies visual-card-float floating motion to the hero image box", () => {
      const css = verdictTrueFalseLayout.css("16:9");
      expect(css).toContain(".layout-verdict_true_false.quiz-question-clip .hero-image");
      expect(css).toContain("visual-card-float 3.8s ease-in-out");
      expect(css).toContain("@keyframes visual-card-float");
    });
  });
});
