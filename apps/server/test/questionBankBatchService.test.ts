import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BankQuestion } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import {
  buildReverseGenerationPrompt,
  parseReverseBatchGenerationOutput,
  type TargetEntityForGeneration,
} from "../src/quiz/bank/batchGeneratorPrompt.js";
import {
  generateQuestionBankBatch,
  MAX_BATCH_CHUNK_SIZE,
  type QuestionBankChunkProgress,
} from "../src/quiz/bank/questionBankBatchService.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

describe("Question Bank Batch Generator Prompt & Parser", () => {
  const sampleTargets: TargetEntityForGeneration[] = [
    {
      entity_id: "ENT-ANI-001",
      name: "Lion",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      visual_anchor: "Cinematic portrait of a male lion.",
      core_traits: ["Known as King of the Jungle", "Pride social hierarchy"],
      distractor_pool: ["Tiger", "Leopard", "Cheetah"],
      facts_and_myths: [
        {
          claim: "Lions live in dense rainforests.",
          verdict: "myth",
          explanation: "Lions inhabit grasslands and savannahs.",
        },
      ],
      versus_candidates: ["Siberian Tiger"],
    },
    {
      entity_id: "ENT-ANI-002",
      name: "African Elephant",
      domain_id: "nature_animals",
      subtopic_id: "mammals",
      visual_anchor: "Dramatic wide shot of an elephant matriarch.",
      core_traits: ["Largest land mammal", "Large ears shaped like Africa"],
      distractor_pool: ["Hippopotamus", "Rhinoceros", "Giraffe"],
      facts_and_myths: [
        {
          claim: "Elephants can communicate using infrasound.",
          verdict: "fact",
          explanation: "They send low-frequency vibrations through the ground.",
        },
      ],
      versus_candidates: ["White Rhinoceros"],
    },
  ];

  it("builds reverse generation prompt with concrete entity traits and instructions", () => {
    const prompt = buildReverseGenerationPrompt({
      archetypeId: "verdict_fact_myth",
      targets: sampleTargets,
      difficulty: 2,
      ageBand: "family",
    });

    expect(prompt).toContain("ENT-ANI-001");
    expect(prompt).toContain("Lion");
    expect(prompt).toContain("King of the Jungle");
    expect(prompt).toContain("ENT-ANI-002");
    expect(prompt).toContain("African Elephant");
    expect(prompt).toContain("verdict_fact_myth");
    expect(prompt).toContain("SPECIALIZED TRUE / FALSE ARCHETYPE DIRECTIVE");
    expect(prompt).toContain("REVERSE MATRIX GENERATION CONTRACT");
  });

  it("parses reverse batch generation output correlating entity_id", () => {
    const rawOutput = JSON.stringify([
      {
        entity_id: "ENT-ANI-001",
        question: "Lions live primarily in dense rainforests. Fact or Myth?",
        format: "true_false",
        choices: [
          { id: "A", text: "Fact", is_correct: false },
          { id: "B", text: "Myth", is_correct: true },
        ],
        correct_choice_id: "B",
        explanation: "Lions live in grasslands, plains, and savannahs.",
        fun_fact: "A pride's roar can be heard 5 miles away.",
        visual_spec: {
          intent: "question_illustration",
          prompt: "Male lion on the savannah at sunset.",
        },
        difficulty: 1,
        thinking_seconds: 5,
        tags: ["nature", "animals"],
      },
      {
        // Notice: entity_id omitted by LLM, test positional fallback to target #2
        question: "Elephants use low-frequency ground vibrations to communicate. Fact or Myth?",
        format: "true_false",
        choices: [
          { id: "A", text: "Fact", is_correct: true },
          { id: "B", text: "Myth", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Elephants produce infrasound seismic waves.",
        visual_spec: {
          intent: "question_illustration",
          prompt: "Elephants marching across dusty plains.",
        },
        difficulty: 2,
        thinking_seconds: 5,
        tags: ["nature", "animals"],
      },
    ]);

    const parsed = parseReverseBatchGenerationOutput(rawOutput, sampleTargets, {
      archetypeId: "verdict_fact_myth",
    });

    expect(parsed.length).toBe(2);
    expect(parsed[0].entity_id).toBe("ENT-ANI-001");
    expect(parsed[0].domain_id).toBe("nature_animals");
    expect(parsed[0].archetype_id).toBe("verdict_fact_myth");

    expect(parsed[1].entity_id).toBe("ENT-ANI-002");
    expect(parsed[1].domain_id).toBe("nature_animals");
    expect(parsed[1].subtopic_id).toBe("mammals");
  });
});

describe("Question Bank Chunking Engine & Batch Service", () => {
  let tempDir: string;
  let repo: RepositoryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "qb-chunk-test-"));
    const { existsSync } = await import("node:fs");
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    repo = new RepositoryService(curr);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("handles rawCandidatesOverride with QA and single chunk progress", async () => {
    const rawQuestions: BankQuestion[] = [
      {
        id: "RAW-TEST-001",
        archetype_id: "speed_blitz",
        domain_id: "nature_animals",
        subtopic_id: "marine_life",
        entity_id: "ENT-ANI-001",
        format: "multiple_choice",
        question: "Which Australian mammal is known to lay eggs?",
        choices: [
          { id: "A", text: "Platypus", is_correct: true },
          { id: "B", text: "Kangaroo", is_correct: false },
          { id: "C", text: "Koala", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "The platypus is one of the very few monotremes that lay eggs instead of giving birth.",
        thinking_seconds: 4,
        visual_spec: { intent: "none" },
        difficulty: 1,
        tags: ["marine"],
        status: "approved",
        quality_score: 95,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const progressEvents: QuestionBankChunkProgress[] = [];

    const result = await generateQuestionBankBatch(repo, {
      rawCandidatesOverride: rawQuestions,
      persist: false,
      onChunkProgress: (p) => progressEvents.push(p),
    });

    expect(result.success).toBe(true);
    expect(result.approvedCount).toBe(1);
    expect(result.savedQuestions.length).toBe(1);
    expect(progressEvents.length).toBe(1);
    expect(progressEvents[0].completedCount).toBe(1);
    expect(result.matrixCoverage).toBeDefined();
    expect(result.matrixCoverage?.total_combos).toBe(20000);
  });

  it("executes chunking loop when target count exceeds MAX_BATCH_CHUNK_SIZE", async () => {
    // Target 25 questions -> 2 chunks (chunk 1: 20, chunk 2: 5)
    const targetCount = 25;
    expect(MAX_BATCH_CHUNK_SIZE).toBe(20);

    const progressReports: QuestionBankChunkProgress[] = [];

    // Mock LLM that returns valid questions for whatever prompt it receives
    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async () => ({
        text: JSON.stringify([
          {
            entity_id: "ENT-ANI-001",
            question: "Lions roar to mark territory up to five miles. Fact or Myth?",
            format: "true_false",
            choices: [
              { id: "A", text: "Fact", is_correct: true },
              { id: "B", text: "Myth", is_correct: false },
            ],
            correct_choice_id: "A",
            explanation: "Lions have a specialized larynx that allows powerful roars.",
            visual_spec: {
              intent: "question_illustration",
              prompt: "Lion roaring on a rock.",
            },
            difficulty: 1,
            thinking_seconds: 5,
            tags: ["nature"],
          },
        ]),
      }),
    };

    const result = await generateQuestionBankBatch(repo, {
      mode: "auto",
      count: targetCount,
      persist: false,
      llmClient: mockLlmClient,
      onChunkProgress: (p) => progressReports.push(p),
    });

    expect(result.success).toBe(true);
    // Should have run 2 chunks
    expect(progressReports.length).toBe(2);
    expect(progressReports[0].currentChunk).toBe(1);
    expect(progressReports[0].totalChunks).toBe(2);
    expect(progressReports[0].chunkSize).toBe(20);

    expect(progressReports[1].currentChunk).toBe(2);
    expect(progressReports[1].totalChunks).toBe(2);
    expect(progressReports[1].chunkSize).toBe(5);

    expect(result.matrixCoverage).toBeDefined();
    expect(result.matrixCoverage?.total_combos).toBe(20000);
  });

  it("rotates domain and archetype across multi-chunk auto generation", async () => {
    const requestedArchetypes: string[] = [];
    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async (prompt: string) => {
        // Extract archetype from prompt
        const match = prompt.match(/Gameplay Archetype:\s*"?([a-z_]+)"?/i);
        if (match) requestedArchetypes.push(match[1]);
        return {
          text: JSON.stringify([
            {
              entity_id: "ENT-ANI-001",
              question: "Sample test question?",
              format: "multiple_choice",
              choices: [
                { id: "A", text: "Option A", is_correct: true },
                { id: "B", text: "Option B", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Sample explanation",
              visual_spec: { intent: "none" },
              difficulty: 1,
              thinking_seconds: 4,
              tags: ["test"],
            },
          ]),
        };
      },
    };

    // 40 questions -> 2 chunks of 20
    const result = await generateQuestionBankBatch(repo, {
      mode: "auto",
      count: 40,
      persist: false,
      llmClient: mockLlmClient,
    });

    expect(result.success).toBe(true);
    expect(requestedArchetypes.length).toBe(2);
    // Chunk 1 and Chunk 2 must request different archetypes
    expect(requestedArchetypes[0]).not.toBe(requestedArchetypes[1]);
  });

  it("executes 100 questions across 5 chunks concurrently with worker pool (concurrency = 5)", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;
    let callCounter = 0;
    const chunkReports: QuestionBankChunkProgress[] = [];

    const distinctQuestions = [
      "Which lion mammal is known as king of the jungle?",
      "What is the capital city of France in Western Europe?",
      "How many total planets orbit our bright solar sun?",
      "What heavy chemical element is represented by atomic symbol Fe?",
      "Who wrote the tragedy Romeo and Juliet long ago in England?",
    ];

    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        callCounter++;
        const currentId = callCounter;
        const qText = distinctQuestions[(currentId - 1) % distinctQuestions.length];
        activeCalls++;
        if (activeCalls > maxConcurrent) {
          maxConcurrent = activeCalls;
        }
        // Small delay to verify concurrent overlap
        await new Promise((res) => setTimeout(res, 25));
        activeCalls--;

        return {
          text: JSON.stringify([
            {
              entity_id: `ENT-ANI-00${currentId}`,
              question: qText,
              format: "multiple_choice",
              choices: [
                { id: "A", text: "Choice A", is_correct: true },
                { id: "B", text: "Choice B", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Clear explanation text for test.",
              visual_spec: { intent: "none" },
              difficulty: 1,
              thinking_seconds: 5,
              tags: ["test"],
            },
          ]),
        };
      },
    };

    // 100 questions -> 5 chunks of 20
    const result = await generateQuestionBankBatch(repo, {
      mode: "auto",
      count: 100,
      concurrency: 5,
      persist: false,
      llmClient: mockLlmClient,
      onChunkProgress: (p) => chunkReports.push(p),
    });

    expect(result.success).toBe(true);
    // Verified concurrent overlap: multiple workers ran simultaneously
    expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    expect(chunkReports.length).toBe(5);
    expect(chunkReports[chunkReports.length - 1].completedCount).toBeGreaterThanOrEqual(5);
  });

  it("aborts in-flight workers cleanly when signal is aborted", async () => {
    const ac = new AbortController();
    let callsCount = 0;

    const mockLlmClient: LLMClient = {
      connect: async () => {},
      generateContent: async () => {
        callsCount++;
        // Abort on first call
        ac.abort();
        return {
          text: JSON.stringify([
            {
              entity_id: `ENT-ANI-00${callsCount}`,
              question: `Aborted unique question ${callsCount}?`,
              format: "multiple_choice",
              choices: [
                { id: "A", text: "Choice A", is_correct: true },
                { id: "B", text: "Choice B", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Explanation",
              visual_spec: { intent: "none" },
              difficulty: 1,
              thinking_seconds: 5,
              tags: ["test"],
            },
          ]),
        };
      },
    };

    // 200 questions -> 10 chunks of 20, concurrency = 3
    const result = await generateQuestionBankBatch(repo, {
      mode: "auto",
      count: 200,
      concurrency: 3,
      persist: false,
      signal: ac.signal,
      llmClient: mockLlmClient,
    });

    // Out of 10 chunks, abort prevents the remaining chunks from ever starting
    expect(callsCount).toBeLessThan(10);
  });
});


