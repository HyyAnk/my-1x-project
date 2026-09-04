import { describe, expect, it } from "vitest";
import { DirectorPlanSchema, QuizV2Schema } from "@studio/shared";
import { buildEpisodePreviewQuestions } from "./episodePreviewQuestions";

const quiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "preview-episode",
  age_band: "7-9",
  language: "Vietnamese",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 2,
      question: "Con vật nào có sọc?",
      choices: [
        { id: "a", text: "Hổ" },
        { id: "b", text: "Voi" },
        { id: "c", text: "Cá heo" },
      ],
      correct_choice_id: "a",
      explanation: "Hổ có những sọc tối màu.",
      fun_fact: "Mỗi con hổ có một bộ sọc riêng.",
      source_ids: ["source-1"],
      visual_opportunity: "Minh họa một chú hổ",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("episode preview questions", () => {
  it("uses the question's director layout and real content", () => {
    const director = DirectorPlanSchema.parse({
      schema_version: 2,
      episode_id: quiz.episode_id,
      archetype_family: "candy_arcade",
      midpoint_question_id: null,
      final_challenge_question_id: null,
      beats: [
        {
          question_id: "q1",
          archetype: "visual_multiple_choice",
          energy: "playful",
          visual_density: "focused",
          palette_id: "lime",
          layout_id: "visual_choices_three",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter"],
          asset_intents: [],
          mascot_state: null,
          sfx_intents: [],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ],
    });

    expect(buildEpisodePreviewQuestions(quiz, director)).toEqual([
      expect.objectContaining({
        id: "q1",
        text: "Con vật nào có sọc?",
        choices: ["Hổ", "Voi", "Cá heo"],
        correctChoiceIndex: 0,
        layoutId: "visual_choices_three",
        layoutSource: "director",
      }),
    ]);
  });

  it("marks format-based layout resolution as inferred without a director plan", () => {
    expect(buildEpisodePreviewQuestions(quiz, null)[0]).toEqual(
      expect.objectContaining({ layoutId: "media_left_choices_right", layoutSource: "inferred" }),
    );
  });

  it("builds a topic template preview question matching the episode format when quiz is not generated", () => {
    const episodeOddOneOut = {
      episode_id: "ep-odd-1",
      topic: { title: "Find the odd animal", premise: "Identify the unique species", hook: "Can you spot it?" },
      quiz_config: {
        quiz_format: "odd_one_out" as const,
        question_count: 8,
      },
    } as any;

    const questions = buildEpisodePreviewQuestions(null, null, episodeOddOneOut);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toEqual(
      expect.objectContaining({
        layoutId: "visual_choices_three_pure",
        layoutSource: "topic_template",
        choices: ["Option A", "Option B", "Option C"],
      }),
    );
  });

  it("builds a 2-choice topic template preview question for true_false format", () => {
    const episodeTrueFalse = {
      episode_id: "ep-tf-1",
      topic: { title: "Is Pluto a planet?", premise: "Solar system facts", hook: "True or False?" },
      quiz_config: {
        quiz_format: "true_false" as const,
        question_count: 5,
      },
    } as any;

    const questions = buildEpisodePreviewQuestions(null, null, episodeTrueFalse);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toEqual(
      expect.objectContaining({
        layoutId: "verdict_true_false",
        layoutSource: "topic_template",
        choices: ["True", "False"],
        correctChoiceIndex: 0,
      }),
    );
  });

  it("returns an empty array when both quiz and episode are null", () => {
    expect(buildEpisodePreviewQuestions(null, null, null)).toEqual([]);
  });
});
