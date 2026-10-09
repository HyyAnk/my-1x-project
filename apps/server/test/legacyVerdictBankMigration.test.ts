import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BankSubtopicBatch } from "@studio/shared";
import { closeBankSqliteDb, getBankSqliteDb } from "../src/repository/quiz/bank/bankSqliteEngine.js";
import { normalizeLegacyVerdictRows } from "../src/repository/quiz/bank/bankLegacyVerdictRows.js";
import { storeDiscoveredBatch } from "../src/repository/quiz/bank/storage/bankBatchParser.js";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    closeBankSqliteDb(root);
    await rm(root, { recursive: true, force: true });
  }
});

function insertLegacyRow(db: ReturnType<typeof getBankSqliteDb>): void {
  db.prepare(
    `INSERT INTO bank_questions (id, archetype_id, domain_id, subtopic_id, language, question, format, choices, correct_choice_id,
      explanation, fun_fact, age_band, difficulty, tags, status, created_at, updated_at, translations)
     VALUES (?, 'verdict_true_false', 'nature_animals', 'ocean', 'en', ?, 'true_false', ?, 'B', 'Sharks are fish.', '', 'family', 2, '[]',
      'approved', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z', '{}')`,
  ).run(
    "LEGACY-TF-1",
    "Sharks are mammals. True or False?",
    JSON.stringify([
      { id: "A", text: "True", is_correct: false },
      { id: "B", text: "False", is_correct: true },
    ]),
  );
}

describe("retired True/False verdict data", () => {
  it("rewrites legacy SQLite rows into canonical Yes/No rows and is idempotent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qb-legacy-verdict-"));
    roots.push(root);
    const db = getBankSqliteDb(root);
    insertLegacyRow(db);

    expect(normalizeLegacyVerdictRows(db)).toBe(1);
    const row = db
      .prepare("SELECT archetype_id, format, question, choices, updated_at FROM bank_questions WHERE id = ?")
      .get("LEGACY-TF-1") as {
      archetype_id: string;
      format: string;
      question: string;
      choices: string;
      updated_at: string;
    };
    expect(row.archetype_id).toBe("verdict_yes_no");
    expect(row.format).toBe("yes_no");
    expect(row.question).toBe("Sharks are mammals. Yes or No?");
    expect(JSON.parse(row.choices).map((choice: { text: string }) => choice.text)).toEqual(["Yes", "No"]);
    expect(row.updated_at).toBe("2026-09-01T00:00:00.000Z");

    expect(normalizeLegacyVerdictRows(db)).toBe(0);
  });

  it("merges an unmigrated True/False batch into the canonical Yes/No batch without losing questions", () => {
    const question = (id: string, text: string) => ({
      id,
      archetype_id: "verdict_yes_no" as const,
      domain_id: "nature_animals",
      subtopic_id: "ocean",
      language: "en",
      question: text,
      format: "yes_no" as const,
      choices: [
        { id: "A", text: "Yes", is_correct: true },
        { id: "B", text: "No", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Explanation.",
      fun_fact: "",
      age_band: "family" as const,
      difficulty: 2,
      tags: [],
      status: "approved" as const,
    });
    const batch = (questions: ReturnType<typeof question>[]) =>
      ({ archetype_id: "verdict_yes_no", domain_id: "nature_animals", subtopic_id: "ocean", questions }) as unknown as BankSubtopicBatch;

    const map = new Map<string, { data: BankSubtopicBatch; isRuntime: boolean; archDir: string }>();
    storeDiscoveredBatch(map, batch([question("Q1", "Canonical copy?"), question("Q2", "Only canonical?")]), true, "verdict_yes_no");
    storeDiscoveredBatch(map, batch([question("Q1", "Stale legacy copy?"), question("Q3", "Only legacy?")]), true, "verdict_true_false");

    const merged = [...map.values()][0].data.questions;
    expect(merged.map((item) => item.id)).toEqual(["Q1", "Q2", "Q3"]);
    expect(merged[0].question).toBe("Canonical copy?");
  });
});

