import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerBuildRoutes } from "../src/routes/questionBank/buildRoutes.js";
import { registerCrudRoutes } from "../src/routes/questionBank/crudRoutes.js";

describe("Question Bank English-only write boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retires the Bank transcreation endpoint before repository or provider work", async () => {
    const repository = {
      getQuestionBankQuestion: vi.fn(),
      saveQuestionBankTranslation: vi.fn(),
    };
    const llmClient = { connect: vi.fn() };
    const server = Fastify();
    registerBuildRoutes(server, { repository: repository as never, llmClient });
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/api/question-bank/legacy-question/transcreate",
      payload: { target_language: "es" },
    });

    expect(response.statusCode).toBe(410);
    expect(response.json()).toMatchObject({ code: "BANK_TRANSCREATION_RETIRED" });
    expect(repository.getQuestionBankQuestion).not.toHaveBeenCalled();
    expect(repository.saveQuestionBankTranslation).not.toHaveBeenCalled();
    expect(llmClient.connect).not.toHaveBeenCalled();
    await server.close();
  });

  it("rejects a CRUD write without explicit English metadata", async () => {
    const repository = { saveQuestionBankQuestion: vi.fn() };
    const server = Fastify();
    registerCrudRoutes(server, { repository: repository as never });
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/api/question-bank/questions",
      payload: {
        id: "foreign-write",
        archetype_id: "speed_blitz",
        domain_id: "logic_puzzles",
        subtopic_id: "tricky_riddles",
        question: "Which answer is correct?",
        format: "multiple_choice",
        choices: [
          { id: "A", text: "Correct", is_correct: true },
          { id: "B", text: "Wrong", is_correct: false },
          { id: "C", text: "Other", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "The first answer is correct.",
        status: "approved",
        language: "fr",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "BANK_ENGLISH_ONLY" });
    expect(repository.saveQuestionBankQuestion).not.toHaveBeenCalled();
    await server.close();
  });
});
