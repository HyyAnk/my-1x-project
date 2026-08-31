import { describe, expect, it } from "vitest";
import { QuizV2Schema, SandboxPreviewInputSchema, resolveQuizLayout } from "@studio/shared";
import { candyArcadeTemplate } from "../src/quiz/visual/candyArcade.js";
import { adaptProductionQuizScene } from "../src/quiz/render/scene/productionSceneAdapter.js";
import { adaptSandboxQuizScene } from "../src/quiz/render/scene/sandboxSceneAdapter.js";
import { buildQuizSceneParts } from "../src/quiz/render/scene/buildQuizSceneParts.js";
import { productionSceneStateAt } from "../src/quiz/render/scene/productionSceneStateAdapter.js";
import { SANDBOX_PHASE_BOUNDARIES, sandboxSceneState } from "../src/quiz/render/scene/sandboxSceneStateAdapter.js";

const timing = { start: 10, choicesStart: 11.2, thinkingStart: 12.5, revealStart: 17.5, rewardStart: 18.8, end: 20 };

describe("Phase 3 normalized scene model", () => {
  it("P3-MOD-01 normalizes stable choice identity, ordering, answer, text, and assets", () => {
    const model = productionModel({ assets: { "asset-sandbox-question-1-sandbox-choice-2": "./resolved-beta.png" } });
    expect(model.question).toMatchObject({ id: "sandbox-question-1", correctChoiceId: "sandbox-choice-2", text: "Choose the safe value" });
    expect(model.choices.map(({ id, order, text }) => ({ id, order, text }))).toEqual([
      { id: "sandbox-choice-1", order: 0, text: "Alpha" },
      { id: "sandbox-choice-2", order: 1, text: "Beta" },
      { id: "sandbox-choice-3", order: 2, text: "Gamma" },
    ]);
    expect(model.choices[1].media.source).toContain("resolved-beta.png");
  });

  it("P3-MOD-02 consumes the successful Phase 2 layout result by identity", () => {
    const { model, resolution } = productionModelWithResolution();
    expect(model.layout.id).toBe(resolution.layoutId);
    expect(model.layout.capability).toBe(resolution.capability);
    expect(model.layout.source).toBe("explicit");
  });

  it("P3-MOD-03 represents absent, left, and right mascot occupancy without a second anchor field", () => {
    expect(productionModel().mascot).toEqual({ occupied: false, anchor: null });
    expect(productionModel({ mascot: { occupied: true, anchor: "bottom_left" } }).mascot).toEqual({
      occupied: true,
      anchor: "bottom_left",
    });
    expect(productionModel({ mascot: { occupied: true, anchor: "bottom_right" } }).mascot).toEqual({
      occupied: true,
      anchor: "bottom_right",
    });
  });

  it("P3-MOD-04 keeps missing optional media deterministic without provider I/O", () => {
    const first = productionModel();
    const second = productionModel();
    expect(first.assets.hero).toEqual(second.assets.hero);
    expect(first.assets.hero.source).toBeNull();
    expect(first.choices.map((choice) => choice.media)).toEqual(second.choices.map((choice) => choice.media));
  });
});

describe("Phase 3 state adapters", () => {
  it("P3-ADP-01 maps every production timeline state deterministically", () => {
    expect([10, 11.2, 12.5, 17.5, 18.8].map((time) => productionSceneStateAt(timing, time).phase)).toEqual([
      "question",
      "choices",
      "thinking",
      "reveal",
      "explain",
    ]);
  });

  it("P3-ADP-02 maps every explicit Sandbox phase to the same state contract", () => {
    for (const phase of ["question", "choices", "thinking", "reveal", "explain"] as const) {
      expect(sandboxSceneState(SandboxPreviewInputSchema.parse({ phase })).phase).toBe(phase);
    }
  });

  it("P3-ADP-03 preserves exact Sandbox scrub boundaries", () => {
    const epsilon = 0.0001;
    expect(
      sandboxSceneState(SandboxPreviewInputSchema.parse({ timeline_time_seconds: SANDBOX_PHASE_BOUNDARIES.choices - epsilon })).phase,
    ).toBe("question");
    expect(sandboxSceneState(SandboxPreviewInputSchema.parse({ timeline_time_seconds: SANDBOX_PHASE_BOUNDARIES.choices })).phase).toBe(
      "choices",
    );
    expect(sandboxSceneState(SandboxPreviewInputSchema.parse({ timeline_time_seconds: SANDBOX_PHASE_BOUNDARIES.thinking })).phase).toBe(
      "thinking",
    );
    expect(sandboxSceneState(SandboxPreviewInputSchema.parse({ timeline_time_seconds: SANDBOX_PHASE_BOUNDARIES.reveal })).phase).toBe(
      "reveal",
    );
    expect(sandboxSceneState(SandboxPreviewInputSchema.parse({ timeline_time_seconds: SANDBOX_PHASE_BOUNDARIES.explain })).phase).toBe(
      "explain",
    );
  });
});

