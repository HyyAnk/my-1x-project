import { describe, expect, it } from "vitest";
import { projectThumbnailChoices } from "../src/quiz/thumbnail/thumbnailQuestionProjection.js";
import { loadEpisodeQuestions } from "../src/quiz/thumbnail/thumbnailLoaders.js";
import type { RepositoryService } from "../src/repository.js";

describe("thumbnail question projection", () => {
  it("keeps candidate text and resolves structured choice IDs", () => {
    expect(
      projectThumbnailChoices(
        [
          { id: "c-a", text: "Eye" },
          { id: "c-b", text: "Ear" },
        ],
        "c-b",
      ),
    ).toEqual({ choices: ["Eye", "Ear"], answer: "Ear" });
  });
  it("does not shift legacy answer indexes when malformed choices are removed", () => {
    expect(projectThumbnailChoices([null, "Eye", 42, "Ear"], "3")).toEqual({ choices: ["Eye", "Ear"], answer: "Ear" });
  });
  it("still loads the quiz when compiled scenes are missing", async () => {
    const repository = {
      readScenes: async () => {
        throw new Error("Missing scenes");
      },
      readQuiz: async () => ({
        questions: [{ question: "Which organ helps you hear?", choices: [{ id: "c-a", text: "Ear" }], correct_choice_id: "c-a" }],
      }),
    } as unknown as RepositoryService;
    expect(await loadEpisodeQuestions(repository, "channel", "episode")).toEqual([
      { question: "Which organ helps you hear?", choices: ["Ear"], answer: "Ear" },
    ]);
  });
});
