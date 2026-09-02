import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES, QuizV2Schema, type QuizAnswerCardStyle } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

describe("Phase 3 cross-surface scene pipeline", () => {
  it("P3-PAR-01 and P3-PAR-03 preserve text-scene answer identity through both public entry points", () => {
    const production = productionSource("text");
    const sandbox = buildSandboxComposition({
      phase: "reveal",
      question_text: "Which option is canonical?",
      choices: ["Alpha", "Beta", "Gamma"],
      correct_choice_index: 1,
      layout_id: "media_left_choices_right",
    }).html;
    expect(production).toContain("layout-media_left_choices_right");
    expect(production).toContain("answer-reveal-correct");
    expect(production).toContain("Beta");
    expect(sandbox).toContain("layout-media_left_choices_right");
    expect(sandbox).toContain("answer-correct");
    expect(sandbox).toContain("Beta");
  });

  it("P3-PAR-02 preserves visual-scene answer identity through both public entry points", () => {
    const production = productionSource("visual");
    const sandbox = buildSandboxComposition({
      phase: "reveal",
      question_text: "Which option is canonical?",
      choices: ["Alpha", "Beta", "Gamma"],
      correct_choice_index: 1,
      layout_id: "visual_choices_three",
    }).html;
    expect(production).toContain("layout-visual_choices_three");
    expect(production).toContain("visual-answer-card");
    expect(production).toContain("answer-reveal-correct");
    expect(production).not.toContain('data-answer-state="correct"');
    expect(production).toContain("Beta");
    expect(sandbox).toContain("layout-visual_choices_three");
    expect(sandbox).toContain("visual-answer-card");
    expect(sandbox).toContain('data-answer-state="correct"');
    expect(sandbox).toContain("Beta");
  });

  it("P4-SUR-01 and P4-SKIN-03 apply every registered skin through production text and visual compositions", () => {
    for (const style of ALL_ANSWER_CARD_STYLES) {
      for (const presentation of ["text", "visual"] as const) {
        const production = productionSource(presentation, "16:9", undefined, undefined, style);
        expect(production).toContain(`data-choice-skin="${style}"`);
        expect(production).toContain(`ac-${style.replaceAll("_", "-")}`);
      }
    }
  });

  it("P4-SUR-03 emits matching reveal labels and states through production and Sandbox", () => {
    const production = productionSource("visual");
    const sandbox = buildSandboxComposition({
      phase: "reveal",
      choices: ["Alpha", "Beta", "Gamma"],
      correct_choice_index: 1,
      layout_id: "visual_choices_three",
    }).html;
    expect(choiceSemantics(production)).toEqual([
      { label: "A", state: "pending" },
      { label: "B", state: "pending" },
      { label: "C", state: "pending" },
    ]);
    expect(choiceRevealTargets(production)).toEqual(choiceSemantics(sandbox));
  });

  it("P3-PAR-04 propagates 16:9 and 9:16 through production and Sandbox", () => {
    for (const aspectRatio of ["16:9", "9:16"] as const) {
      expect(productionSource("text", aspectRatio)).toContain(`data-aspect-ratio="${aspectRatio}"`);
      expect(buildSandboxComposition({ aspect_ratio: aspectRatio }).html).toContain(`data-aspect-ratio="${aspectRatio}"`);
    }
  });

  it("P3-PAR-05 escapes untrusted question and choice text on both surfaces", () => {
    const unsafeQuestion = "Choose <script>alert('q')</script>";
    const unsafeChoice = "<img src=x onerror=alert('c')>";
    const production = productionSource("text", "16:9", unsafeQuestion, unsafeChoice);
    const sandbox = buildSandboxComposition({
      phase: "reveal",
      question_text: unsafeQuestion,
      choices: [unsafeChoice, "Beta", "Gamma"],
    }).html;
    for (const html of [production, sandbox]) {
      expect(html).not.toContain("<script>alert");
      expect(html).not.toContain("<img src=x onerror");
      expect(html).toContain("&lt;");
    }
  });

  it("P3-PART-02 and P3-MOD-04 retain deterministic missing-media fallbacks", () => {
    const productionA = productionSource("visual");
    const productionB = productionSource("visual");
    const sandboxA = buildSandboxComposition({ layout_id: "visual_choices_three" }).html;
    const sandboxB = buildSandboxComposition({ layout_id: "visual_choices_three" }).html;
    expect(productionA).toBe(productionB);
    expect(sandboxA).toBe(sandboxB);
    expect(productionA).toContain("data:image/svg+xml;base64,");
    expect(sandboxA).toContain("data:image/svg+xml;base64,");
  });

  it("P3-PART-05 keeps reward visibility timeline-owned in production", () => {
    const production = productionSource("text");
    expect(production).toContain("--reward-at:");
    expect(production).toContain('class="reward-fx reward-big"');
    expect(production).not.toContain('class="reward-fx reward-big" style="opacity: 1;"');
    expect(buildSandboxComposition({ phase: "reveal" }).html).toContain('class="reward-fx reward-big" style="opacity: 1;');
  });

  it("P3-MIG-03 still rejects four choices before scene construction", () => {
    expect(() => buildSandboxComposition({ choices: ["A", "B", "C", "D"] } as never)).toThrow();
    expect(() => QuizV2Schema.parse(quizInput("Question", "A", 4))).toThrow();
  });

  it("P3-MIG-04 preserves current auto/default element style output", () => {
    const sandbox = buildSandboxComposition({}).html;
    expect(sandbox).toContain("qb-candy-pop");
    expect(sandbox).toContain("cb-hanging-woodsign");
    expect(sandbox).toContain("thinking-bar-star-slider");
    expect(sandbox).toContain("ac-glossy-arcade");
  });
});

function productionSource(
  presentation: "text" | "visual",
  aspectRatio: "16:9" | "9:16" = "16:9",
  questionText = "Which option is canonical?",
  firstChoice = "Alpha",
  answerCardStyle?: QuizAnswerCardStyle,
): string {
  const quiz = QuizV2Schema.parse(quizInput(questionText, firstChoice, 3));
  const director = createDefaultDirectorPlan(quiz);
  if (presentation === "visual") {
    director.beats[0] = {
      ...director.beats[0],
      archetype: "visual_multiple_choice",
      layout_id: "visual_choices_three",
      asset_intents: ["choice_illustration"],
    };
  }
  director.beats[0].answer_card_style = answerCardStyle;
  const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
    aspectRatio,
  });
  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}

function choiceSemantics(html: string) {
  return [...html.matchAll(/data-choice-label="([A-Z])" data-answer-state="(pending|correct|incorrect)"/g)].map((match) => ({
    label: match[1],
    state: match[2],
  }));
}

function choiceRevealTargets(html: string) {
  return [...html.matchAll(/<div class="([^"]*)"[^>]*data-choice-label="([A-Z])"/g)].map((match) => ({
    label: match[2],
    state: match[1].includes("answer-reveal-correct")
      ? "correct"
      : match[1].includes("answer-reveal-incorrect")
        ? "incorrect"
        : "pending",
  }));
}

function quizInput(questionText: string, firstChoice: string, choiceCount: number) {
  const choices = [firstChoice, "Beta", "Gamma", "Delta"].slice(0, choiceCount).map((text, index) => ({
    id: `choice-${index + 1}`,
    text,
  }));
  return {
    schema_version: 2,
    episode_id: "phase-3-pipeline",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "question-1",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: questionText,
        choices,
        correct_choice_id: "choice-2",
        explanation: "Beta is canonical.",
        fun_fact: "Beta is canonical.",
        source_ids: ["phase-3"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  };
}
