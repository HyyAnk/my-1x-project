import type { LLMClient } from "../../src/utils/promptSanitizer.js";

/**
 * Builds a stub LLM client whose generateContent returns the exact number of
 * valid quiz questions requested by the JIT seeder prompt. Lets route-level
 * tests exercise the confirm-topic flow without network access to a real engine.
 */
export function createStubQuizLlmClient(): LLMClient {
  return {
    connect: async () => undefined,
    generateContent: async (prompt: string) => {
      const match = /Generate exactly (\d+) high-retention questions/.exec(prompt);
      const count = match ? Number(match[1]) : 3;
      const archetypeMatch = /Archetype: "([a-z_]+)"/.exec(prompt);
      const archetypeId = archetypeMatch?.[1] ?? "deep_trivia";
      const domainMatch = /Domain: "([a-z_]+)"/.exec(prompt);
      const domainId = domainMatch?.[1] ?? "nature_animals";
      const subtopicMatch = /Subtopic: "([a-z_]+)"/.exec(prompt);
      const subtopicId = subtopicMatch?.[1] ?? "general";
      const titleMatch = /for topic: "(.+)"/.exec(prompt);
      const title = titleMatch?.[1] ?? "Test Topic";
      const questions = Array.from({ length: count }, (_, index) => ({
        archetype_id: archetypeId,
        domain_id: domainId,
        subtopic_id: subtopicId,
        question: `${title} stub question number ${index + 1}?`,
        format: "multiple_choice",
        choices: [
          { id: "A", text: `Stub answer ${index}-A`, is_correct: true },
          { id: "B", text: `Stub answer ${index}-B`, is_correct: false },
          { id: "C", text: `Stub answer ${index}-C`, is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: `Stub explanation for question ${index + 1}.`,
        fun_fact: `Stub fun fact for question ${index + 1}.`,
        visual_spec: {
          intent: "question_illustration",
          prompt: `Stub illustration for question ${index + 1}`,
          aspect_ratio: "16:9",
        },
        difficulty: Math.min(5, index + 1),
        thinking_seconds: 5,
        tags: [subtopicId, archetypeId],
      }));
      return { text: JSON.stringify(questions) };
    },
  };
}
