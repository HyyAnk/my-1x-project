import { describe, expect, it } from "vitest";
import { ALL_QUESTION_BOX_STYLES, ALL_QUESTION_COUNTER_STYLES, ALL_THINKING_BAR_STYLES } from "@studio/shared";
import { getQuestionBoxVariant, resolveQuestionBoxVariant } from "../src/quiz/visual/elements/questionBox/registry.js";
import { getCounterBadgeVariant, resolveCounterBadgeVariant } from "../src/quiz/visual/elements/counterBadge/registry.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("QuestionBox and CounterBadge Element Registries", () => {
  it("registers all QuestionBox styles", () => {
    for (const style of ALL_QUESTION_BOX_STYLES) {
      if (style === "auto") continue;
      const variant = getQuestionBoxVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto question box to default candy_pop", () => {
    expect(resolveQuestionBoxVariant("auto").id).toBe("candy_pop");
    expect(resolveQuestionBoxVariant(null).id).toBe("candy_pop");
  });

  it("registers all CounterBadge styles", () => {
    for (const style of ALL_QUESTION_COUNTER_STYLES) {
      if (style === "auto") continue;
      const variant = getCounterBadgeVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto counter badge to default hanging_woodsign", () => {
    expect(resolveCounterBadgeVariant("auto").id).toBe("hanging_woodsign");
    expect(resolveCounterBadgeVariant(null).id).toBe("hanging_woodsign");
  });
});

describe("buildSandboxComposition Preview Engine", () => {
  it("builds a complete HTML composition for the default thinking phase", () => {
    const result = buildSandboxComposition({
      theme: "candy_arcade",
      palette_id: "sunny",
      thinking_bar_style: "capsule_liquid",
      question_box_style: "comic_bubble",
      counter_style: "neon_badge",
      phase: "thinking",
      question_text: "What is the biggest mammal on Earth?",
      choices: ["Elephant", "Blue Whale", "Giraffe"],
      correct_choice_index: 1,
      question_number: 3,
      total_questions: 10,
    });

    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain("What is the biggest mammal on Earth?");
    expect(result.html).toContain("Blue Whale");
    expect(result.html).toContain("qb-comic-bubble");
    expect(result.html).toContain("cb-neon-badge");
    expect(result.html).toContain("thinking-bar-capsule-liquid");
    expect(result.contrast_report.ok).toBe(true);
  });

  it("renders reveal and explain phases with correct answer highlights", () => {
    const revealResult = buildSandboxComposition({
      phase: "reveal",
      correct_choice_index: 2,
      choices: ["Option A", "Option B", "Option C"],
    });

    expect(revealResult.html).toContain("answer-correct");
    expect(revealResult.html).toContain("Option C");

    const explainResult = buildSandboxComposition({
      phase: "explain",
      fact_card_text: "Saturn rings are made of ice particles!",
    });
    expect(explainResult.html).toContain("sandbox-explain-card");
    expect(explainResult.html).toContain("Saturn rings are made of ice particles!");
  });

  it("rejects a fourth sandbox answer before rendering HTML", () => {
    expect(() =>
      buildSandboxComposition({
        phase: "reveal",
        correct_choice_index: 2,
        choices: ["Option A", "Option B", "Option C", "Forbidden fourth option"],
      } as never),
    ).toThrow();
  });

  it("supports rendering with all thinking bar, question box, counter, and answer card combinations without error", () => {
    for (const tb of ALL_THINKING_BAR_STYLES) {
      for (const qb of ALL_QUESTION_BOX_STYLES) {
        for (const cb of ALL_QUESTION_COUNTER_STYLES) {
          const res = buildSandboxComposition({
            thinking_bar_style: tb,
            question_box_style: qb,
            counter_style: cb,
            answer_card_style: "comic_chunky",
            layout_id: "media_left_choices_right",
          });
          expect(res.html).toBeTruthy();
          expect(res.css).toBeTruthy();
          expect(res.html).toContain("layout-media_left_choices_right");
          expect(res.html).toContain("ac-comic-chunky");
        }
      }
    }
  });

  it("supports timeline_time_seconds scrubbing", () => {
    const resQuestion = buildSandboxComposition({
      timeline_time_seconds: 0.5,
      choices: ["A", "B", "C"],
    });
    expect(resQuestion.html).toContain("opacity:0");

    const resThinking = buildSandboxComposition({
      timeline_time_seconds: 4.5,
      choices: ["A", "B", "C"],
    });
    expect(resThinking.html).toContain("opacity:1");

    const resReveal = buildSandboxComposition({
      timeline_time_seconds: 8.0,
      correct_choice_index: 1,
      choices: ["A", "B", "C"],
    });
    expect(resReveal.html).toContain("answer-correct");
  });
});
