import { createRequire } from "node:module";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { BankQuestion, BankQuestionWithCooldown, BankSubtopicBatch, QuizV2 } from "@studio/shared";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import {
  annotateHighlightPhrases,
  completeHighlightPhrases,
  parseHighlightAnnotationOutput,
  runHighlightBackfill,
  summarizeHighlightCoverage,
  type HighlightBackfillRepository,
} from "../src/quiz/bank/highlight/index.js";
import { bankQuestionToRow, rowToBankQuestion, type BankQuestionRow } from "../src/repository/quiz/bank/bankSqliteMapper.js";
import { upgradeBankQuestionColumns } from "../src/repository/quiz/bank/bankSqliteSchemaUpgrades.js";
import { synthesizeScenesFromQuiz } from "../src/quiz/domain/quizArtifactSynthesizer.js";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };

function makeQuestion(id: string, question: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id,
    archetype_id: "deep_trivia",
    domain_id: "food",
    subtopic_id: "drinks",
    language: "en",
    question,
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Tea leaves", is_correct: true },
      { id: "B", text: "Coffee beans", is_correct: false },
      { id: "C", text: "Cocoa beans", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Iced tea is brewed tea served cold.",
    fun_fact: "",
    age_band: "family",
    difficulty: 2,
    tags: [],
    status: "approved",
    ...overrides,
  };
}

/** Fake LLM that answers each highlight prompt with the phrases its `respond` callback picks. */
function fakeLlm(respond: (prompt: string, call: number) => Record<string, string> | string): { client: LLMClient; prompts: string[] } {
  const prompts: string[] = [];
  const client: LLMClient = {
    connect: () => Promise.resolve(),
    generateContent: (prompt: string) => {
      prompts.push(prompt);
      const reply = respond(prompt, prompts.length);
      return Promise.resolve({ text: typeof reply === "string" ? reply : JSON.stringify(reply) });
    },
  };
  return { client, prompts };
}

describe("highlight annotation output parsing", () => {
  it("keeps only phrases that are whole-word spans of their own question", () => {
    const subjects = [makeQuestion("Q1", "Which drink is Iced tea brewed from?"), makeQuestion("Q2", "Does steam rise?")];
    const parsed = parseHighlightAnnotationOutput('```json\n{"Q1": "iced tea", "Q2": "tea"}\n```', subjects);
    expect([...parsed]).toEqual([["Q1", "Iced tea"]]);
  });

  it("returns an empty map for unparseable output", () => {
    expect(parseHighlightAnnotationOutput("not json", [makeQuestion("Q1", "Which drink?")]).size).toBe(0);
  });
});

describe("highlight annotation service", () => {
  it("only sends questions without a valid phrase and retries the ones the model missed", async () => {
    const valid = makeQuestion("Q-OK", "Which drink is Iced tea brewed from?", { highlight_phrase: "Iced tea" });
    const missing = makeQuestion("Q-NEW", "Which black hole is closest to Earth?");
    const { client, prompts } = fakeLlm((_prompt, call) => (call === 1 ? {} : { "Q-NEW": "black hole" }));

    const result = await annotateHighlightPhrases([valid, missing], { llmClient: client });

    expect(prompts).toHaveLength(2);
    expect(prompts[0]).not.toContain("Q-OK");
    expect(result.questions.map((question) => question.highlight_phrase)).toEqual(["Iced tea", "black hole"]);
    expect(result.unresolvedIds).toEqual([]);
  });

  it("re-validates a stale phrase left behind by a rewritten question", async () => {
    const rewritten = makeQuestion("Q1", "Which cold drink is brewed from leaves?", { highlight_phrase: "Iced tea" });
    const { client } = fakeLlm(() => ({ Q1: "cold drink" }));
    const [completed] = await completeHighlightPhrases([rewritten], { llmClient: client });
    expect(completed.highlight_phrase).toBe("cold drink");
  });

  it("drops a stale phrase without calling a model when no LLM client is available", async () => {
    const rewritten = makeQuestion("Q1", "Which cold drink is brewed from leaves?", { highlight_phrase: "Iced tea" });
    const [completed] = await completeHighlightPhrases([rewritten], { llmClient: null });
    expect(completed.highlight_phrase).toBeUndefined();
  });
});

function fakeRepository(questions: BankQuestion[]) {
  const stored = new Map(questions.map((question) => [question.id, question]));
  const saved: BankQuestion[] = [];
  const repository: HighlightBackfillRepository = {
    readQuestionBankSnapshot: () =>
      Promise.resolve({ batches: [{ questions: [...stored.values()] } as unknown as BankSubtopicBatch] }),
    getQuestionBankQuestion: (id) => Promise.resolve((stored.get(id) as BankQuestionWithCooldown | undefined) ?? null),
    saveQuestionBankQuestion: (question) => {
      saved.push(question);
      stored.set(question.id, question);
      return Promise.resolve(question);
    },
  };
  return { repository, stored, saved };
}

