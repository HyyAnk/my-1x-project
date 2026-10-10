import { vi } from "vitest";
import type { Channel, Episode, QuizV2 } from "@studio/shared";
import type { LLMClient } from "../../src/utils/promptSanitizer.js";

const TIMESTAMP = "2026-10-01T00:00:00.000Z";

export const metadataChannel: Channel = {
  channel_id: "channel-1",
  slug: "quiz-master",
  display_name: "Quiz Master US",
  description: "An engaging general knowledge quiz channel",
  target_audience: "Families and students",
  language: "English",
  country: "US",
  market: "United States",
  channel_dna_path: "channels/quiz-master/channel_dna.md",
  style_guide_path: null,
  status: "ACTIVE",
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  episode_count: 5,
  voice_reference_path: null,
  group_id: "quiz",
  engine: "quiz",
  selected_styles: ["pixar_3d"],
  default_thinking_bar_style: "auto",
  default_question_box_style: "auto",
  default_answer_card_style: "auto",
  default_counter_style: "auto",
  default_background_style: "auto",
  default_palette_id: "auto",
  mascot_id: null,
  mascot_config: { enabled: true, position: "bottom_left", scale: 1.0 },
};

export const metadataEpisode: Episode = {
  episode_id: "ep-01",
  channel_id: "channel-1",
  slug: "ep-01-world-wonders",
  topic: {
    title: "Ancient Wonders of the World",
    premise: "A knowledge challenge about the ancient wonders",
    hook: "Do you know which wonder still stands today?",
  },
  stage: "SCRIPT_READY",
  script_path: "channels/quiz-master/episodes/ep-01-world-wonders/script.md",
  research_path: null,
  treatment_path: null,
  visual_bible_path: null,
  scene_plan_path: "scene_plan.md",
  dialogue_script_path: "dialogue_script.md",
  video_prompts_path: "video_prompts.md",
  target_duration_minutes: 8,
  target_word_count: 1050,
  narration_asset_path: null,
  narration_generated_at: null,
  narration_duration_seconds: null,
  narration_segment_count: 0,
  measured_narration_words_per_second: null,
  quiz_config: {
    question_count: 8,
    quiz_format: "multiple_choice",
    age_band: "family",
    answer_mode: "voice_and_reveal",
    visual_theme: "candy_arcade",
    visual_style: "pixar_3d",
    resolved_visual_style: "pixar_3d",
    thinking_bar_style: "auto",
    question_counter_style: "auto",
    question_box_style: "auto",
    answer_card_style: "auto",
    background_style: "auto",
    palette_id: "auto",
    channel_brand_name: "Quiz Master",
  },
  video_asset_path: null,
  video_generated_at: null,
  video_duration_seconds: null,
  render_manifest_path: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
};

export const metadataQuiz: QuizV2 = {
  schema_version: 2,
  episode_id: "ep-01",
  age_band: "family",
  language: "English",
  questions: [
    {
      id: "q-01",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "In which country is the Great Pyramid of Giza?",
      choices: [
        { id: "choice-a", text: "Egypt" },
        { id: "choice-b", text: "Greece" },
        { id: "choice-c", text: "Rome" },
      ],
      correct_choice_id: "choice-a",
      explanation: "The Great Pyramid of Giza stands in Egypt.",
      fun_fact: "It took more than 20 years to build.",
      source_ids: ["src-1"],
      visual_opportunity: "The Great Pyramid of Giza towering over the desert",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q-02",
      number: 2,
      format: "multiple_choice",
      difficulty: 2,
      question: "In which modern country were the Hanging Gardens of Babylon said to be?",
      choices: [
        { id: "choice-a", text: "Iraq" },
        { id: "choice-b", text: "Iran" },
        { id: "choice-c", text: "Turkey" },
      ],
      correct_choice_id: "choice-a",
      explanation: "The Hanging Gardens of Babylon stood in present-day Iraq.",
      fun_fact: "They were built by King Nebuchadnezzar II.",
      source_ids: ["src-2"],
      visual_opportunity: "Lush green terraced gardens in the middle of the desert",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
};

/** Builds an LLM client that answers each prompt with the next scripted response (the last one repeats). */
export function createScriptedLlmClient(responses: string[]) {
  const prompts: string[] = [];
  const generateContent = vi.fn(async (prompt: string) => {
    prompts.push(prompt);
    return responses[Math.min(prompts.length - 1, responses.length - 1)];
  });
  const client = { connect: async () => undefined, generateContent } as unknown as LLMClient;
  return { client, prompts, generateContent };
}
