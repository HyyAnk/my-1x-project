import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import { applyKidAudienceBankMigration, planKidAudienceBankMigration } from "../src/quiz/bank/maintenance/kidAudienceBankMigration.js";
import { applyKidAudienceReviewToRows } from "../src/quiz/bank/maintenance/kidAudienceSqliteRows.js";
import { bankQuestionToRow } from "../src/repository/quiz/bank/bankSqliteMapper.js";

function makeQuestion(id: string, overrides: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id,
    archetype_id: "deep_trivia",
    domain_id: "nature_animals",
    subtopic_id: "ocean_giants",
    language: "en",
    question: "Which animal is the biggest in the sea?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Blue Whale", is_correct: true },
      { id: "B", text: "Shark", is_correct: false },
      { id: "C", text: "Squid", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "The blue whale is the biggest. It is longer than a bus.",
    fun_fact: "",
    age_band: "family",
    difficulty: 2,
    tags: [],
    status: "approved",
    ...overrides,
  };
}

const unsafe = makeQuestion("Q-UNSAFE", { fun_fact: "Sailors once paid the whale hunters in rum and whiskey." });
const safe = makeQuestion("Q-SAFE");

// Vite cannot resolve "node:sqlite" as an ESM import, so load it the same way the bank engine does.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (path: string) => SqliteDatabase };

let bankRoot = "";

async function seedBank(): Promise<string> {
  bankRoot = await mkdtemp(path.join(os.tmpdir(), "kid-audience-"));
  const batchDir = path.join(bankRoot, "deep_trivia", "nature_animals");
  await mkdir(batchDir, { recursive: true });
  const batch = {
    archetype_id: "deep_trivia",
    domain_id: "nature_animals",
    subtopic_id: "ocean_giants",
    subtopic_title: "Ocean Giants",
    questions: [safe, unsafe],
  };
  await writeFile(path.join(batchDir, "ocean_giants.json"), JSON.stringify(batch));
  return path.join(batchDir, "ocean_giants.json");
}

afterEach(async () => {
  if (bankRoot) await rm(bankRoot, { recursive: true, force: true });
});

describe("kid audience bank migration", () => {
  it("plans without writing, then archives unsafe questions and re-measures the rest with a backup", async () => {
    const batchPath = await seedBank();
    const original = await readFile(batchPath, "utf8");
    const plan = await planKidAudienceBankMigration(bankRoot);
    expect(plan.totalQuestions).toBe(2);
    expect(plan.hiddenByCategory).toEqual({ alcohol: 1 });
    expect(await readFile(batchPath, "utf8")).toBe(original);

    const backupDir = path.join(bankRoot, "..", `${path.basename(bankRoot)}-backup`);
    await applyKidAudienceBankMigration(plan, backupDir);
    const written = JSON.parse(await readFile(batchPath, "utf8")) as { questions: BankQuestion[] };
    const byId = new Map(written.questions.map((question) => [question.id, question]));
    expect(byId.get("Q-UNSAFE")?.status).toBe("archived");
    expect(byId.get("Q-SAFE")?.status).toBe("approved");
    expect(byId.get("Q-SAFE")?.age_band).not.toBe("family");
    expect(existsSync(path.join(backupDir, "deep_trivia", "nature_animals", "ocean_giants.json"))).toBe(true);
    await rm(backupDir, { recursive: true, force: true });
  });

  it("updates SQLite rows, including rows without a batch file", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE bank_questions (
      id TEXT PRIMARY KEY, entity_id TEXT, archetype_id TEXT, domain_id TEXT, subtopic_id TEXT, language TEXT, question TEXT,
      format TEXT, choices TEXT, correct_choice_id TEXT, explanation TEXT, fun_fact TEXT, visual_spec TEXT, age_band TEXT,
      difficulty INTEGER, thinking_seconds REAL, tags TEXT, status TEXT, created_at TEXT, updated_at TEXT, translations TEXT)`);
    const insert = db.prepare(`INSERT INTO bank_questions VALUES (${new Array(21).fill("?").join(", ")})`);
    for (const question of [safe, unsafe]) {
      const row = bankQuestionToRow(question);
      insert.run(...(Object.values(row) as Array<string | number | null>));
    }
    expect(applyKidAudienceReviewToRows(db)).toEqual({ totalRows: 2, updatedRows: 2, hiddenRows: 1 });
    const statuses = db.prepare("SELECT id, status FROM bank_questions ORDER BY id").all();
    expect(statuses).toEqual([
      { id: "Q-SAFE", status: "approved" },
      { id: "Q-UNSAFE", status: "archived" },
    ]);
    expect(applyKidAudienceReviewToRows(db).updatedRows).toBe(0);
    db.close();
  });
});
