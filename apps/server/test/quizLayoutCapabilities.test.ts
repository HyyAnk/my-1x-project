import { describe, expect, it } from "vitest";
import {
  evaluateQuizLayoutCompatibility,
  getQuizPreviewLayoutCapability,
  QUIZ_LAYOUT_CATALOG,
  QUIZ_LAYOUTS,
  QuizLayoutIdSchema,
  QuizPreviewLayoutIdSchema,
  QuizV2Schema,
  ResolvedQuizLayoutIdSchema,
  resolveQuizLayout,
  SandboxPreviewInputSchema,
} from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { validateDirectorPlan } from "../src/quiz/director/validateDirectorPlan.js";
import { assessQuizVisualLayout } from "../src/quiz/qa/visualQa.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

describe("Phase 2 layout capability catalog", () => {
  it("P2-CAT-01, P2-CAT-04, and P2-MIG-01 keep persisted IDs exhaustive and capabilities complete", () => {
    expect(Object.keys(QUIZ_LAYOUT_CATALOG).sort()).toEqual([...ResolvedQuizLayoutIdSchema.options].sort());
    expect(QUIZ_LAYOUTS.map((layout) => layout.id).sort()).toEqual([...ResolvedQuizLayoutIdSchema.options].sort());
    expect(QuizLayoutIdSchema.parse("auto")).toBe("auto");

    for (const layout of QUIZ_LAYOUTS) {
      expect(layout.supportedPresentations.length).toBeGreaterThan(0);
      expect(layout.supportedChoiceCounts.length).toBeGreaterThan(0);
      expect(layout.supportedFormats.length).toBeGreaterThan(0);
      expect(layout.recommendedFormats.every((format) => layout.supportedFormats.includes(format))).toBe(true);
      expect(layout.media.required.every((media) => layout.media.supported.includes(media))).toBe(true);
      expect(layout.supportedAspectRatios).toEqual(["16:9", "9:16"]);
      expect(layout.metrics.render.width).toBeGreaterThan(0);
      expect(layout.metrics.render.height).toBeGreaterThan(0);
      expect(layout.metrics.render.itemCount).toBeGreaterThan(0);
      if (layout.media.supported.length > 0) {
        expect(Object.values(layout.metrics.assets).length).toBeGreaterThan(0);
      }
    }
  });

  it("P2-CAT-05 keeps baseline preview-only", () => {
    expect(QuizPreviewLayoutIdSchema.parse("baseline")).toBe("baseline");
    expect(ResolvedQuizLayoutIdSchema.safeParse("baseline").success).toBe(false);
    expect(Object.keys(QUIZ_LAYOUT_CATALOG)).not.toContain("baseline");
    expect(getQuizPreviewLayoutCapability("baseline").metrics.render).toEqual({ width: 800, height: 284, itemCount: 1 });
  });
});

describe("Phase 2 layout resolution policy", () => {
  it("P2-RES-01 and P2-MIG-02 preserve ordinary auto resolution", () => {
    expect(resolveAuto("text_multiple_choice", "multiple_choice", 3)).toMatchObject({
      ok: true,
      layoutId: "media_left_choices_right",
    });
    expect(resolveAuto("true_false", "true_false", 2)).toMatchObject({ ok: true, layoutId: "media_left_choices_right" });
  });

  it("P2-RES-02 preserves visual and odd-one-out auto resolution", () => {
    expect(resolveAuto("visual_multiple_choice", "multiple_choice", 3)).toMatchObject({ ok: true, layoutId: "visual_choices_three" });
    expect(resolveAuto("text_multiple_choice", "odd_one_out", 3)).toMatchObject({ ok: true, layoutId: "visual_choices_three" });
  });

  it("P2-RES-03 treats supported-but-not-recommended explicit formats as valid", () => {
    const result = resolveQuizLayout({
      requestedLayout: "visual_choices_three",
      archetype: "visual_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
    });
    expect(result).toMatchObject({ ok: true, source: "explicit", layoutId: "visual_choices_three" });
    expect(QUIZ_LAYOUT_CATALOG.visual_choices_three.recommendedFormats).not.toContain("multiple_choice");
  });

  it("P2-RES-04 returns a structured count incompatibility without fallback", () => {
    const result = resolveQuizLayout({
      requestedLayout: "visual_choices_three",
      archetype: "true_false",
      questionFormat: "true_false",
      choiceCount: 2,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.requestedLayout).toBe("visual_choices_three");
    expect(result.issues.map((issue) => issue.code)).toContain("layout_choice_count_unsupported");
  });

  it("P2-RES-05 identifies format and presentation capabilities independently", () => {
    const formatResult = evaluateQuizLayoutCompatibility({
      layoutId: "visual_choices_three",
      choicePresentation: "visual",
      choiceCount: 3,
      questionFormat: "true_false",
      aspectRatio: "16:9",
      media: ["choice"],
    });
    const presentationResult = evaluateQuizLayoutCompatibility({
      layoutId: "visual_choices_three",
      choicePresentation: "text",
      choiceCount: 3,
      questionFormat: "multiple_choice",
      aspectRatio: "16:9",
      media: ["choice"],
    });
    expect(formatResult.compatible || formatResult.issues.map((issue) => issue.code)).toContain("layout_question_format_unsupported");
    expect(presentationResult.compatible || presentationResult.issues.map((issue) => issue.code)).toContain(
      "layout_choice_presentation_unsupported",
    );
  });

  it("P2-RES-06 returns typed unsupported and required-media reasons", () => {
    const result = evaluateQuizLayoutCompatibility({
      layoutId: "media_left_choices_right",
      choicePresentation: "text",
      choiceCount: 3,
      questionFormat: "multiple_choice",
      aspectRatio: "9:16",
      media: ["choice"],
    });
    expect(result.compatible).toBe(false);
    if (result.compatible) return;
    expect(result.issues.map((issue) => issue.code)).toEqual(["layout_media_unsupported", "layout_required_media_missing"]);
  });

  it("P2-RES-07 and P2-MIG-04 return no candidate for four choices while the domain still rejects them", () => {
    const result = resolveAuto("text_multiple_choice", "multiple_choice", 4);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.code)).toEqual(["layout_no_compatible_candidate"]);
    expect(() => QuizV2Schema.parse(quizInput("multiple_choice", 4))).toThrow();
  });
});

