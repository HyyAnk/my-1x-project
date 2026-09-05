import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { buildApp, type StudioApp } from "../src/app.js";
import { registerQuestionBankRoutes } from "../src/routes/questionBank.js";
import {
  loadAllKnowledgeEntities,
  getEntityById,
  getKnowledgeBaseStats,
} from "../src/quiz/bank/knowledgeBaseLoader.js";
import {
  calculateMatrixCoverageStats,
  selectAutoCandidates,
  selectManualCandidates,
} from "../src/quiz/bank/matrixCoverageService.js";
import {
  buildBatchGenerationPrompt,
  buildReverseGenerationPrompt,
  parseReverseBatchGenerationOutput,
  type TargetEntityForGeneration,
} from "../src/quiz/bank/batchGeneratorPrompt.js";
import {
  generateQuestionBankBatch,
  type QuestionBankChunkProgress,
} from "../src/quiz/bank/questionBankBatchService.js";
import type { BankQuestion } from "@studio/shared";

describe("Question Bank Reverse Matrix E2E Comprehensive Verification", () => {
  let app: StudioApp;
  let workspaceRoot: string;
  let tempStorage: string;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    workspaceRoot = curr;
    app = await buildApp(curr);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "qb-reverse-matrix-e2e-"));
    app.repository.setStorageRoot(tempStorage);
  });

  afterAll(async () => {
    await app.close();
    if (tempStorage) {
      await rm(tempStorage, { recursive: true, force: true }).catch(() => {});
    }
  });

  // ============================================================================
  // Suite 1: Knowledge Base Integrity, Completeness & English-Only Sanitization
  // ============================================================================
  describe("1. Knowledge Base Integrity (2,500 Entities across 14 Domains)", () => {
    it("loads all 14 entity files totaling exactly 2,500 entities", () => {
      const baseDir = path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");
      const stats = getKnowledgeBaseStats({ baseDir });
      expect(stats.totalEntities).toBe(2500);

      const files = readdirSync(baseDir).filter((f) => f.endsWith(".json"));
      expect(files.length).toBe(14);
    });

    it("ensures all 2,500 entity IDs are strictly unique", () => {
      const baseDir = path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");
      const all = loadAllKnowledgeEntities({ baseDir });
      const idSet = new Set<string>();
      for (const ent of all) {
        expect(idSet.has(ent.id)).toBe(false);
        idSet.add(ent.id);
      }
      expect(idSet.size).toBe(2500);
    });

    it("verifies every entity contains required traits, facts, and distractor pool", () => {
      const baseDir = path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");
      const all = loadAllKnowledgeEntities({ baseDir });
      for (const ent of all) {
        expect(ent.id).toMatch(/^ENT-[A-Z]{3}-\d{3}$/);
        expect(ent.name.trim().length).toBeGreaterThan(0);
        expect(ent.language).toBe("en");
        expect(Array.isArray(ent.core_traits)).toBe(true);
        expect(ent.core_traits.length).toBeGreaterThanOrEqual(2);
        expect(Array.isArray(ent.distractor_pool)).toBe(true);
        expect(ent.distractor_pool.length).toBeGreaterThanOrEqual(3);
        expect(Array.isArray(ent.facts_and_myths)).toBe(true);
        expect(ent.facts_and_myths.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("verifies zero Vietnamese or non-English accented characters exist across all entities", () => {
      const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
      const entityDir = path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");
      const files = readdirSync(entityDir).filter((f) => f.endsWith(".json"));

      for (const file of files) {
        const content = readFileSync(path.join(entityDir, file), "utf8");
        const hasVietnamese = vietnameseRegex.test(content);
        expect(hasVietnamese, `File ${file} must contain 0 Vietnamese characters`).toBe(false);
      }
    });

    it("supports fast O(1) entity lookups by unique entity_id", () => {
      const entityDir = path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");
      const lion = getEntityById("ENT-ANI-001", { baseDir: entityDir });
      expect(lion).toBeDefined();
      expect(lion?.name).toBe("Lion");
      expect(lion?.domain_id).toBe("nature_animals");

      const eiffel = getEntityById("ENT-COU-051", { baseDir: entityDir });
      expect(eiffel).toBeDefined();
      expect(eiffel?.domain_id).toBe("countries_nations");

      const nonExistent = getEntityById("NON-EXISTENT-ID", { baseDir: entityDir });
      expect(nonExistent).toBeUndefined();
    });

    it("automatically detects newly added entities and scales matrix combos dynamically (+8 per entity)", () => {
      const entityDir = path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");
      const tempTestFile = path.join(entityDir, "zz_dynamic_test_entity.json");

      try {
        // Initial baseline is 2,500 entities and 20,000 combos
        const before = calculateMatrixCoverageStats([], { baseDir: entityDir });
        expect(before.total_combos).toBe(20000);

        // Dynamically add a new entity file to the knowledge base
        const newEntity = [
          {
            id: "ENT-DYN-001",
            domain_id: "nature_animals",
            subtopic_id: "mammals",
            name: "Dynamic Test Snow Leopard",
            language: "en",
            visual_anchor: "Cinematic mountain ridge",
            core_traits: ["Ghost of the mountains", "Thick fur"],
            distractor_pool: ["Cheetah", "Jaguar"],
            facts_and_myths: [
              { claim: "Snow leopards cannot roar", verdict: "fact", explanation: "True vocal cord structure" },
            ],
          },
        ];
        writeFileSync(tempTestFile, JSON.stringify(newEntity, null, 2), "utf8");

        // The very next call to calculateMatrixCoverageStats immediately recognizes the addition
        const after = calculateMatrixCoverageStats([], { baseDir: entityDir });
        expect(after.total_combos).toBe(20008); // 2,501 * 8 = 20,008 (+8 combos automatically!)

        const dynamicEntity = getEntityById("ENT-DYN-001", { baseDir: entityDir });
        expect(dynamicEntity).toBeDefined();
        expect(dynamicEntity?.name).toBe("Dynamic Test Snow Leopard");
      } finally {
        if (existsSync(tempTestFile)) {
          unlinkSync(tempTestFile);
        }
        // Cache automatically detects removal and reverts back to 20,000
        const reverted = calculateMatrixCoverageStats([], { baseDir: entityDir });
        expect(reverted.total_combos).toBe(20000);
      }
    });
  });

  // ============================================================================
  // Suite 2: Matrix Coverage Service, Algorithms & Boundary States
  // ============================================================================
  describe("2. Matrix Coverage Service & Least-Variant-First Priority Queue", () => {
    const baseDir = () => path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");

    it("computes exactly 20,000 total combos with 0% coverage on empty question bank", () => {
      const coverage = calculateMatrixCoverageStats([], { baseDir: baseDir() });
      expect(coverage.total_combos).toBe(20000);
      expect(coverage.covered_combos).toBe(0);
      expect(coverage.coverage_percent).toBe(0);
      expect(Object.keys(coverage.by_archetype).length).toBe(8);
      expect(Object.keys(coverage.by_domain).length).toBe(14);
    });

    it("accurately tracks coverage when questions with and without entity_id coexist", () => {
      const questions: BankQuestion[] = [
        {
          id: "Q1",
          entity_id: "ENT-ANI-001",
          archetype_id: "speed_blitz",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          format: "multiple_choice",
          question: "Fastest runner?",
          choices: [
            { id: "A", text: "Cheetah", is_correct: true },
            { id: "B", text: "Lion", is_correct: false },
            { id: "C", text: "Elephant", is_correct: false },
          ],
          correct_choice_id: "A",
          difficulty: 2,
          tags: ["animals"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "Q2",
          archetype_id: "speed_blitz",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          format: "multiple_choice",
          question: "Custom riddle without entity?",
          choices: [
            { id: "A", text: "Yes", is_correct: true },
            { id: "B", text: "No", is_correct: false },
            { id: "C", text: "Maybe", is_correct: false },
          ],
          correct_choice_id: "A",
          difficulty: 1,
          tags: ["custom"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const coverage = calculateMatrixCoverageStats(questions, { baseDir: baseDir() });
      expect(coverage.total_combos).toBe(20000);
      expect(coverage.covered_combos).toBe(1);
      expect(coverage.total_variants).toBe(1);
    });

    it("selectAutoCandidates returns only ungenerated combos (variant_count == 0)", () => {
      const candidates = selectAutoCandidates([], { count: 40, baseDir: baseDir() });
      expect(candidates.length).toBe(40);

      for (const cand of candidates) {
        expect(cand.current_variants).toBe(0);
        expect(cand.entity_id).toBeDefined();
        expect(cand.archetype_id).toBeDefined();
      }
    });

    it("selectAutoCandidates falls back gracefully to Least-Variant-First when combinations are populated", () => {
      const questions: BankQuestion[] = [
        {
          id: "Q_POP",
          entity_id: "ENT-ANI-001",
          archetype_id: "speed_blitz",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          format: "multiple_choice",
          question: "Lion question",
          choices: [{ id: "A", text: "Ans", is_correct: true }, { id: "B", text: "Dist", is_correct: false }, { id: "C", text: "Dist2", is_correct: false }],
          correct_choice_id: "A",
          difficulty: 1,
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const candidates = selectAutoCandidates(questions, {
        count: 5,
        domain_id: "nature_animals",
        archetype_ids: ["speed_blitz"],
        baseDir: baseDir(),
      });
      expect(candidates.length).toBe(5);
      for (const c of candidates) {
        expect(c.current_variants).toBe(0);
        expect(c.entity_id).not.toBe("ENT-ANI-001");
      }
    });

    it("selectManualCandidates strictly implements Least-Variant-First prioritization", () => {
      const mockQuestions: BankQuestion[] = [
        {
          id: "M1",
          entity_id: "ENT-ANI-001",
          archetype_id: "speed_blitz",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          format: "multiple_choice",
          question: "Q1",
          choices: [{ id: "A", text: "A", is_correct: true }, { id: "B", text: "B", is_correct: false }, { id: "C", text: "C", is_correct: false }],
          correct_choice_id: "A",
          difficulty: 1,
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "M2",
          entity_id: "ENT-ANI-001",
          archetype_id: "speed_blitz",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          format: "multiple_choice",
          question: "Q2",
          choices: [{ id: "A", text: "A", is_correct: true }, { id: "B", text: "B", is_correct: false }, { id: "C", text: "C", is_correct: false }],
          correct_choice_id: "A",
          difficulty: 1,
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const candidates = selectManualCandidates(
        mockQuestions,
        {
          count: 10,
          domain_id: "nature_animals",
          archetype_ids: ["speed_blitz"],
          baseDir: baseDir(),
        }
      );

      expect(candidates.length).toBe(10);
      for (const cand of candidates) {
        expect(cand.archetype_id).toBe("speed_blitz");
        expect(cand.current_variants).toBe(0);
      }
    });
  });

  // ============================================================================
  // Suite 3: Reverse Prompt Builder & Safe Output Parsing
  // ============================================================================
  describe("3. Reverse Prompt Builder & Safe Output Parsing", () => {
    const baseDir = () => path.join(workspaceRoot, ".quiz-studio", "knowledge_base", "entities");

    it("buildReverseGenerationPrompt injects entity core traits, facts, and distractor pool", () => {
      const lion = getEntityById("ENT-ANI-001", { baseDir: baseDir() })!;
      expect(lion).toBeDefined();

      const target: TargetEntityForGeneration = {
        entity_id: lion.id,
        name: lion.name,
        domain_id: lion.domain_id,
        subtopic_id: lion.subtopic_id,
        visual_anchor: lion.visual_anchor,
        core_traits: lion.core_traits,
        distractor_pool: lion.distractor_pool,
        facts_and_myths: lion.facts_and_myths,
        versus_candidates: lion.versus_candidates,
      };

      const prompt = buildReverseGenerationPrompt({
        archetypeId: "verdict_fact_myth",
        targets: [target],
        language: "en",
        difficulty: 2,
      });

      expect(prompt).toContain("Target Entity #1");
      expect(prompt).toContain(lion.id);
      expect(prompt).toContain(lion.name);
      expect(prompt).toContain("Core Traits / Clues");
      expect(prompt).toContain("Distractor Pool");
      expect(prompt).toContain("True / False Claims");
      expect(prompt).toContain("verdict_fact_myth");
    });

    it("buildReverseGenerationPrompt injects specialized cognitive reflex trap directive for Speed Blitz", () => {
      const lion = getEntityById("ENT-ANI-001", { baseDir: baseDir() })!;
      expect(lion).toBeDefined();

      const target: TargetEntityForGeneration = {
        entity_id: lion.id,
        name: lion.name,
        domain_id: lion.domain_id,
        subtopic_id: lion.subtopic_id,
        visual_anchor: lion.visual_anchor,
        core_traits: lion.core_traits,
        distractor_pool: lion.distractor_pool,
        facts_and_myths: lion.facts_and_myths,
        versus_candidates: lion.versus_candidates,
      };

      const prompt = buildReverseGenerationPrompt({
        archetypeId: "speed_blitz",
        targets: [target],
        language: "en",
        difficulty: 1,
      });

      expect(prompt).toContain("SPECIALIZED SPEED BLITZ COGNITIVE TRAP DIRECTIVE");
      expect(prompt).toContain("CRITICAL RULE: DO NOT ask dry factual trivia or textbook knowledge about the entity.");
      expect(prompt).toContain("Rate / Multiplier Paradox");
      expect(prompt).toContain("Survival / Permanence Trap");
      expect(prompt).toContain("Shared Attribute Paradox");
      expect(prompt).toContain("TRICK / RIDDLE ANCHOR: Craft a fast-reflex brainteaser or cognitive trap situated around the entity");
    });

    it("buildBatchGenerationPrompt includes canonical golden Speed Blitz brainteasers when archetype is speed_blitz", () => {
      const prompt = buildBatchGenerationPrompt({
        archetypeId: "speed_blitz",
        domainId: "logic_puzzles",
        subtopicId: "tricky_riddles",
        count: 5,
        language: "en",
        difficulty: 2,
      });

      expect(prompt).toContain("GOLDEN SPEED BLITZ PARADIGMS (TOP ENGAGEMENT EXAMPLES)");
      expect(prompt).toContain("A wooden stick has 2 ends. How many ends does half a stick have?");
      expect(prompt).toContain("A family has 6 sons, each with 1 sister. How many kids total?");
      expect(prompt).toContain("A man walks in the rain with no umbrella, yet no hair gets wet. Why?");
      expect(prompt).toContain("You pass the person in second place in a race. What place are you?");
    });

    it("parseReverseBatchGenerationOutput pairs questions to candidates and binds entity_id", () => {
      const targets: TargetEntityForGeneration[] = [
        {
          entity_id: "ENT-ANI-001",
          name: "Lion",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          visual_anchor: "Cinematic portrait",
          core_traits: ["Apex predator", "Pride leader"],
          distractor_pool: ["Tiger", "Leopard"],
          facts_and_myths: [{ claim: "Lions live in prides", verdict: "fact", explanation: "Verified" }],
        },
      ];

      const rawLlmResponse = JSON.stringify([
        {
          entity_id: "ENT-ANI-001",
          question: "Do male lions do most of the hunting in a pride? Fact or Myth?",
          format: "true_false",
          choices: [
            { id: "A", text: "True", is_correct: false },
            { id: "B", text: "False", is_correct: true },
          ],
          correct_choice_id: "B",
          explanation: "Female lions do roughly 90% of the pride's hunting.",
          thinking_seconds: 5,
          visual_spec: { intent: "question_illustration", prompt: "A pride of lions on the savannah" },
          difficulty: 2,
          tags: ["animals"],
        },
      ]);

      const parsed = parseReverseBatchGenerationOutput(rawLlmResponse, targets, {
        archetypeId: "verdict_fact_myth",
      });

      expect(parsed.length).toBe(1);
      expect(parsed[0].entity_id).toBe("ENT-ANI-001");
      expect(parsed[0].archetype_id).toBe("verdict_fact_myth");
      expect(parsed[0].domain_id).toBe("nature_animals");
      expect(parsed[0].status).toBe("approved");
    });

    it("gracefully tolerates corrupted choices or missing fields without throwing", () => {
      const targets: TargetEntityForGeneration[] = [
        {
          entity_id: "ENT-ANI-002",
          name: "Tiger",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          visual_anchor: "Visual anchor",
          core_traits: ["Solitary"],
          facts_and_myths: [],
        },
      ];

      const corruptedOutput = '```json\n[ { "broken_field": 123 } ]\n```';
      const parsed = parseReverseBatchGenerationOutput(corruptedOutput, targets, {
        archetypeId: "speed_blitz",
      });

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  // ============================================================================
  // Suite 4: 20-Question Chunking Engine & In-Flight State
  // ============================================================================
  describe("4. 20-Question Chunking Engine & In-Flight State", () => {
    it("handles batch generation with progress reporting via candidate override", async () => {
      // Create 5 genuinely distinct questions to ensure they pass Auto-QA without deduplication collisions
      const distinctQuestionsData = [
        {
          q: "Which apex feline predator is famously recognized as king of the jungle?",
          ans: "African Lion",
          dist1: "Bengal Tiger",
          dist2: "Snow Leopard",
          exp: "Lions live in family prides and are dominant apex predators.",
        },
        {
          q: "What is the fastest land animal capable of sprinting over 60 mph?",
          ans: "Cheetah",
          dist1: "Pronghorn",
          dist2: "Greyhound",
          exp: "Cheetahs achieve explosive acceleration on open savannahs.",
        },
        {
          q: "Which giant herbivore possesses an elongated trunk and large ivory tusks?",
          ans: "African Elephant",
          dist1: "Hippopotamus",
          dist2: "White Rhinoceros",
          exp: "Elephants use their versatile trunks for breathing, drinking, and grasping.",
        },
        {
          q: "What marine mammal communicates through complex melodic underwater songs?",
          ans: "Humpback Whale",
          dist1: "Bottlenose Dolphin",
          dist2: "Orca Killer Whale",
          exp: "Male humpbacks sing elaborate songs repeated for hours during breeding.",
        },
        {
          q: "Which nocturnal bird of prey can rotate its head up to 270 degrees?",
          ans: "Barn Owl",
          dist1: "Bald Eagle",
          dist2: "Peregrine Falcon",
          exp: "Specialized neck vertebrae allow owls to turn their heads without moving their bodies.",
        },
      ];

      const mockCandidates: BankQuestion[] = distinctQuestionsData.map((d, i) => ({
        id: `CHUNK-VERIF-${Date.now()}-${i}`,
        entity_id: `ENT-ANI-00${i + 1}`,
        archetype_id: "speed_blitz",
        domain_id: "nature_animals",
        subtopic_id: "mammals",
        format: "multiple_choice",
        question: d.q,
        choices: [
          { id: "A", text: d.ans, is_correct: true },
          { id: "B", text: d.dist1, is_correct: false },
          { id: "C", text: d.dist2, is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: d.exp,
        thinking_seconds: 4,
        difficulty: 2,
        tags: ["verification"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const progressCalls: QuestionBankChunkProgress[] = [];

      const result = await generateQuestionBankBatch(app.repository, {
        mode: "auto",
        count: 5,
        rawCandidatesOverride: mockCandidates,
        persist: false,
        onChunkProgress: (p) => progressCalls.push(p),
      });

      expect(result.success).toBe(true);
      expect(result.generatedCount).toBe(5);
      expect(result.approvedCount).toBe(5);
      expect(result.rejectedCount).toBe(0);
      expect(result.matrixCoverage).toBeDefined();
      expect(result.matrixCoverage?.total_combos).toBe(20000);

      expect(progressCalls.length).toBeGreaterThan(0);
      const lastProgress = progressCalls[progressCalls.length - 1];
      expect(lastProgress.completedCount).toBe(5);
    });

    it("falls back to standard generation when custom subtopic is not in knowledge base", async () => {
      const customSubtopicCandidate: BankQuestion = {
        id: `CUSTOM-SUBTOPIC-${Date.now()}`,
        archetype_id: "speed_blitz",
        domain_id: "nature_animals",
        subtopic_id: "custom_exotic_subtopic_outside_kb",
        format: "multiple_choice",
        question: "Custom exotic subtopic question?",
        choices: [
          { id: "A", text: "Opt 1", is_correct: true },
          { id: "B", text: "Opt 2", is_correct: false },
          { id: "C", text: "Opt 3", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Fallback path works seamlessly.",
        thinking_seconds: 4,
        difficulty: 1,
        tags: ["fallback"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await generateQuestionBankBatch(app.repository, {
        mode: "manual",
        archetypeId: "speed_blitz",
        domainId: "nature_animals",
        subtopicId: "custom_exotic_subtopic_outside_kb",
        count: 1,
        rawCandidatesOverride: [customSubtopicCandidate],
        persist: false,
      });

      expect(result.success).toBe(true);
      expect(result.approvedCount).toBe(1);
      expect(result.savedQuestions[0].subtopic_id).toBe("custom_exotic_subtopic_outside_kb");
    });
  });

  // ============================================================================
  // Suite 5: REST API Integration & Error Handling
  // ============================================================================
  describe("5. REST API Integration & Error Handling", () => {
    it("GET /api/question-bank/matrix-coverage returns 200 with complete MatrixCoverageStats", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: "/api/question-bank/matrix-coverage",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.coverage).toBeDefined();
      expect(body.coverage.total_combos).toBe(20000);
      expect(body.coverage.total_variants).toBeGreaterThanOrEqual(0);
      expect(body.coverage.covered_combos).toBeGreaterThanOrEqual(0);
      expect(typeof body.coverage.coverage_percent).toBe("number");
      expect(Object.keys(body.coverage.by_archetype).length).toBe(8);
      expect(Object.keys(body.coverage.by_domain).length).toBe(14);
    });

    it("POST /api/question-bank/generate-batch returns 503 when AI client is unavailable and no candidates provided", async () => {
      const isolatedServer = Fastify();
      await isolatedServer.register(registerQuestionBankRoutes({ repository: app.repository }));

      const res = await isolatedServer.inject({
        method: "POST",
        url: "/api/question-bank/generate-batch",
        payload: {
          archetype_id: "speed_blitz",
          domain_id: "nature_animals",
          subtopic_id: "mammals",
          count: 5,
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.code).toBe("AI_CLIENT_UNAVAILABLE");
    });

    it("POST /api/question-bank/generate-batch handles candidate override and returns matrix coverage", async () => {
      const candidate: BankQuestion = {
        id: `REST-API-E2E-${Date.now()}`,
        entity_id: "ENT-ANI-001",
        archetype_id: "speed_blitz",
        domain_id: "nature_animals",
        subtopic_id: "mammals",
        format: "multiple_choice",
        question: "Rest API E2E test question?",
        choices: [
          { id: "A", text: "Alpha", is_correct: true },
          { id: "B", text: "Beta", is_correct: false },
          { id: "C", text: "Gamma", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "REST API injection succeeded.",
        thinking_seconds: 4,
        difficulty: 2,
        tags: ["e2e"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const res = await app.server.inject({
        method: "POST",
        url: "/api/question-bank/generate-batch",
        payload: {
          mode: "auto",
          count: 1,
          candidates: [candidate],
          persist: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.approvedCount).toBe(1);
      expect(body.matrixCoverage).toBeDefined();
      expect(body.matrixCoverage.total_combos).toBe(20000);
    });
  });
});
