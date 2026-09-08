import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import { BankQuestionSchema, type BankQuestion } from "../src/index.js";
import {
  CompleteShortReelSourceSnapshotSchema,
  createEnglishSourceSnapshot,
  createSourceSnapshot,
  ShortReelSourceSnapshotSchema,
} from "../src/shortReel/index.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

const validEnglishVersus = BankQuestionSchema.parse({
  id: "bank-q-versus-001",
  archetype_id: "versus_faceoff",
  domain_id: "tech_speed",
  subtopic_id: "velocity",
  language: "English",
  question: "Over the same distance, which finishes first: 20 km/h or 10 km/h?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "20 km/h", is_correct: true },
    { id: "B", text: "10 km/h", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Higher speed reaches destination in less time over equal distance.",
  age_band: "family",
  status: "approved",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-02T00:00:00.000Z",
});

const nonEnglishWithVerifiedTranslation = BankQuestionSchema.parse({
  id: "bank-q-trans-001",
  archetype_id: "versus_faceoff",
  domain_id: "tech_speed",
  subtopic_id: "velocity",
  language: "French",
  question: "Sample non-English source question: which finishes first, 20 km/h or 10 km/h?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "20 km/h", is_correct: true },
    { id: "B", text: "10 km/h", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Sample non-English explanation: higher velocity takes less time.",
  age_band: "family",
  status: "approved",
  translations: {
    en: {
      language: "English",
      question: "Over the same distance, which finishes first: 20 km/h or 10 km/h?",
      choices: [
        { id: "A", text: "20 km/h" },
        { id: "B", text: "10 km/h" },
      ],
      explanation: "Higher speed takes less time over equal distance.",
      fun_fact: "Speed equals distance divided by time.",
      verified: true,
    },
  },
});

describe("Short-Reel Source Snapshot Boundary (Task A1)", () => {
  it("retains all original validated fields and does not share mutable references with input", () => {
    const mutableInput = structuredClone(validEnglishVersus);
    const snapshot = CompleteShortReelSourceSnapshotSchema.parse(createEnglishSourceSnapshot(mutableInput, "source"));

    assert.equal(snapshot.question_id, mutableInput.id);
    assert.equal(snapshot.original_question.id, mutableInput.id);
    assert.equal(snapshot.original_question.correct_choice_id, "A");
    assert.equal(snapshot.selected_answer_text, "20 km/h");

    // Mutate the original input fixture
    mutableInput.id = "MUTATED_ID";
    mutableInput.question = "MUTATED_QUESTION";
    mutableInput.choices[0].text = "MUTATED_CHOICE";
    mutableInput.correct_choice_id = "B";

    // Snapshot remains strictly untouched
    assert.equal(snapshot.question_id, "bank-q-versus-001");
    assert.equal(snapshot.original_question.id, "bank-q-versus-001");
    assert.equal(snapshot.original_question.question, "Over the same distance, which finishes first: 20 km/h or 10 km/h?");
    assert.equal(snapshot.choices[0].text, "20 km/h");
    assert.equal(snapshot.selected_answer_text, "20 km/h");
  });

  it("rejects unapproved questions (draft or archived)", () => {
    const draftQuestion = BankQuestionSchema.parse({
      ...validEnglishVersus,
      id: "q-draft",
      status: "draft",
    });
    assert.throws(() => createEnglishSourceSnapshot(draftQuestion, "source"), /status must be 'approved'/i);

    const archivedQuestion = BankQuestionSchema.parse({
      ...validEnglishVersus,
      id: "q-archived",
      status: "archived",
    });
    assert.throws(() => createEnglishSourceSnapshot(archivedQuestion, "source"), /status must be 'approved'/i);
  });

  it("rejects unsupported archetypes", () => {
    const tfQuestion = BankQuestionSchema.parse({
      id: "q-tf-001",
      archetype_id: "verdict_true_false",
      domain_id: "science",
      subtopic_id: "physics",
      language: "English",
      question: "Light travels faster than sound.",
      format: "true_false",
      choices: [
        { id: "A", text: "True", is_correct: true },
        { id: "B", text: "False", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Light travels at 300,000 km/s.",
      status: "approved",
    });

    assert.throws(() => createEnglishSourceSnapshot(tfQuestion, "source"), /archetype must be 'versus_faceoff' or 'deep_trivia'/i);
  });

  it("rejects non-English source questions without translation", () => {
    const frenchQuestion = BankQuestionSchema.parse({
      ...validEnglishVersus,
      id: "q-french",
      language: "French",
    });

    assert.throws(() => createEnglishSourceSnapshot(frenchQuestion, "source"), /language must be English/i);
  });

  it("accepts verified English translation for non-English question", () => {
    const snapshot = CompleteShortReelSourceSnapshotSchema.parse(
      createEnglishSourceSnapshot(nonEnglishWithVerifiedTranslation, "verified_translation"),
    );
    assert.equal(snapshot.translation_provenance, "verified_translation");
    assert.equal(snapshot.question_text, "Over the same distance, which finishes first: 20 km/h or 10 km/h?");
    assert.equal(snapshot.selected_answer_text, "20 km/h");
    assert.equal(snapshot.original_question.language, "French");
    assert.equal(snapshot.source_language, "French");
  });

  it("rejects unverified English translation", () => {
    const unverified = BankQuestionSchema.parse({
      ...nonEnglishWithVerifiedTranslation,
      id: "q-unverified",
      translations: {
        en: {
          ...nonEnglishWithVerifiedTranslation.translations!.en,
          verified: false,
        },
      },
    });

    assert.throws(() => createEnglishSourceSnapshot(unverified, "verified_translation"), /English translation is not verified/i);
  });

  it("rejects translation with contradictory language metadata even if under en key", () => {
    const contradictory = BankQuestionSchema.parse({
      ...nonEnglishWithVerifiedTranslation,
      id: "q-contradictory",
      translations: {
        en: {
          ...nonEnglishWithVerifiedTranslation.translations!.en,
          language: "French", // Contradictory: key says 'en' but metadata says 'French'
          verified: true,
        },
      },
    });

    assert.throws(() => createEnglishSourceSnapshot(contradictory, "verified_translation"), /no valid verified English translation found/i);
  });

  it("preserves exact canonical strings and choice text without unwanted modifications", () => {
    const question = BankQuestionSchema.parse(validEnglishVersus);
    const snapshot = createEnglishSourceSnapshot(question, "source");

    assert.equal(snapshot.question_text, question.question);
    assert.equal(snapshot.explanation, question.explanation);
    assert.equal(snapshot.choices[0].text, question.choices[0].text);
    assert.equal(snapshot.choices[1].text, question.choices[1].text);
    assert.equal(snapshot.selected_answer_text, question.choices[0].text);
  });

  it("rejects forged source projections at schema persistence boundary", () => {
    const valid = createEnglishSourceSnapshot(validEnglishVersus, "source");

    // 1. Forged answer choice (changing correct choice to B while original says A)
    const forgedChoice = {
      ...valid,
      correct_choice_id: "B",
      selected_answer_text: "10 km/h",
      choices: [
        { id: "A", text: "20 km/h", is_correct: false },
        { id: "B", text: "10 km/h", is_correct: true },
      ],
    };
    assert.equal(ShortReelSourceSnapshotSchema.safeParse(forgedChoice).success, false);

    // 2. Forged question text
    const forgedText = {
      ...valid,
      question_text: "Forged question text not in original",
    };
    assert.equal(ShortReelSourceSnapshotSchema.safeParse(forgedText).success, false);

    // 3. Forged content hash (64 zeroes)
    const forgedHash = {
      ...valid,
      content_hash: "0".repeat(64),
    };
    assert.equal(ShortReelSourceSnapshotSchema.safeParse(forgedHash).success, false);
  });

  it("safely parses legacy incomplete source snapshot without original_question", () => {
    const legacySnapshot = {
      question_id: "legacy-q-001",
      archetype_id: "versus_faceoff",
      question_text: "Which is larger: Ganymede or Mercury?",
      choices: [
        { id: "A", text: "Ganymede", is_correct: true },
        { id: "B", text: "Mercury", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Ganymede is larger.",
      selected_answer_text: "Ganymede",
      source_language: "English",
      translation_provenance: "source",
      content_hash: "legacy-hash-12345",
      original_updated_at: null,
    };

    const parsed = ShortReelSourceSnapshotSchema.safeParse(legacySnapshot);
    assert.ok(parsed.success);
    if (parsed.success) {
      assert.equal(parsed.data.fidelity, "incomplete");
      assert.equal(parsed.data.question_id, "legacy-q-001");
      assert.equal(parsed.data.selected_answer_text, "Ganymede");
    }
  });

  it("computes deterministic content hash insensitive to object-key ordering", () => {
    const snapshot1 = createEnglishSourceSnapshot(validEnglishVersus, "source");

    // Create same question with keys inserted in different order
    const reordered: BankQuestion = {
      status: validEnglishVersus.status,
      updated_at: validEnglishVersus.updated_at,
      created_at: validEnglishVersus.created_at,
      explanation: validEnglishVersus.explanation,
      correct_choice_id: validEnglishVersus.correct_choice_id,
      choices: [...validEnglishVersus.choices],
      format: validEnglishVersus.format,
      question: validEnglishVersus.question,
      language: validEnglishVersus.language,
      subtopic_id: validEnglishVersus.subtopic_id,
      domain_id: validEnglishVersus.domain_id,
      archetype_id: validEnglishVersus.archetype_id,
      id: validEnglishVersus.id,
      age_band: validEnglishVersus.age_band,
      difficulty: validEnglishVersus.difficulty,
      tags: validEnglishVersus.tags,
      fun_fact: validEnglishVersus.fun_fact,
    };

    const snapshot2 = createEnglishSourceSnapshot(reordered, "source");
    assert.equal(snapshot1.content_hash, snapshot2.content_hash);
    assert.equal(snapshot1.content_hash.length, 64);

    // Changing canonical text changes the hash
    const changed = BankQuestionSchema.parse({
      ...validEnglishVersus,
      question: "Changed question text?",
    });
    const snapshotChanged = createEnglishSourceSnapshot(changed, "source");
    assert.notEqual(snapshot1.content_hash, snapshotChanged.content_hash);
  });

  it("createSourceSnapshot backward-compatible constructor functions correctly", () => {
    const snapshot = createSourceSnapshot(validEnglishVersus);
    assert.equal(snapshot.question_id, "bank-q-versus-001");
    assert.equal(snapshot.translation_provenance, "source");
    assert.ok(ShortReelSourceSnapshotSchema.safeParse(snapshot).success);
  });
});