describe("Phase 2 validation consumers", () => {
  it("P2-INT-01 and P2-INT-02 surface stable Director and QA issue codes", () => {
    const quiz = QuizV2Schema.parse(quizInput("true_false", 2));
    const plan = createDefaultDirectorPlan(quiz);
    const incompatible = { ...plan, beats: plan.beats.map((beat) => ({ ...beat, layout_id: "visual_choices_three" as const })) };
    const directorIssues = validateDirectorPlan(quiz, incompatible).issues;
    const qaIssues = assessQuizVisualLayout({ quiz, director: incompatible });

    expect(directorIssues.some((issue) => issue.code === "director_layout_choice_count_unsupported" && issue.next_action.length > 0)).toBe(
      true,
    );
    expect(qaIssues.some((issue) => issue.code === "qa_layout_choice_count_unsupported" && issue.stage === "layout")).toBe(true);
  });

  it("P2-INT-04 rejects incompatible Sandbox combinations but preserves baseline compatibility", () => {
    const incompatible = SandboxPreviewInputSchema.safeParse({ layout_id: "visual_choices_three", choices: ["True", "False"] });
    expect(incompatible.success).toBe(false);
    if (!incompatible.success) expect(incompatible.error.message).toContain("layout_choice_count_unsupported");
    expect(SandboxPreviewInputSchema.safeParse({ layout_id: "baseline", choices: ["True", "False"] }).success).toBe(true);
  });

  it("P2-INT-06 composes both production renderer layouts", () => {
    const quiz = QuizV2Schema.parse(quizInput("multiple_choice", 3));
    const mediaPlan = createDefaultDirectorPlan(quiz);
    const visualPlan = {
      ...mediaPlan,
      beats: mediaPlan.beats.map((beat) => ({
        ...beat,
        archetype: "visual_multiple_choice" as const,
        layout_id: "visual_choices_three" as const,
        asset_intents: ["choice_illustration" as const],
      })),
    };

    expect(compositionSource(quiz, mediaPlan)).toContain("layout-media_left_choices_right");
    expect(compositionSource(quiz, visualPlan)).toContain("layout-visual_choices_three");
  });
});

function resolveAuto(
  archetype: Parameters<typeof resolveQuizLayout>[0]["archetype"],
  questionFormat: "multiple_choice" | "true_false" | "odd_one_out",
  choiceCount: number,
) {
  return resolveQuizLayout({ requestedLayout: "auto", archetype, questionFormat, choiceCount });
}

function quizInput(format: "multiple_choice" | "true_false", choiceCount: number) {
  const choices = ["Alpha", "Beta", "Gamma", "Delta"].slice(0, choiceCount).map((text, index) => ({
    id: `choice-${index + 1}`,
    text,
  }));
  return {
    schema_version: 2,
    episode_id: "phase-2-layout",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "question-1",
        number: 1,
        format,
        difficulty: 1,
        question: "Which option is correct?",
        choices,
        correct_choice_id: "choice-1",
        explanation: "Alpha is correct.",
        fun_fact: "",
        source_ids: ["phase-2"],
        visual_opportunity: "A clear child-safe illustration",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  };
}

function compositionSource(quiz: ReturnType<typeof QuizV2Schema.parse>, director: ReturnType<typeof createDefaultDirectorPlan>) {
  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan });
  const bundle = buildCandyArcadeCompositionBundle({
    quiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
  });
  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}