describe("Phase 3 shared semantic parts", () => {
  it("P3-PART-01 through P3-PART-04 build equivalent stable parts for matching surface inputs", () => {
    const production = productionModel({ atSeconds: timing.revealStart, mascot: { occupied: true, anchor: "bottom_left" } });
    const sandbox = sandboxModel({ phase: "reveal", mascot_position: "bottom_left", channel_brand_name: "Quiz Lab" }, true);
    const productionParts = buildQuizSceneParts(production);
    const sandboxParts = buildQuizSceneParts(sandbox);
    expect(selectStableParts(productionParts)).toEqual(selectStableParts(sandboxParts));
    expect(productionParts.mascot).toEqual(sandboxParts.mascot);
  });
});

function productionModel(
  options: {
    assets?: Record<string, string>;
    atSeconds?: number;
    mascot?: { occupied: true; anchor: "bottom_left" | "bottom_right" } | { occupied: false; anchor: null };
  } = {},
) {
  return productionModelWithResolution(options).model;
}

function productionModelWithResolution(options: Parameters<typeof productionModel>[0] = {}) {
  const question = quiz().questions[0];
  const resolution = resolveQuizLayout({
    requestedLayout: "media_left_choices_right",
    archetype: "text_multiple_choice",
    questionFormat: question.format,
    choiceCount: question.choices.length,
  });
  if (!resolution.ok) throw new Error("Expected compatible test layout");
  const visual = candyArcadeTemplate.resolveScene({
    question,
    questionIndex: 0,
    totalQuestions: 1,
    requestedPalette: "lime",
    resolvedLayoutId: resolution.layoutId,
    requestedMotion: "enter.pop",
    requestedTransition: "bubble_splash",
  });
  const model = adaptProductionQuizScene({
    question,
    questionIndex: 0,
    totalQuestions: 1,
    archetype: "text_multiple_choice",
    layoutResolution: resolution,
    visual,
    timing,
    atSeconds: options.atSeconds,
    assets: options.assets ?? {},
    aspectRatio: "16:9",
    mascot: options.mascot ?? { occupied: false, anchor: null },
    styles: { thinkingBar: "star_slider", questionBox: "candy_pop", answerCard: "glossy_arcade", counter: "hanging_woodsign" },
    channelBrandName: "Quiz Lab",
    brandVisible: Boolean(options.mascot?.occupied),
    isFinal: true,
  });
  return { model, resolution };
}

function sandboxModel(input: Record<string, unknown> = {}, mascotOccupied = false) {
  return adaptSandboxQuizScene(
    SandboxPreviewInputSchema.parse({
      question_text: "Choose the safe value",
      choices: ["Alpha", "Beta", "Gamma"],
      correct_choice_index: 1,
      question_number: 1,
      total_questions: 1,
      fact_card_text: "Beta is the canonical answer.",
      palette_id: "lime",
      ...input,
    }),
    mascotOccupied,
  );
}

function selectStableParts(parts: ReturnType<typeof buildQuizSceneParts>) {
  return {
    question: { text: parts.question.text, number: parts.question.number, accent: parts.question.paletteAccent },
    counter: parts.counter,
    hero: { source: parts.hero.source, altText: parts.hero.altText, subject: parts.hero.fallback.subject },
    choices: {
      items: parts.choices.items.map(({ id, order, text }) => ({ id, order, text })),
      correctChoiceId: parts.choices.correctChoiceId,
      phase: parts.choices.phase,
      visible: parts.choices.visible,
    },
    phase: parts.phase,
    brand: parts.brand,
  };
}

function quiz() {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "phase-3-scene",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "sandbox-question-1",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Choose the safe value",
        choices: ["Alpha", "Beta", "Gamma"].map((text, index) => ({ id: `sandbox-choice-${index + 1}`, text })),
        correct_choice_id: "sandbox-choice-2",
        explanation: "Beta is the canonical answer.",
        fun_fact: "Beta is the canonical answer.",
        source_ids: ["phase-3"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}
