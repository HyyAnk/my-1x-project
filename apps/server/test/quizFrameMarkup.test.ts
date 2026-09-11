import { describe, expect, it } from "vitest";
import { QUIZ_LANDSCAPE_LAYOUT_IDS } from "@studio/shared";
import { isUnifiedQuizFrame, renderQuizFrameBody, renderQuizPhaseSlots } from "../src/quiz/render/frame/renderQuizFrameBody.js";
import { renderQuizLayoutBody } from "../src/quiz/render/layouts/registry.js";
import type { QuizLayoutSlots } from "../src/quiz/render/layouts/types.js";

describe("quizFrameMarkup", () => {
  const dummySlots: QuizLayoutSlots = {
    questionBoxHtml: `<div class="question-title"><h1>Test Question</h1></div>`,
    heroHtml: `<div class="hero-image"><img src="test.jpg" alt="test"></div>`,
    choicesHtml: `<div class="choice-group">Choice</div>`,
    phaseHtml: renderQuizPhaseSlots(`<div class="thinking-bar">Thinking</div>`, `<div class="fact-card"><p>Fact</p></div>`),
  };

  describe("isUnifiedQuizFrame", () => {
    it("returns true for all eight active 16:9 landscape layouts", () => {
      for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
        expect(isUnifiedQuizFrame(layoutId, "16:9")).toBe(true);
      }
    });

    it("returns false for baseline layout in 16:9", () => {
      expect(isUnifiedQuizFrame("baseline", "16:9")).toBe(false);
    });

    it("returns false for all layouts in 9:16 portrait", () => {
      for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
        expect(isUnifiedQuizFrame(layoutId, "9:16")).toBe(false);
      }
      expect(isUnifiedQuizFrame("baseline", "9:16")).toBe(false);
    });
  });

  describe("renderQuizFrameBody", () => {
    it("renders exactly one question anchor, one content anchor, and one phase region", () => {
      const html = renderQuizFrameBody(dummySlots, `<div class="arena-content">Inner</div>`);
      expect(html).toContain('class="quiz-question-anchor" data-quiz-fixed="question"');
      expect(html).toContain('class="quiz-content-anchor" data-quiz-content');
      expect(html).toContain('class="phase-region"');
      expect(html.match(/data-quiz-fixed="question"/g)?.length).toBe(1);
      expect(html.match(/data-quiz-content/g)?.length).toBe(1);
    });
  });

  describe("renderQuizPhaseSlots", () => {
    it("wraps thinking and fact in their respective fixed anchors", () => {
      const html = renderQuizPhaseSlots(`<div class="thinking-bar">Thinking</div>`, `<div class="fact-card"><p>Fact</p></div>`);
      expect(html).toContain('class="quiz-thinking-anchor" data-quiz-fixed="thinking"');
      expect(html).toContain('class="quiz-fact-anchor" data-quiz-fixed="fact"');
      expect(html.match(/data-quiz-fixed="thinking"/g)?.length).toBe(1);
      expect(html.match(/data-quiz-fixed="fact"/g)?.length).toBe(1);
    });
  });

  describe("active landscape layouts integration", () => {
    it.each(QUIZ_LANDSCAPE_LAYOUT_IDS)(
      "layout %s emits one question anchor and one content anchor without duplicating question in hero layers",
      (layoutId) => {
        const rendered = renderQuizLayoutBody(layoutId, dummySlots);
        expect(rendered.match(/data-quiz-fixed="question"/g)?.length).toBe(1);
        expect(rendered.match(/data-quiz-content/g)?.length).toBe(1);
        expect(rendered.match(/class="phase-region"/g)?.length).toBe(1);
        expect(rendered.match(/data-quiz-fixed="thinking"/g)?.length).toBe(1);
        expect(rendered.match(/data-quiz-fixed="fact"/g)?.length).toBe(1);
      },
    );

    it("baseline layout preserves legacy markup without unified frame anchors", () => {
      const rendered = renderQuizLayoutBody("baseline", dummySlots);
      expect(rendered).not.toContain("quiz-question-anchor");
      expect(rendered).not.toContain("data-quiz-content");
      expect(rendered).toContain("question-title");
      expect(rendered).toContain("phase-region");
    });
  });
});
