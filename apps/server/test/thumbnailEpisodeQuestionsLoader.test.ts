import { describe, expect, it, vi } from "vitest";
import { loadEpisodeQuestions } from "../src/quiz/thumbnail/thumbnailLoaders.js";
import type { RepositoryService } from "../src/repository.js";

describe("loadEpisodeQuestions", () => {
  it("loads questions from compiled scene data when available", async () => {
    const mockRepo = {
      readScenes: vi.fn().mockResolvedValue([
        {
          quiz: {
            question: "Who is the Norse god of thunder?",
            choices: ["Thor", "Loki", "Odin", "Freyr"],
            answer: "Thor",
          },
        },
        {
          quiz: {
            question: "What is the realm of the Norse gods called?",
            choices: ["Asgard", "Midgard", "Jotunheim", "Niflheim"],
            answer: "Asgard",
          },
        },
      ]),
      readQuiz: vi.fn(),
    } as unknown as RepositoryService;

    const result = await loadEpisodeQuestions(mockRepo, "ch1", "ep1");
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe("Who is the Norse god of thunder?");
    expect(result[0].choices).toEqual(["Thor", "Loki", "Odin", "Freyr"]);
    expect(result[0].answer).toBe("Thor");
    expect(mockRepo.readQuiz).not.toHaveBeenCalled();
  });

  it("falls back to reading quiz file when scenes have no questions yet", async () => {
    const mockRepo = {
      readScenes: vi.fn().mockResolvedValue([]),
      readQuiz: vi.fn().mockResolvedValue({
        questions: [
          {
            question: "Which weapon is wielded by Thor?",
            choices: ["Mjolnir", "Gungnir", "Excalibur", "Trident"],
            correct_choice_id: "0",
          },
          {
            question: "Who is the ruler of Asgard?",
            choices: ["Thor", "Odin", "Baldr", "Heimdall"],
            correct_choice_id: "1",
          },
        ],
      }),
    } as unknown as RepositoryService;

    const result = await loadEpisodeQuestions(mockRepo, "ch1", "ep1");
    expect(result).toHaveLength(2);
    expect(result[0].question).toBe("Which weapon is wielded by Thor?");
    expect(result[0].choices).toEqual(["Mjolnir", "Gungnir", "Excalibur", "Trident"]);
    expect(result[0].answer).toBe("Mjolnir");
    expect(result[1].question).toBe("Who is the ruler of Asgard?");
    expect(result[1].answer).toBe("Odin");
  });

  it("returns empty array safely when both scenes and quiz are missing", async () => {
    const mockRepo = {
      readScenes: vi.fn().mockRejectedValue(new Error("Scenes not found")),
      readQuiz: vi.fn().mockRejectedValue(new Error("Quiz not found")),
    } as unknown as RepositoryService;

    const result = await loadEpisodeQuestions(mockRepo, "ch1", "ep1");
    expect(result).toEqual([]);
  });
});
