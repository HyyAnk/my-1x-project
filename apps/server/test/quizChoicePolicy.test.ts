import { describe, expect, it } from "vitest";
import { QuestionHistoryEntrySchema, SandboxPreviewInputSchema, SceneSchema } from "@studio/shared";
import { parseBeatsOutput } from "../src/tasks/parsers.js";

describe("system quiz choice policy", () => {
  it("rejects a fourth choice at shared API and persistence boundaries", () => {
    expect(() =>
      SandboxPreviewInputSchema.parse({
        choices: ["A", "B", "C", "D"],
        correct_choice_index: 0,
      }),
    ).toThrow();

    expect(() =>
      SceneSchema.parse({
        scene_id: "scene-1",
        episode_id: "episode-1",
        scene_number: 1,
        duration_seconds: 6,
        dialogue: "Choose one",
        visual_prompt: "A quiz scene",
        quiz: {
          phase: "question",
          question_number: 1,
          question: "Which option is correct?",
          choices: ["A", "B", "C", "D"],
          answer: "A",
          explanation: "A is correct",
        },
      }),
    ).toThrow();

    expect(() =>
      QuestionHistoryEntrySchema.parse({
        question_id: "question-1",
        question_text: "Which option is correct?",
        choices: ["A", "B", "C", "D"],
        correct_answer: "A",
        episode_id: "episode-1",
        episode_title: "Episode 1",
        channel_id: "channel-1",
        rendered_at: new Date().toISOString(),
      }),
    ).toThrow();
  });

  it("rejects four-choice AI scene output instead of truncating it", () => {
    const output = JSON.stringify([
      {
        dialogue: "Which option is correct?",
        visual_prompt: "CAMERA\nWide\nACTION\nCards appear\nLIGHTING\nBright\nATMOSPHERE\nPlayful\nCONTINUITY\nCandy palette",
        quiz: {
          phase: "question",
          question_number: 1,
          question: "Which option is correct?",
          choices: ["A", "B", "C", "D"],
          answer: "A",
          explanation: "A is correct",
        },
      },
    ]);

    expect(() => parseBeatsOutput(output)).toThrow("QUIZ_CHOICE_COUNT_INVALID");
  });
});