describe("legacy True/False folder migration", () => {
  it("folds verdict_true_false files into verdict_yes_no with a backup and removes the retired folder", async () => {
    const { mkdir, writeFile, readFile } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    const { applyLegacyVerdictFileMigration, planLegacyVerdictFileMigration } =
      await import("../src/repository/quiz/bank/migration/legacyVerdictFileMigration.js");
    const bankRoot = await mkdtemp(path.join(os.tmpdir(), "qb-legacy-folder-"));
    roots.push(bankRoot);
    const legacyQuestion = {
      id: "TF-1",
      archetype_id: "verdict_true_false",
      domain_id: "nature_animals",
      subtopic_id: "ocean",
      language: "en",
      question: "Sharks are mammals. True or False?",
      format: "true_false",
      choices: [
        { id: "A", text: "True", is_correct: false },
        { id: "B", text: "False", is_correct: true },
      ],
      correct_choice_id: "B",
      explanation: "Sharks are fish.",
      status: "approved",
    };
    const legacyFile = path.join(bankRoot, "verdict_true_false", "nature_animals", "ocean.json");
    await mkdir(path.dirname(legacyFile), { recursive: true });
    await writeFile(
      legacyFile,
      JSON.stringify({
        archetype_id: "verdict_true_false",
        domain_id: "nature_animals",
        subtopic_id: "ocean",
        subtopic_title: "Ocean",
        questions: [legacyQuestion],
      }),
    );

    const plan = await planLegacyVerdictFileMigration(bankRoot);
    expect(plan.merges).toHaveLength(1);
    expect(plan.merges[0].addedQuestionIds).toEqual(["TF-1"]);

    const backupDir = path.join(bankRoot, "_backup");
    await applyLegacyVerdictFileMigration(plan, backupDir);

    const canonical = JSON.parse(await readFile(path.join(bankRoot, "verdict_yes_no", "nature_animals", "ocean.json"), "utf8"));
    expect(canonical.archetype_id).toBe("verdict_yes_no");
    expect(canonical.questions[0]).toMatchObject({
      archetype_id: "verdict_yes_no",
      format: "yes_no",
      question: "Sharks are mammals. Yes or No?",
    });
    expect(existsSync(path.join(bankRoot, "verdict_true_false"))).toBe(false);
    expect(existsSync(path.join(backupDir, "verdict_true_false", "nature_animals", "ocean.json"))).toBe(true);
  });
});

describe("retired True/False asset fingerprints", () => {
  it("accepts assets generated for the verdict_true_false layout without regeneration", async () => {
    const { assetFingerprint, assetFingerprintMatches } = await import("../src/quiz/assets/assetFingerprint.js");
    const request = {
      semantic_key: "q1-hero",
      subject: "A shark",
      purpose: "hero_question_image",
      style: "pixar_3d",
      aspect_ratio: "4:3",
      transparent_background: false,
      sizing: {
        geometry_key: "verdict_yes_no:hero_question_image:1920x1080:800x545_cover",
        layout_id: "verdict_yes_no",
        policy_version: 1,
      },
    } as unknown as Parameters<typeof assetFingerprint>[0];
    const legacyRequest = {
      ...request,
      sizing: {
        geometry_key: "verdict_true_false:hero_question_image:1920x1080:800x545_cover",
        layout_id: "verdict_true_false",
        policy_version: 1,
      },
    } as unknown as Parameters<typeof assetFingerprint>[0];

    expect(assetFingerprintMatches(assetFingerprint(request), request)).toBe(true);
    expect(assetFingerprintMatches(assetFingerprint(legacyRequest), request)).toBe(true);
    expect(assetFingerprintMatches("unrelated", request)).toBe(false);
  });
});

describe("two retired verdict folders for the same subtopic", () => {
  it("keeps questions from both folders when no canonical batch exists yet", () => {
    const make = (id: string) => ({
      id,
      archetype_id: "verdict_yes_no",
      domain_id: "nature_animals",
      subtopic_id: "ocean",
      question: `${id}?`,
      choices: [],
    });
    const batch = (ids: string[]) =>
      ({
        archetype_id: "verdict_yes_no",
        domain_id: "nature_animals",
        subtopic_id: "ocean",
        questions: ids.map(make),
      }) as unknown as BankSubtopicBatch;
    const map = new Map<string, { data: BankSubtopicBatch; isRuntime: boolean; archDir: string }>();
    storeDiscoveredBatch(map, batch(["F1", "S1"]), true, "verdict_fact_myth");
    storeDiscoveredBatch(map, batch(["T1", "S1"]), true, "verdict_true_false");
    expect([...map.values()][0].data.questions.map((q) => q.id)).toEqual(["F1", "S1", "T1"]);

    // The canonical folder is scanned last (alphabetical) and must still take precedence.
    storeDiscoveredBatch(map, batch(["Y1", "S1"]), true, "verdict_yes_no");
    expect([...map.values()][0].data.questions.map((q) => q.id)).toEqual(["Y1", "S1", "F1", "T1"]);
  });
});