describe("highlight backfill", () => {
  it("annotates every active question that lacks a phrase and skips archived ones", async () => {
    const { repository, saved } = fakeRepository([
      makeQuestion("Q1", "Which drink is Iced tea brewed from?"),
      makeQuestion("Q2", "Which black hole is closest to Earth?", { highlight_phrase: "black hole" }),
      makeQuestion("Q3", "Which planet has rings?", { status: "archived" }),
    ]);
    const { client } = fakeLlm(() => ({ Q1: "Iced tea", Q3: "rings" }));

    const report = await runHighlightBackfill(repository, { llmClient: client });

    expect(report).toMatchObject({ total: 1, processed: 1, annotated: 1, unresolved: 0, skippedStale: 0, saveFailures: 0 });
    expect(saved.map((question) => [question.id, question.highlight_phrase])).toEqual([["Q1", "Iced tea"]]);
  });

  it("never overwrites a question edited while the run was in flight", async () => {
    const { repository, stored, saved } = fakeRepository([makeQuestion("Q1", "Which drink is Iced tea brewed from?")]);
    const { client } = fakeLlm(() => {
      stored.set("Q1", makeQuestion("Q1", "Which hot drink is brewed from leaves?"));
      return { Q1: "Iced tea" };
    });

    const report = await runHighlightBackfill(repository, { llmClient: client });

    expect(report.skippedStale).toBe(1);
    expect(saved).toEqual([]);
  });

  it("reports coverage over active questions only", () => {
    const coverage = summarizeHighlightCoverage([
      makeQuestion("Q1", "Which drink is Iced tea?", { highlight_phrase: "Iced tea" }),
      makeQuestion("Q2", "Which planet has rings?"),
    ]);
    expect(coverage).toEqual({ total: 2, withPhrase: 1, missing: 1 });
  });
});

describe("highlight phrase storage", () => {
  it("round-trips through a SQLite row", () => {
    const row = bankQuestionToRow(makeQuestion("Q1", "Which drink is Iced tea?", { highlight_phrase: "Iced tea" }));
    expect(row.highlight_phrase).toBe("Iced tea");
    expect(rowToBankQuestion(row as BankQuestionRow).highlight_phrase).toBe("Iced tea");
  });

  it("adds the column to an old database and clears the JSON sync ledger so rows get re-imported", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE bank_questions (id TEXT PRIMARY KEY, question TEXT NOT NULL);");
    db.exec("CREATE TABLE bank_json_sync (file_path TEXT PRIMARY KEY, mtime_ms REAL NOT NULL, file_size INTEGER NOT NULL);");
    db.exec("INSERT INTO bank_json_sync VALUES ('a.json', 1, 1);");

    upgradeBankQuestionColumns(db);
    upgradeBankQuestionColumns(db);

    const columns = (db.prepare("PRAGMA table_info(bank_questions);").all() as Array<{ name: string }>).map((column) => column.name);
    expect(columns).toContain("highlight_phrase");
    expect(db.prepare("SELECT COUNT(*) AS count FROM bank_json_sync;").get()).toEqual({ count: 0 });
  });
});

describe("Episode scene round trip", () => {
  it("keeps the highlight phrase when an Episode quiz is rebuilt from its scenes", () => {
    const quiz: QuizV2 = {
      schema_version: 2,
      episode_id: "ep-1",
      age_band: "family",
      language: "en",
      questions: [
        {
          id: "question-01",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which drink is Iced tea brewed from?",
          highlight_phrase: "Iced tea",
          answer_mode: "choice_selection",
          choices: [
            { id: "choice-a", text: "Tea leaves" },
            { id: "choice-b", text: "Coffee beans" },
            { id: "choice-c", text: "Cocoa beans" },
          ],
          correct_choice_id: "choice-a",
          explanation: "Iced tea is brewed tea served cold.",
          fun_fact: "",
          source_ids: ["C01"],
          visual_opportunity: "A tall glass of iced tea",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ],
    };
    const rebuilt = deriveQuizV2FromScenes({
      episodeId: quiz.episode_id,
      language: quiz.language,
      ageBand: quiz.age_band,
      format: "multiple_choice",
      scenes: synthesizeScenesFromQuiz(quiz),
    });
    expect(rebuilt.questions[0].highlight_phrase).toBe("Iced tea");
  });
});
