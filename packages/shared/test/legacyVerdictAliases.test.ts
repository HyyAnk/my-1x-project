import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BankGameplayArchetypeIdSchema,
  QuizConfigFormatSchema,
  QuizLayoutIdSchema,
  QuizQuestionFormatSchema,
  ReelArchetypeSchema,
  ThumbnailLayoutTypeSchema,
  normalizeLegacyVerdictIdentifier,
} from "../src/index.js";
import { QuizGameplayIdSchema } from "../src/quizGameplaySchema.js";

void test("retired True/False identifiers parse as their Yes/No replacements", () => {
  assert.equal(BankGameplayArchetypeIdSchema.parse("verdict_true_false"), "verdict_yes_no");
  assert.equal(BankGameplayArchetypeIdSchema.parse("verdict_fact_myth"), "verdict_yes_no");
  assert.equal(QuizGameplayIdSchema.parse("verdict_true_false"), "verdict_yes_no");
  assert.equal(QuizLayoutIdSchema.parse("verdict_true_false"), "verdict_yes_no");
  assert.equal(QuizQuestionFormatSchema.parse("true_false"), "yes_no");
  assert.equal(QuizConfigFormatSchema.parse("true_false"), "yes_no");
  assert.equal(ReelArchetypeSchema.parse("verdict_true_false"), "verdict_yes_no");
  assert.equal(ThumbnailLayoutTypeSchema.parse("true_false"), "yes_no");
});

void test("non-legacy identifiers pass through the alias layer unchanged", () => {
  assert.equal(normalizeLegacyVerdictIdentifier("deep_trivia"), "deep_trivia");
  assert.equal(normalizeLegacyVerdictIdentifier(undefined), undefined);
  assert.equal(QuizQuestionFormatSchema.safeParse("unknown_format").success, false);
});

void test("short-reel snapshots hashed with retired True/False ids still verify", async () => {
  const { BankQuestionSchema, CompleteShortReelSourceSnapshotSchema, computeSourceContentHash, createEnglishSourceSnapshot } =
    await import("../src/index.js");
  const question = BankQuestionSchema.parse({
    id: "q-tf-legacy",
    archetype_id: "verdict_yes_no",
    domain_id: "science",
    subtopic_id: "physics",
    language: "en",
    question: "Light travels faster than sound. True or False?",
    format: "yes_no",
    choices: [
      { id: "A", text: "True", is_correct: true },
      { id: "B", text: "False", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Light travels at 300,000 km/s.",
    status: "approved",
  });
  const current = createEnglishSourceSnapshot(question, "source");

  // Recreate what the pre-retirement code persisted: retired ids inside the hashed payload.
  const legacyOriginal = { ...current.original_question, archetype_id: "verdict_true_false", format: "true_false" };
  const { content_hash: _currentHash, original_question: _original, fidelity, ...projection } = current;
  const legacyProjection = { ...projection, archetype_id: "verdict_true_false" };
  const legacyHash = computeSourceContentHash(legacyOriginal as never, legacyProjection as never);
  const persisted = { fidelity, ...legacyProjection, original_question: legacyOriginal, content_hash: legacyHash };

  const parsed = CompleteShortReelSourceSnapshotSchema.parse(persisted);
  assert.equal(parsed.archetype_id, "verdict_yes_no");
  assert.equal(CompleteShortReelSourceSnapshotSchema.safeParse({ ...persisted, content_hash: "0".repeat(64) }).success, false);
});
