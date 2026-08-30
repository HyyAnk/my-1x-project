import { describe, expect, it } from "vitest";
import {
  BUILT_IN_PRESETS,
  CHANNEL_BRAND_NAME_FALLBACK,
  CHANNEL_BRAND_NAME_MAX_LENGTH,
  DirectorPlanSchema,
  EpisodeSchema,
  EpisodeSettingsInputSchema,
  findBuiltInPresetById,
  matchVisualPreset,
  QuizAssessmentSchema,
  QuizConfigSchema,
  QuizTimelineSchema,
  QuizV2Schema,
  resolveChannelBrandName,
  SandboxPreviewInputSchema,
} from "@studio/shared";

const choice = (id: string, text: string) => ({ id, text });

const validQuiz = () =>
  QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "episode-1",
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q1",
        number: 1,
        format: "multiple_choice",
        difficulty: 2,
        question: "Which animal has stripes?",
        choices: [choice("a", "Tiger"), choice("b", "Elephant"), choice("c", "Dolphin")],
        correct_choice_id: "a",
        explanation: "Tigers have dark stripes across their fur.",
        fun_fact: "No two tigers have exactly the same stripe pattern.",
        source_ids: ["C01"],
        visual_opportunity: "Show a friendly tiger illustration",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });

describe("Quiz V2 shared schemas", () => {
  it("accepts a valid canonical quiz", () => {
    expect(validQuiz().questions[0].correct_choice_id).toBe("a");
  });

  it("accepts the 50-question production ceiling", () => {
    const question = validQuiz().questions[0];
    const quiz = QuizV2Schema.parse({
      ...validQuiz(),
      questions: Array.from({ length: 50 }, (_, index) => ({
        ...question,
        id: `q${index + 1}`,
        number: index + 1,
        source_ids: [`C${String(index + 1).padStart(2, "0")}`],
      })),
    });
    const beat = {
      question_id: "q1",
      archetype: "text_multiple_choice" as const,
      energy: "curious" as const,
      visual_density: "focused" as const,
      thinking_seconds: 5,
      beat_intents: ["thinking" as const],
      asset_intents: [],
      mascot_state: null,
      sfx_intents: [],
      transition_intent: "cut" as const,
      reward_intensity: "small" as const,
    };
    const director = DirectorPlanSchema.parse({
      schema_version: 2,
      episode_id: "episode-1",
      archetype_family: "quiz",
      beats: Array.from({ length: 50 }, (_, index) => ({ ...beat, question_id: `q${index + 1}` })),
    });
    expect(quiz.questions).toHaveLength(50);
    expect(director.beats).toHaveLength(50);
  });

  it("rejects a canonical answer that is not visible", () => {
    expect(() => QuizV2Schema.parse({ ...validQuiz(), questions: [{ ...validQuiz().questions[0], correct_choice_id: "z" }] })).toThrow(
      "Canonical answer must reference a visible choice",
    );
  });

  it("rejects duplicate choice IDs and normalized choice text", () => {
    const question = validQuiz().questions[0];
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [{ ...question, choices: [choice("a", "Tiger"), choice("a", "Lion"), choice("c", " tiger ")] }],
      }),
    ).toThrow(/duplicated|unique after normalization/);
  });

  it("requires exactly 3 choices for standard quiz questions", () => {
    const question = validQuiz().questions[0];
    // 4 choices (A, B, C, D) should be rejected
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [{ ...question, choices: [choice("a", "Tiger"), choice("b", "Lion"), choice("c", "Cheetah"), choice("d", "Leopard")] }],
      }),
    ).toThrow();

    // 1 choice should be rejected
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [{ ...question, choices: [choice("a", "Tiger")] }],
      }),
    ).toThrow();

    // 2 choices (A, B) should be rejected for a standard quiz
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [{ ...question, choices: [choice("a", "Tiger"), choice("b", "Lion")] }],
      }),
    ).toThrow("Quiz questions require exactly three choices");

    // 3 choices (A, B, C) should be accepted
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [{ ...question, choices: [choice("a", "Tiger"), choice("b", "Lion"), choice("c", "Cheetah")] }],
      }),
    ).not.toThrow();
  });

  it("requires exactly 2 choices for true or false questions", () => {
    const question = validQuiz().questions[0];
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [{ ...question, format: "true_false", choices: [choice("a", "True"), choice("b", "False")], correct_choice_id: "a" }],
      }),
    ).not.toThrow();
    expect(() =>
      QuizV2Schema.parse({
        ...validQuiz(),
        questions: [
          {
            ...question,
            format: "true_false",
            choices: [choice("a", "True"), choice("b", "False"), choice("c", "Neither")],
            correct_choice_id: "a",
          },
        ],
      }),
    ).toThrow("True or false questions require exactly two choices");
  });

  it("rejects duplicate or non-sequential question identity", () => {
    const question = validQuiz().questions[0];
    expect(() => QuizV2Schema.parse({ ...validQuiz(), questions: [question, { ...question, id: "q2", number: 3 }] })).toThrow(
      "Question numbers must be sequential",
    );
  });

  it("rejects unsupported director archetypes and invalid timeline events", () => {
    expect(() =>
      DirectorPlanSchema.parse({
        schema_version: 2,
        episode_id: "episode-1",
        archetype_family: "quiz",
        beats: [
          {
            question_id: "q1",
            archetype: "not_supported",
            energy: "curious",
            visual_density: "focused",
            thinking_seconds: 5,
            beat_intents: ["thinking"],
            asset_intents: [],
            mascot_state: null,
            sfx_intents: [],
            transition_intent: "cut",
            reward_intensity: "small",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      QuizTimelineSchema.parse({
        schema_version: 2,
        episode_id: "episode-1",
        duration_seconds: 2,
        events: [
          {
            event_id: "e1",
            type: "not_supported",
            at_seconds: 0,
            duration_seconds: 0,
            question_id: null,
            choice_id: null,
            segment_id: null,
            payload: {},
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects scores outside the production range", () => {
    expect(() =>
      QuizAssessmentSchema.parse({
        schema_version: 2,
        episode_id: "episode-1",
        assessed_at: new Date().toISOString(),
        score: 101,
        rating: "production_ready",
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        issues: [],
      }),
    ).toThrow();
  });

  it("accepts the optional Candy Arcade visual assessment only within its 100 point rubric", () => {
    expect(() =>
      QuizAssessmentSchema.parse({
        schema_version: 2,
        episode_id: "episode-1",
        assessed_at: new Date().toISOString(),
        score: 90,
        rating: "production_ready",
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        candy_arcade_visual: {
          pacing: 20,
          hierarchy: 15,
          asset_consistency: 15,
          motion: 15,
          reveal: 10,
          transition: 10,
          readability: 10,
          visual_variety: 5,
          total: 100,
        },
        issues: [],
      }),
    ).not.toThrow();
    expect(() =>
      QuizAssessmentSchema.parse({
        schema_version: 2,
        episode_id: "episode-1",
        assessed_at: new Date().toISOString(),
        score: 90,
        rating: "production_ready",
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        candy_arcade_visual: {
          pacing: 21,
          hierarchy: 15,
          asset_consistency: 15,
          motion: 15,
          reveal: 10,
          transition: 10,
          readability: 10,
          visual_variety: 5,
          total: 101,
        },
        issues: [],
      }),
    ).toThrow();
  });

  describe("QuizConfigSchema & EpisodeSettingsInputSchema Visual Properties", () => {
    it("parses QuizConfigSchema with new visual styling properties and defaults", () => {
      const config = QuizConfigSchema.parse({});
      expect(config.thinking_bar_style).toBe("auto");
      expect(config.question_box_style).toBe("auto");
      expect(config.question_counter_style).toBe("auto");
      expect(config.answer_card_style).toBe("auto");
      expect(config.palette_id).toBe("auto");
      expect(config.style_preset_id).toBe("auto");
    });

    it("parses explicit visual configuration in QuizConfigSchema", () => {
      const config = QuizConfigSchema.parse({
        question_box_style: "glass_morphism",
        answer_card_style: "glass_neon",
        question_counter_style: "neon_badge",
        thinking_bar_style: "energy_laser",
        palette_id: "purple",
        style_preset_id: "preset_cyber_neon",
      });
      expect(config.question_box_style).toBe("glass_morphism");
      expect(config.answer_card_style).toBe("glass_neon");
      expect(config.question_counter_style).toBe("neon_badge");
      expect(config.thinking_bar_style).toBe("energy_laser");
      expect(config.palette_id).toBe("purple");
      expect(config.style_preset_id).toBe("preset_cyber_neon");
    });

    it("validates EpisodeSettingsInputSchema with new visual properties", () => {
      const input = EpisodeSettingsInputSchema.parse({
        question_box_style: "comic_bubble",
        answer_card_style: "comic_chunky",
        question_counter_style: "floating_balloon",
        thinking_bar_style: "flame_fuse",
        palette_id: "sunny",
        style_preset_id: "preset_comic_boom",
      });
      expect(input.question_box_style).toBe("comic_bubble");
      expect(input.answer_card_style).toBe("comic_chunky");
      expect(input.palette_id).toBe("sunny");
      expect(input.style_preset_id).toBe("preset_comic_boom");
    });
  });

  describe("Master Presets Library (@studio/shared)", () => {
    it("contains all 6 built-in presets with full definitions", () => {
      expect(BUILT_IN_PRESETS.length).toBe(6);
      for (const preset of BUILT_IN_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.icon).toBeTruthy();
        expect(preset.theme).toBe("candy_arcade");
        expect(preset.palette_id).toBeTruthy();
        expect(preset.question_box_style).toBeTruthy();
        expect(preset.answer_card_style).toBeTruthy();
        expect(preset.counter_style).toBeTruthy();
        expect(preset.thinking_bar_style).toBeTruthy();
      }
    });

    it("finds built-in preset by id", () => {
      const arcade = findBuiltInPresetById("preset_arcade_classic");
      expect(arcade).toBeDefined();
      expect(arcade?.name).toBe("Arcade Pop Master");
      expect(arcade?.palette_id).toBe("lime");

      const cyber = findBuiltInPresetById("preset_cyber_neon");
      expect(cyber).toBeDefined();
      expect(cyber?.thinking_bar_style).toBe("energy_laser");

      const pastel = findBuiltInPresetById("preset_pastel_dream");
      expect(pastel).toBeDefined();
      expect(pastel?.name).toBe("Sweet Pastel Pop");
      expect(pastel?.palette_id).toBe("pink");

      // Backward-compatible alias
      const legacy = findBuiltInPresetById("preset_visual_showcase");
      expect(legacy).toBeDefined();
      expect(legacy?.id).toBe("preset_pastel_dream");
    });

    it("matches presets based on partial or full configuration regardless of layout", () => {
      const matched = matchVisualPreset({
        palette_id: "purple",
        layout_id: "visual_choices_three",
        question_box_style: "glass_morphism",
        answer_card_style: "glass_neon",
        thinking_bar_style: "energy_laser",
        counter_style: "neon_badge",
      });
      expect(matched?.id).toBe("preset_cyber_neon");
    });
  });

  describe("Channel Brand Mark Contracts & Helpers (@studio/shared)", () => {
    it("exports standard branding constants", () => {
      expect(CHANNEL_BRAND_NAME_MAX_LENGTH).toBe(32);
      expect(CHANNEL_BRAND_NAME_FALLBACK).toBe("Channel");
    });

    it("parses QuizConfigSchema with default channel_brand_name as empty string", () => {
      const config = QuizConfigSchema.parse({});
      expect(config.channel_brand_name).toBe("");
    });

    it("parses legacy episode JSON lacking channel_brand_name backward-compatibly", () => {
      const parsed = EpisodeSchema.parse({
        episode_id: "ep_legacy_1",
        channel_id: "ch_legacy_1",
        slug: "legacy-quiz",
        topic: { title: "Legacy", premise: "Test", hook: "Hook" },
        stage: "SELECTED",
        script_path: "script.md",
        scene_plan_path: "scene_plan.md",
        dialogue_script_path: "dialogue.md",
        video_prompts_path: "prompts.md",
        quiz_config: {
          question_count: 8,
          quiz_format: "knowledge",
          age_band: "7-9",
          answer_mode: "voice_and_reveal",
          visual_theme: "candy_arcade",
          visual_style: "pixar_3d",
          resolved_visual_style: "pixar_3d",
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      expect(parsed.quiz_config.channel_brand_name).toBe("");
    });

    it("trims whitespace from channel_brand_name in QuizConfigSchema", () => {
      const config = QuizConfigSchema.parse({ channel_brand_name: "   Tino Quiz   " });
      expect(config.channel_brand_name).toBe("Tino Quiz");
    });

    it("accepts exactly 32 characters in QuizConfigSchema", () => {
      const exactly32 = "A".repeat(32);
      const config = QuizConfigSchema.parse({ channel_brand_name: exactly32 });
      expect(config.channel_brand_name).toBe(exactly32);
    });

    it("rejects channel_brand_name longer than 32 characters with structured validation error", () => {
      const tooLong = "A".repeat(33);
      expect(() => QuizConfigSchema.parse({ channel_brand_name: tooLong })).toThrow();
    });

    it("validates EpisodeSettingsInputSchema with channel_brand_name and max length", () => {
      const valid = EpisodeSettingsInputSchema.parse({ channel_brand_name: "  Robot World  " });
      expect(valid.channel_brand_name).toBe("Robot World");

      const tooLong = "B".repeat(33);
      expect(() => EpisodeSettingsInputSchema.parse({ channel_brand_name: tooLong })).toThrow();
    });

    it("parses SandboxPreviewInputSchema with channel_brand_name defaulting to empty string", () => {
      const input = SandboxPreviewInputSchema.parse({});
      expect(input.channel_brand_name).toBe("");

      const custom = SandboxPreviewInputSchema.parse({ channel_brand_name: "  Jurassic World  " });
      expect(custom.channel_brand_name).toBe("Jurassic World");

      const tooLong = "C".repeat(33);
      expect(() => SandboxPreviewInputSchema.parse({ channel_brand_name: tooLong })).toThrow();
    });

    it("resolves brand name in order: episode override -> channel name -> fallback", () => {
      // 1. Episode override is present
      expect(resolveChannelBrandName("Tino", "My Main Channel")).toBe("Tino");
      expect(resolveChannelBrandName("  Mingy  ", "My Main Channel")).toBe("Mingy");

      // 2. Episode override is empty/whitespace/null/undefined -> fall back to channel name
      expect(resolveChannelBrandName("", "Kiddo World")).toBe("Kiddo World");
      expect(resolveChannelBrandName("   ", "Kiddo World")).toBe("Kiddo World");
      expect(resolveChannelBrandName(null, "Kiddo World")).toBe("Kiddo World");
      expect(resolveChannelBrandName(undefined, "Kiddo World")).toBe("Kiddo World");

      // 3. Both override and channel name are empty/whitespace/null/undefined -> fall back to "Channel"
      expect(resolveChannelBrandName("", "")).toBe("Channel");
      expect(resolveChannelBrandName("   ", "   ")).toBe("Channel");
      expect(resolveChannelBrandName(null, null)).toBe("Channel");
      expect(resolveChannelBrandName(undefined, undefined)).toBe("Channel");
    });
  });
});
