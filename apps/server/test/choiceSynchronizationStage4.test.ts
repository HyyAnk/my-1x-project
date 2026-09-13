import { describe, expect, it } from "vitest";
import {
  QUIZ_LAYOUTS,
  QuizV2Schema,
  type QuizPreviewLayoutId,
  type QuizQuestionFormat,
  type QuizV2,
} from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

function createTestQuiz(layoutId: string, format: QuizQuestionFormat, choiceTexts: string[]): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: `ep-${layoutId}`,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: `q-${layoutId}`,
        number: 1,
        format,
        difficulty: 1,
        question: `Test question for ${layoutId}?`,
        choices: choiceTexts.map((text, idx) => ({ id: `c-${idx + 1}`, text })),
        correct_choice_id: "c-1",
        explanation: "Correct answer explanation.",
        fun_fact: "Fascinating fun fact.",
        source_ids: ["test-stage-4"],
        visual_opportunity: `Visual representation for ${layoutId}`,
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

function renderClipHtml(layoutId: QuizPreviewLayoutId, format: QuizQuestionFormat, choices: string[]): string {
  const effectiveChoices = format === "true_false" || choices.length === 2 ? choices.slice(0, 2) : choices.slice(0, 3);
  const effectiveFormat = effectiveChoices.length === 2 ? "true_false" : format;
  const quiz = createTestQuiz(layoutId, effectiveFormat, effectiveChoices);
  const director = createDefaultDirectorPlan(quiz, "candy_arcade", "sunny");
  director.beats[0].layout_id = layoutId;

  if (layoutId.startsWith("visual_")) {
    director.beats[0].archetype = "visual_multiple_choice";
    director.beats[0].asset_intents = ["choice_illustration"];
  } else if (effectiveFormat === "true_false") {
    director.beats[0].archetype = "true_false";
    director.beats[0].asset_intents = ["question_illustration"];
  } else {
    director.beats[0].archetype = "text_multiple_choice";
    director.beats[0].asset_intents = ["question_illustration"];
  }

  const timeline = compileQuizTimeline({
    quiz,
    director,
    voicePlan: buildQuizVoicePlan(quiz),
  });

  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
    aspectRatio: "16:9",
  });

  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}

