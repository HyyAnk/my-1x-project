import { describe, expect, it } from "vitest";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { generateJitQuestionsWithLLM } from "../src/quiz/bank/questionJitSeeder.js";

describe("JIT producer language metadata", () => {
  it("passes the requested language to newly parsed questions", async () => {
    const client: LLMClient = {
      connect: () => Promise.resolve(),
      generateContent: () =>
        Promise.resolve({
          text: JSON.stringify([
            {
              question: "Which planet is red?",
              format: "multiple_choice",
              choices: [
                { id: "a", text: "Mars", is_correct: true },
                { id: "b", text: "Venus", is_correct: false },
                { id: "c", text: "Jupiter", is_correct: false },
              ],
              correct_choice_id: "a",
              explanation: "Mars has iron oxide.",
            },
          ]),
        }),
    };
    const questions = await generateJitQuestionsWithLLM(
      client,
      {
        topic_id: "topic-1",
        channel_id: "channel-1",
        title: "Space",
        premise: "Planets",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "high",
        generated_at: "2026-09-08T00:00:00.000Z",
        content_kind: "episode",
        question_count: 8,
        quiz_format: "knowledge",
        age_band: "family",
        visual_style: "mixed",
      },
      "deep_trivia",
      "science",
      "space",
      [2],
      "en-US",
    );
    expect(questions[0]?.language).toBe("en");
  });

  it("rejects Vietnamese before invoking the provider", async () => {
    let calls = 0;
    const client: LLMClient = {
      connect: () => Promise.resolve(),
      generateContent: () => {
        calls += 1;
        return Promise.resolve({ text: "[]" });
      },
    };

    await expect(
      generateJitQuestionsWithLLM(
        client,
        {
          topic_id: "topic-1",
          channel_id: "channel-1",
          title: "Space",
          premise: "Planets",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "high",
          generated_at: "2026-09-08T00:00:00.000Z",
          content_kind: "episode",
          question_count: 8,
          quiz_format: "knowledge",
          age_band: "family",
          visual_style: "mixed",
        },
        "deep_trivia",
        "science",
        "space",
        [2],
        "vi",
      ),
    ).rejects.toThrow(/Vietnamese generation targets are not supported/);
    expect(calls).toBe(0);
  });
});
