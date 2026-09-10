import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import type { BankQuestion } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { detectSyntacticRepetition, runAutoQaOnQuestion, runBatchAutoQa } from "../src/quiz/bank/questionBankAutoQa.js";
import { buildBatchGenerationPrompt, parseBatchGenerationOutput } from "../src/quiz/bank/batchGeneratorPrompt.js";
import { generateQuestionBankBatch } from "../src/quiz/bank/questionBankBatchService.js";
import { registerQuestionBankRoutes } from "../src/routes/questionBank.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { makeAuthorizedBankQuestion } from "./helpers/authorizedContentFixtures.js";

describe("Question Bank Auto-QA and AI Batch Ingestion Pipeline", () => {
  let app: StudioApp;
  let tempRoot: string;

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "qb-autoqa-root-"));
    app = await buildApp(tempRoot);
  });

  afterAll(async () => {
    await app.close();
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  const sampleValidQuestion: BankQuestion = {
    id: "TEST-QA-001",
    archetype_id: "speed_blitz",
    domain_id: "logic_puzzles",
    subtopic_id: "tricky_riddles",
    question: "How many letters are in the modern English alphabet?",
    language: "en",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "24 letters", is_correct: false },
      { id: "B", text: "26 letters", is_correct: true },
      { id: "C", text: "28 letters", is_correct: false },
    ],
    correct_choice_id: "B",
    explanation: "The modern English alphabet officially consists of 26 letters.",
    fun_fact: "The letters 'J' and 'V' were the last additions to the English alphabet.",
    visual_spec: { intent: "none", aspect_ratio: "16:9" },
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 4,
    tags: ["logic_puzzles", "language"],
    status: "approved",
  };

  it("Auto-QA: accepts valid named subjects and IP terms", () => {
    // 1. Marvel IP
    const marvelQ: BankQuestion = {
      ...sampleValidQuestion,
      id: "MARVEL-PASS",
      question: "How many legs does Spider-Man have?",
    };
    const resMarvel = runAutoQaOnQuestion(marvelQ);
    expect(resMarvel.passed).toBe(true);
    expect(resMarvel.issues.length).toBe(0);

    // 2. Lion King / Simba
    const simbaQ: BankQuestion = {
      ...sampleValidQuestion,
      id: "SIMBA-PASS",
      explanation: "Simba the lion cub is the main character.",
    };
    const resSimba = runAutoQaOnQuestion(simbaQ);
    expect(resSimba.passed).toBe(true);
    expect(resSimba.issues.length).toBe(0);

    // 3. Valid question passes
    const resClean = runAutoQaOnQuestion(sampleValidQuestion);
    expect(resClean.passed).toBe(true);
    expect(resClean.issues.length).toBe(0);
  });

  it("Auto-QA: runBatchAutoQa exposes only active categories and no copyrightRejections", () => {
    const report = runBatchAutoQa([makeAuthorizedBankQuestion("Pikachu")]);
    expect(report.passedCount).toBe(1);
    expect(report.rejectedCount).toBe(0);
    expect(report.summary).toEqual({
      duplicateRejections: 0,
      schemaRejections: 0,
      qualityRejections: 0,
    });
    expect(Object.hasOwn(report.summary, "copyrightRejections")).toBe(false);
  });

  it("Auto-QA: Deduplication Filter blocks identical and high-similarity questions", () => {
    const existing: BankQuestion = {
      ...sampleValidQuestion,
      id: "EXISTING-001",
      question: "A wooden stick has two ends. How many ends does half a stick have?",
    };

    // Exactly duplicate or rephrased
    const duplicateQ: BankQuestion = {
      ...sampleValidQuestion,
      id: "DUP-FAIL",
      question: "A wooden stick has 2 ends. How many ends does half a stick have?",
    };

    const resDup = runAutoQaOnQuestion(duplicateQ, [existing]);
    expect(resDup.passed).toBe(false);
    expect(resDup.issues.some((i) => i.type === "duplicate")).toBe(true);

    // Unrelated question passes
    const distinctQ: BankQuestion = {
      ...sampleValidQuestion,
      id: "DISTINCT-PASS",
      question: "Did the chicken or the egg come first according to evolutionary biology?",
    };
    const resDistinct = runAutoQaOnQuestion(distinctQ, [existing]);
    expect(resDistinct.passed).toBe(true);
  });

  it("Auto-QA: Schema & Quality Integrity detects invalid choices and short text", () => {
    // 1. Invalid correct_choice_id
    const badChoiceId: BankQuestion = {
      ...sampleValidQuestion,
      id: "BAD-CHOICE",
      correct_choice_id: "Z",
    };
    const resBadId = runAutoQaOnQuestion(badChoiceId);
    expect(resBadId.passed).toBe(false);
    expect(resBadId.issues.some((i) => i.type === "schema")).toBe(true);

    // 2. Duplicate choices
    const dupChoices: BankQuestion = {
      ...sampleValidQuestion,
      id: "DUP-CHOICES",
      choices: [
        { id: "A", text: "26 letters", is_correct: true },
        { id: "B", text: "26 letters", is_correct: false },
      ],
      correct_choice_id: "A",
    };
    const resDupChoices = runAutoQaOnQuestion(dupChoices);
    expect(resDupChoices.passed).toBe(false);
    expect(resDupChoices.issues.some((i) => i.type === "quality")).toBe(true);

    // 3. Question text too long (> 85 characters)
    const longQ: BankQuestion = {
      ...sampleValidQuestion,
      id: "LONG-FAIL",
      question: "Blue whales are the largest animals ever known to have lived on Earth, larger than any dinosaur. Fact or Myth?",
    };
    const resLong = runAutoQaOnQuestion(longQ);
    expect(resLong.passed).toBe(false);
    expect(resLong.issues.some((i) => i.type === "quality" && i.message.includes("too long"))).toBe(true);
  });

  it("Auto-QA: Batch execution filters out duplicates and accumulates report summary", () => {
    const batchCandidates: BankQuestion[] = [
      sampleValidQuestion,
      {
        ...sampleValidQuestion,
        id: "DUP-INTERNAL-1",
        question: "How many total letters are in the standard English alphabet?",
      },
      {
        ...sampleValidQuestion,
        id: "NAMED-SUBJECT-PASS",
        question: "What elemental type is Pikachu?",
      },
    ];

    const report = runBatchAutoQa(batchCandidates, { similarityThreshold: 0.7 });
    expect(report.total).toBe(3);
    expect(report.passedCount).toBe(2);
    expect(report.rejectedCount).toBe(1);
    expect(report.summary.duplicateRejections).toBe(1);
  });

  it("Prompt Engine: builds compliant prompt and parses markdown JSON output", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "verdict_fact_myth",
      domainId: "nature_animals",
      subtopicId: "ocean_giants",
      count: 3,
    });
    expect(prompt).toContain("verdict_fact_myth");
    expect(prompt).toContain("ocean_giants");
    expect(prompt).toContain("true_false");
    expect(prompt).toContain("STRICT CONTENT POLICY");

    // Test parsing output wrapped in markdown code fence
    const rawAiOutput = "```json\n" + JSON.stringify([sampleValidQuestion]) + "\n```";
    const parsed = parseBatchGenerationOutput(rawAiOutput, {
      archetypeId: "speed_blitz",
      domainId: "logic_puzzles",
      subtopicId: "tricky_riddles",
    });
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe(sampleValidQuestion.id);
  });

  it("Batch Service: generates and persists clean questions while rejecting bad ones", async () => {
    const testIdClean = `AUTO-QA-CLEAN-${Date.now()}`;
    const cleanQ: BankQuestion = {
      ...sampleValidQuestion,
      id: testIdClean,
      question: `Which planet is closest to the Sun in our Solar System? (ID ${testIdClean})`,
      explanation: "Mercury is the closest planet to the Sun.",
      subtopic_id: "ocean_giants",
      domain_id: "nature_animals",
      archetype_id: "verdict_fact_myth",
      format: "true_false",
      choices: [
        { id: "A", text: "True (Mercury)", is_correct: true },
        { id: "B", text: "False", is_correct: false },
      ],
      correct_choice_id: "A",
    };

    const badQ: BankQuestion = {
      ...cleanQ,
      id: `BAD-${Date.now()}`,
      correct_choice_id: "NON_EXISTENT",
    };

    const result = await generateQuestionBankBatch(app.repository, {
      archetypeId: "verdict_fact_myth",
      domainId: "nature_animals",
      subtopicId: "ocean_giants",
      rawCandidatesOverride: [cleanQ, badQ],
      persist: true,
    });

    expect(result.success).toBe(true);
    expect(result.approvedCount).toBe(1);
    expect(result.rejectedCount).toBe(1);
    expect(result.qaSummary.schemaRejections).toBe(1);
    expect(result.savedQuestions.some((q) => q.id === testIdClean)).toBe(true);

    // Verify it was actually persisted
    const fetched = await app.repository.getQuestionBankQuestion(testIdClean);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(testIdClean);

    // Clean up test question
    await app.repository.deleteQuestionBankQuestion(testIdClean);
  });

  it("POST /api/question-bank/generate-batch returns 200 with Auto-QA report", async () => {
    const testApiId = `API-QA-${Date.now()}`;
    const mockQuestion: BankQuestion = {
      ...sampleValidQuestion,
      id: testApiId,
      subtopic_id: "ocean_giants",
      domain_id: "nature_animals",
      archetype_id: "verdict_fact_myth",
      question: `Are blue whales the largest animals on Earth? (${testApiId})`,
      format: "true_false",
      choices: [
        { id: "A", text: "True", is_correct: true },
        { id: "B", text: "False", is_correct: false },
      ],
      correct_choice_id: "A",
    };

    const res = await app.server.inject({
      method: "POST",
      url: "/api/question-bank/generate-batch",
      payload: {
        archetype_id: "verdict_fact_myth",
        domain_id: "nature_animals",
        subtopic_id: "ocean_giants",
        candidates: [mockQuestion],
        persist: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      approvedCount: number;
      rejectedCount: number;
      qaSummary: Record<string, unknown>;
    };
    expect(body.success).toBe(true);
    expect(body.approvedCount).toBe(1);
    expect(body.rejectedCount).toBe(0);
    expect(body.qaSummary).toEqual({
      duplicateRejections: 0,
      schemaRejections: 0,
      qualityRejections: 0,
    });
    expect(Object.hasOwn(body.qaSummary, "copyrightRejections")).toBe(false);

    // Clean up
    await app.repository.deleteQuestionBankQuestion(testApiId);
  });

  it("generateQuestionBankBatch throws when neither candidates nor llmClient is supplied", async () => {
    await expect(
      generateQuestionBankBatch(app.repository, {
        archetypeId: "speed_blitz",
        domainId: "logic_puzzles",
        subtopicId: "tricky_riddles",
      }),
    ).rejects.toThrow("No AI engine client or candidates provided for batch generation");
  });

  it("generateQuestionBankBatch invokes LLMClient, parses response, runs QA, and persists questions", async () => {
    const testLlmId = `LLM-GEN-${Date.now()}`;
    const generatedQuestion: BankQuestion = {
      ...sampleValidQuestion,
      id: testLlmId,
      question: `Is the speed of light faster than sound? (${testLlmId})`,
      explanation: "Light travels at approximately 300,000 km/s while sound travels at 343 m/s in air.",
      subtopic_id: "ocean_giants",
      domain_id: "nature_animals",
      archetype_id: "verdict_fact_myth",
      format: "true_false",
      choices: [
        { id: "A", text: "True", is_correct: true },
        { id: "B", text: "False", is_correct: false },
      ],
      correct_choice_id: "A",
    };

    const emitter = new EventEmitter();
    const mockLlmClient = Object.assign(emitter, {
      connect: () => Promise.resolve(),
      startThread: () => Promise.resolve("thread-gen-123"),
      startTurn: () => {
        setTimeout(() => {
          emitter.emit("notification", {
            method: "item/agentMessage/delta",
            params: {
              delta: JSON.stringify([generatedQuestion]),
            },
          });
          emitter.emit("notification", {
            method: "turn/completed",
            params: { turn: { status: "completed" } },
          });
        }, 10);
        return Promise.resolve("turn-gen-123");
      },
    }) as unknown as LLMClient;

    const result = await generateQuestionBankBatch(app.repository, {
      archetypeId: "verdict_fact_myth",
      domainId: "nature_animals",
      subtopicId: "ocean_giants",
      count: 1,
      llmClient: mockLlmClient,
      persist: true,
    });

    expect(result.success).toBe(true);
    expect(result.generatedCount).toBe(1);
    expect(result.approvedCount).toBe(1);
    expect(result.savedQuestions.some((q) => q.id === testLlmId)).toBe(true);

    // Clean up
    await app.repository.deleteQuestionBankQuestion(testLlmId);
  });

  it("POST /api/question-bank/generate-batch returns 503 when no AI client and no candidates", async () => {
    const isolatedServer = Fastify();
    await isolatedServer.register(registerQuestionBankRoutes({ repository: app.repository }));

    const res = await isolatedServer.inject({
      method: "POST",
      url: "/api/question-bank/generate-batch",
      payload: {
        archetype_id: "speed_blitz",
        domain_id: "logic_puzzles",
        subtopic_id: "tricky_riddles",
        count: 3,
      },
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body) as { code: string };
    expect(body.code).toBe("AI_CLIENT_UNAVAILABLE");
    await isolatedServer.close();
  });

  it("Auto-QA: detects and flags redundant choice suffixes in Versus Faceoff", () => {
    const redundantVersusQ: BankQuestion = {
      ...sampleValidQuestion,
      id: "VERSUS-RED-1",
      archetype_id: "versus_faceoff",
      format: "multiple_choice",
      question: "Which game flicks discs into pockets: Billiards or Carrom?",
      choices: [
        { id: "A", text: "Billiards", is_correct: false },
        { id: "B", text: "Carrom", is_correct: true },
      ],
      correct_choice_id: "B",
    };

    const res = runAutoQaOnQuestion(redundantVersusQ);
    expect(res.passed).toBe(false);
    expect(res.issues.some((i) => i.type === "quality" && i.message.includes("Versus Faceoff question"))).toBe(true);

    const cleanVersusQ: BankQuestion = {
      ...redundantVersusQ,
      id: "VERSUS-CLEAN-1",
      question: "Which tabletop game flicks wooden discs into corner pockets?",
    };
    const resClean = runAutoQaOnQuestion(cleanVersusQ);
    expect(resClean.passed).toBe(true);
  });

  it("Auto-QA: detectSyntacticRepetition catches repetitive formulaic suffixes across batch", () => {
    const makeSpotting = (id: string, q: string): BankQuestion => ({
      ...sampleValidQuestion,
      id,
      archetype_id: "visual_spotting",
      format: "odd_one_out",
      question: q,
      choices: [
        { id: "A", text: "Option A", is_correct: true },
        { id: "B", text: "Option B", is_correct: false },
        { id: "C", text: "Option C", is_correct: false },
      ],
      correct_choice_id: "A",
    });

    const q1 = makeSpotting("S1", "Which ancient queen goddess is the odd one out?");
    const q2 = makeSpotting("S2", "Which radiant Norse goddess is the odd one out?");
    const q3 = makeSpotting("S3", "Which tragic Greek king is the odd one out?");

    // First two pass
    expect(detectSyntacticRepetition(q1, [])).toBeNull();
    expect(detectSyntacticRepetition(q2, [q1])).toBeNull();

    // Third repetitive suffix in batch is flagged
    const issue = detectSyntacticRepetition(q3, [q1, q2]);
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe("quality");
    expect(issue?.message).toContain("odd one out");

    // Varied hooks pass without issue
    const variedQ = makeSpotting("S-VAR", "Spot the impostor: Which Greek voyager does not belong?");
    expect(detectSyntacticRepetition(variedQ, [q1, q2])).toBeNull();
  });

  it("Auto-QA: detectSyntacticRepetition catches 3 consecutive identical 2-word opening prefixes", () => {
    const makeQ = (id: string, q: string): BankQuestion => ({
      ...sampleValidQuestion,
      id,
      question: q,
    });

    const q1 = makeQ("P1", "Which game drops discs vertically into slots?");
    const q2 = makeQ("P2", "Which game uses a colored floor mat?");
    const q3 = makeQ("P3", "Which game glides a puck on air?");

    expect(detectSyntacticRepetition(q1, [])).toBeNull();
    expect(detectSyntacticRepetition(q2, [q1])).toBeNull();

    const issue = detectSyntacticRepetition(q3, [q1, q2]);
    expect(issue).not.toBeNull();
    expect(issue?.type).toBe("quality");
    expect(issue?.message).toContain("Monotonous opening repetition");
    expect(issue?.message).toContain("which game");
  });
});