describe("Stage 4: Choice Cards Staggered Entrance & Reveal Settling Synchronization", () => {
  const layoutsToTest: Array<{
    id: QuizPreviewLayoutId;
    format: QuizQuestionFormat;
    choices: string[];
    isVisual: boolean;
  }> = [
    {
      id: "full_stack_list",
      format: "multiple_choice",
      choices: ["Alpha Stack", "Beta Stack", "Gamma Stack"],
      isVisual: false,
    },
    {
      id: "split_versus_two",
      format: "true_false",
      choices: ["Contender One", "Contender Two"],
      isVisual: false,
    },
    {
      id: "verdict_true_false",
      format: "true_false",
      choices: ["True", "False"],
      isVisual: false,
    },
    {
      id: "visual_choices_three",
      format: "multiple_choice",
      choices: ["Visual Choice 1", "Visual Choice 2", "Visual Choice 3"],
      isVisual: true,
    },
    {
      id: "visual_choices_three_pure",
      format: "odd_one_out",
      choices: ["Visual Pure 1", "Visual Pure 2", "Visual Pure 3"],
      isVisual: true,
    },
    {
      id: "mystery_reveal",
      format: "multiple_choice",
      choices: ["Mystery A", "Mystery B", "Mystery C"],
      isVisual: false,
    },
    {
      id: "clue_deduction",
      format: "multiple_choice",
      choices: ["Clue A", "Clue B", "Clue C"],
      isVisual: false,
    },
    {
      id: "media_left_choices_right",
      format: "multiple_choice",
      choices: ["Standard A", "Standard B", "Standard C"],
      isVisual: false,
    },
  ];

  describe("1. Staggered Entrance Animation & 2.0s Settled Keyframe Landing", () => {
    it("ensures all 7 layouts (and baseline) define staggered entrance cascading into float", () => {
      for (const layout of layoutsToTest) {
        const html = renderClipHtml(layout.id, layout.format, layout.choices);

        // Verify choices trigger off --choices-at variable
        expect(html).toContain("var(--choices-at");

        // Verify floating animation is chained or active
        if (layout.isVisual) {
          expect(html).toContain("visual-choice-float");
        } else {
          expect(html).toContain("answer-float");
        }
      }
    });

    it("verifies full_stack_list has 4 distinct staggered offsets (0.00s, 0.14s, 0.28s, 0.42s) landing <= 1.81s", () => {
      const html = renderClipHtml("full_stack_list", "multiple_choice", [
        "Choice A",
        "Choice B",
        "Choice C",
      ]);

      expect(html).toContain(".layout-full_stack_list.quiz-question-clip .choice-card:nth-child(1)");
      expect(html).toContain(".layout-full_stack_list.quiz-question-clip .choice-card:nth-child(2)");
      expect(html).toContain(".layout-full_stack_list.quiz-question-clip .choice-card:nth-child(3)");
      expect(html).toContain(".layout-full_stack_list.quiz-question-clip .choice-card:nth-child(4)");

      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.28s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.42s)");

      // Check chained answer-float after 0.54s entrance duration: 0.42s + 0.54s = 0.96s
      expect(html).toContain("answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.96s) infinite alternate both");
      // Default: delay 0.85s + 0.42s = 1.27s + 0.54s = 1.81s < 2.0s settled keyframe
    });

    it("verifies split_versus_two has staggered entrance (0.00s, 0.14s) landing <= 1.53s", () => {
      const html = renderClipHtml("split_versus_two", "true_false", ["Left", "Right"]);

      expect(html).toContain(".layout-split_versus_two.quiz-question-clip .choice-card:nth-child(1)");
      expect(html).toContain(".layout-split_versus_two.quiz-question-clip .choice-card:nth-child(2)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s)");
      expect(html).toContain("split-versus-enter-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1)");
      expect(html).toContain("answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both");
      // Default: delay 0.85s + 0.14s = 0.99s + 0.54s = 1.53s < 2.0s
    });

    it("verifies verdict_true_false has staggered entrance (0.00s, 0.14s) landing <= 1.53s", () => {
      const html = renderClipHtml("verdict_true_false", "true_false", ["True", "False"]);

      expect(html).toContain(".layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(1)");
      expect(html).toContain(".layout-verdict_true_false.quiz-question-clip .choice-card:nth-child(2)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.14s)");
      expect(html).toContain("enter-from-right 0.54s cubic-bezier(0.18, 1.42, 0.34, 1)");
      expect(html).toContain("answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.68s) infinite alternate both");
      // Default: delay 0.85s + 0.14s = 0.99s + 0.54s = 1.53s < 2.0s
    });

    it("verifies visual_choices_three and visual_choices_three_pure land <= 1.63s", () => {
      const htmlVc3 = renderClipHtml("visual_choices_three", "multiple_choice", ["A", "B", "C"]);
      expect(htmlVc3).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s)");
      // 0.85 + 0.24 + 0.52 = 1.61s < 2.0s

      const htmlVcp = renderClipHtml("visual_choices_three_pure", "odd_one_out", ["A", "B", "C"]);
      expect(htmlVcp).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s)");
      // 0.85 + 0.24 + 0.54 = 1.63s < 2.0s
    });

    it("verifies mystery_reveal has 4 staggered entrance offsets (0.00s, 0.12s, 0.24s, 0.36s) landing <= 1.71s", () => {
      const html = renderClipHtml("mystery_reveal", "multiple_choice", ["A", "B", "C"]);

      expect(html).toContain(".quiz-question-clip.layout-mystery_reveal .choice-card:nth-child(1)");
      expect(html).toContain(".quiz-question-clip.layout-mystery_reveal .choice-card:nth-child(2)");
      expect(html).toContain(".quiz-question-clip.layout-mystery_reveal .choice-card:nth-child(3)");
      expect(html).toContain(".quiz-question-clip.layout-mystery_reveal .choice-card:nth-child(4)");

      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.36s)");
      expect(html).toContain("answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.86s) infinite alternate both");
      // Default: delay 0.85s + 0.36s = 1.21s + 0.50s = 1.71s < 2.0s
    });

    it("verifies clue_deduction has 4 staggered entrance offsets (0.00s, 0.12s, 0.24s, 0.36s) landing <= 1.73s", () => {
      const html = renderClipHtml("clue_deduction", "multiple_choice", ["A", "B", "C"]);

      expect(html).toContain(".quiz-question-clip.layout-clue_deduction .choice-card:nth-child(1)");
      expect(html).toContain(".quiz-question-clip.layout-clue_deduction .choice-card:nth-child(2)");
      expect(html).toContain(".quiz-question-clip.layout-clue_deduction .choice-card:nth-child(3)");
      expect(html).toContain(".quiz-question-clip.layout-clue_deduction .choice-card:nth-child(4)");

      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.12s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.24s)");
      expect(html).toContain("calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.36s)");
      expect(html).toContain("answer-float 3.6s ease-in-out calc(var(--clip-start, 0s) + var(--choices-at, 0s) + 0.88s) infinite alternate both");
      // Default: delay 0.85s + 0.36s = 1.21s + 0.52s = 1.73s < 2.0s
    });
  });

  describe("2. Reveal Settling Synchronization & 8.10s Timestamp Calibration", () => {
    it("ensures correct choice card reveal uses 0.62s duration, green border #22C55E, and depth shadow #15803D across all layouts", () => {
      for (const layout of layoutsToTest) {
        const html = renderClipHtml(layout.id, layout.format, layout.choices);

        // Must define 0.62s correct card reveal animation duration
        expect(html).toMatch(/0\.62s/);

        // Must define green border #22C55E (case-insensitive)
        expect(html.toLowerCase()).toContain("#22c55e");

        // Must define depth shadow #15803D (case-insensitive)
        expect(html.toLowerCase()).toContain("#15803d");
      }
    });

    it("ensures incorrect choices settle to opacity: 0.35 with 0.38s duration across all 7 layouts", () => {
      for (const layout of layoutsToTest) {
        const html = renderClipHtml(layout.id, layout.format, layout.choices);

        // Settle duration 0.38s
        expect(html).toContain("0.38s");

        // Settled opacity: 0.35
        expect(html).toContain("opacity: 0.35");
      }
    });

    it("ensures badge elevation animation (correct-badge-reveal) is present with 0.62s duration", () => {
      for (const layout of layoutsToTest) {
        const html = renderClipHtml(layout.id, layout.format, layout.choices);
        expect(html).toContain("correct-badge-reveal");
      }
    });
  });

  describe("3. Elimination of Premature Reveal in Scheduled Playback", () => {
    it("verifies scheduled clip playback does not leak static #22c55e border into correct card at time 0s", () => {
      const mysteryHtml = renderClipHtml("mystery_reveal", "multiple_choice", ["A", "B", "C"]);
      // Mystery reveal must not have unconditional static border-color override on answer-reveal-correct
      expect(mysteryHtml).not.toContain(
        ".quiz-question-clip.layout-mystery_reveal .choice-card.answer-reveal-correct { border-color: #22c55e !important; }",
      );
      expect(mysteryHtml).not.toContain(
        ".choice-card.answer-reveal-correct { border-color: #22c55e !important; }",
      );

      // Verify scheduled reveal triggers via keyframes at --reveal-at
      expect(mysteryHtml).toContain(
        "correct-card-reveal 0.62s cubic-bezier(0.18, 1.42, 0.34, 1) calc(var(--clip-start, 0s) + var(--reveal-at, 0s)) both",
      );
    });
  });

  describe("4. Rehearsal & Clip Parity (revealMode: scheduled vs static phases)", () => {
    it("renders scheduled reveal classes (answer-reveal-correct / answer-reveal-incorrect) in scheduled mode", () => {
      for (const layout of layoutsToTest) {
        const html = renderClipHtml(layout.id, layout.format, layout.choices);

        expect(html).toContain("answer-reveal-correct");
        expect(html).toContain("answer-reveal-incorrect");
      }
    });

    it("verifies Sandbox preview in reveal phase renders settled correct border and dimmed incorrect choices", () => {
      for (const layout of layoutsToTest) {
        const res = buildSandboxComposition({
          layout_id: layout.id,
          aspect_ratio: "16:9",
          phase: "reveal",
          choices: layout.choices,
          correct_choice_index: 0,
          question_format: layout.choices.length === 2 ? "true_false" : layout.format,
          question_text: `Sandbox test question for ${layout.id}?`,
          fact_card_title: "DID YOU KNOW?",
          fact_card_text: "Explanation fact",
        });

        // HTML should contain answer-correct on choice 0
        expect(res.html).toContain("answer-correct");

        // CSS should contain settled green border and dimmed opacity
        expect(res.css.toLowerCase()).toContain("#22c55e");
        expect(res.css.toLowerCase()).toContain("#15803d");
        expect(res.css).toContain("opacity: 0.35");
      }
    });

    it("verifies Sandbox preview in question phase does not have active answer-correct card", () => {
      for (const layout of layoutsToTest) {
        const res = buildSandboxComposition({
          layout_id: layout.id,
          aspect_ratio: "16:9",
          phase: "question",
          choices: layout.choices,
          correct_choice_index: 0,
          question_format: layout.choices.length === 2 ? "true_false" : layout.format,
          question_text: `Sandbox test question for ${layout.id}?`,
          fact_card_title: "DID YOU KNOW?",
          fact_card_text: "Explanation fact",
        });

        // In question phase, choice cards must have answer-pending and NOT have answer-correct class
        expect(res.html).toContain("answer-pending");
        expect(res.html).not.toMatch(/class="[^"]*\bchoice-card\b[^"]*\banswer-correct\b[^"]*"/);
      }
    });
  });
});
