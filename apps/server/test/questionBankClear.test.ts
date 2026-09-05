import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RepositoryService } from "../src/repository/service.js";
import type { BankQuestion, BankSubtopicBatch } from "@studio/shared";

describe("Question Bank Clear All Operation", () => {
  let tempDir: string;
  let repo: RepositoryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qb-clear-test-"));
    repo = new RepositoryService(tempDir, tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("clears all batches and resets index while preserving taxonomy", async () => {
    const bankDir = path.join(tempDir, ".quiz-studio", "question_bank");
    const subtopicDir = path.join(bankDir, "deep_trivia", "science_tech");
    await mkdir(subtopicDir, { recursive: true });

    // 1. Create a dummy taxonomy.json
    const taxonomyData = {
      schema_version: 2,
      updated_at: new Date().toISOString(),
      domains: [{ id: "science_tech", title: "Science & Technology", description: "Tech", icon: "Cpu", subtopics: [] }],
    };
    await writeFile(path.join(bankDir, "taxonomy.json"), JSON.stringify(taxonomyData, null, 2), "utf8");

    // 2. Create sample batch
    const sampleQuestion: BankQuestion = {
      id: "CLR-001",
      archetype_id: "deep_trivia",
      domain_id: "science_tech",
      subtopic_id: "astronomy",
      format: "multiple_choice",
      question: "Which star system is nearest to Earth?",
      correct_choice_id: "A",
      difficulty: 2,
      target_age: "teen",
      choices: [
        { id: "A", text: "Alpha Centauri", is_correct: true },
        { id: "B", text: "Sirius", is_correct: false },
        { id: "C", text: "Betelgeuse", is_correct: false },
      ],
      explanation: "Alpha Centauri is the closest star system.",
      content: {
        en: {
          question_prompt: "Which star system is nearest to Earth?",
          choices: [
            { id: "A", text: "Alpha Centauri", is_correct: true },
            { id: "B", text: "Sirius", is_correct: false },
            { id: "C", text: "Betelgeuse", is_correct: false },
          ],
          explanation: "Alpha Centauri is nearest.",
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const batch: BankSubtopicBatch = {
      archetype_id: "deep_trivia",
      domain_id: "science_tech",
      subtopic_id: "astronomy",
      subtopic_title: "Astronomy",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      questions: [sampleQuestion],
    };
    await writeFile(path.join(subtopicDir, "astronomy.json"), JSON.stringify(batch, null, 2), "utf8");

    // Recalculate index
    const recalculated = await repo.recalculateQuestionBankIndex();
    expect(recalculated.current_total).toBe(1);

    const queriedBefore = await repo.queryQuestionBankQuestions();
    expect(queriedBefore.total).toBe(1);

    // 3. Clear question bank
    const result = await repo.clearQuestionBank();
    expect(result.cleared_batches_count).toBeGreaterThanOrEqual(1);

    // 4. Verify questions and index are cleared
    const queriedAfter = await repo.queryQuestionBankQuestions();
    expect(queriedAfter.total).toBe(0);
    expect(queriedAfter.questions).toHaveLength(0);

    const indexAfter = await repo.readQuestionBankIndex();
    expect(indexAfter.current_total).toBe(0);
    expect(indexAfter.by_archetype).toEqual({});

    // 5. Verify taxonomy is preserved
    const taxonomyRaw = await readFile(path.join(bankDir, "taxonomy.json"), "utf8");
    const preservedTaxonomy = JSON.parse(taxonomyRaw);
    expect(preservedTaxonomy.domains[0].id).toBe("science_tech");
  });
});
