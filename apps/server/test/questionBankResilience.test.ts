import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  QUIZ_GAMEPLAY_ARCHETYPES,
  EpisodeSchema,
  QuizV2Schema,
  DirectorPlanSchema,
  type BankQuestion,
  type QuizQuestion,
} from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { convertBankQuestionToQuizQuestion, createEpisodeFromQuestionBank } from "../src/quiz/bank/questionBankToQuizBridge.js";
import { runAutoQaOnQuestion } from "../src/quiz/bank/questionBankAutoQa.js";
import { parseTranscreationOutput } from "../src/quiz/bank/transcreation/transcreationPrompt.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

describe("Question Bank Resilience, Edge-Cases & System Coordination", () => {
  let app: StudioApp;
  let testChannelId: string;
  let secondaryChannelId: string;
  let tempStorage: string;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    app = await buildApp(curr);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "qb-resilience-storage-"));
    app.repository.setStorageRoot(tempStorage);

    const channel1 = await app.repository.createChannel({
      name: "Resilience Channel A",
      language: "Vietnamese",
    });
    testChannelId = channel1.channel_id;

    const channel2 = await app.repository.createChannel({
      name: "Resilience Channel B",
      language: "Vietnamese",
    });
    secondaryChannelId = channel2.channel_id;
  });

  afterAll(async () => {
    await app.close();
    if (tempStorage) {
      await rm(tempStorage, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe("1. Defensive Question Conversion Edge-Cases", () => {
    it("handles completely empty choices array by synthesizing valid options", () => {
      const bankQ: BankQuestion = {
        id: "EDGE-EMPTY-CHOICES",
        archetype_id: "quick_fire_trivia",
        domain_id: "general_knowledge",
        subtopic_id: "curious_facts",
        question: "What is the capital of France?",
        format: "multiple_choice",
        choices: [],
        correct_choice_id: "",
        explanation: "The capital of France is Paris.",
        difficulty: 2,
        status: "approved",
        tags: ["geo"],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.choices).toHaveLength(3);
      expect(quizQ.choices.map((c) => c.id)).toEqual(["a", "b", "c"]);
      expect(quizQ.correct_choice_id).toBe("a");
      expect(quizQ.question).toBe("What is the capital of France?");
    });

    it("handles single choice by auto-padding required distracters", () => {
      const bankQ: BankQuestion = {
        id: "EDGE-SINGLE-CHOICE",
        archetype_id: "deep_dive_curiosity",
        domain_id: "science_tech",
        subtopic_id: "space_universe",
        question: "Which planet is closest to the Sun?",
        format: "multiple_choice",
        choices: [{ id: "c1", text: "Mercury", is_correct: true }],
        correct_choice_id: "c1",
        explanation: "Mercury is the closest planet to the Sun.",
        difficulty: 2,
        status: "approved",
        tags: ["space"],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.choices).toHaveLength(3);
      expect(quizQ.choices.some((c) => c.text === "Mercury")).toBe(true);
      expect(quizQ.correct_choice_id).toBeTruthy();
    });

    it("de-duplicates identical or case-insensitive duplicate choice texts", () => {
      const bankQ: BankQuestion = {
        id: "EDGE-DUPLICATES",
        archetype_id: "quick_fire_trivia",
        domain_id: "general_knowledge",
        subtopic_id: "curious_facts",
        question: "Which of these is a national capital?",
        format: "multiple_choice",
        choices: [
          { id: "1", text: "Paris", is_correct: true },
          { id: "2", text: "paris", is_correct: false },
          { id: "3", text: "  PARIS  ", is_correct: false },
        ],
        correct_choice_id: "1",
        explanation: "Paris is the capital of France.",
        difficulty: 2,
        status: "approved",
        tags: [],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.choices).toHaveLength(3);
      const textSet = new Set(quizQ.choices.map((c) => c.text.toLowerCase()));
      expect(textSet.size).toBe(3); // Fully disambiguated
    });

    it("clamps extreme question and explanation lengths to schema limits", () => {
      const longText = "A".repeat(1000);
      const bankQ: BankQuestion = {
        id: "EDGE-EXTREME-LENGTH",
        archetype_id: "quick_fire_trivia",
        domain_id: "general_knowledge",
        subtopic_id: "curious_facts",
        question: longText,
        format: "multiple_choice",
        choices: [
          { id: "1", text: "Choice " + longText, is_correct: true },
          { id: "2", text: "Option B", is_correct: false },
          { id: "3", text: "Option C", is_correct: false },
        ],
        correct_choice_id: "1",
        explanation: longText,
        fun_fact: longText,
        difficulty: 999, // Should clamp to 5
        status: "approved",
        tags: [],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.question.length).toBeLessThanOrEqual(320);
      expect(quizQ.explanation.length).toBeLessThanOrEqual(600);
      expect((quizQ.fun_fact || "").length).toBeLessThanOrEqual(600);
      expect(quizQ.choices[0].text.length).toBeLessThanOrEqual(180);
      expect(quizQ.difficulty).toBe(5);
    });

    it("handles true_false with single choice or flipped distracter order cleanly", () => {
      const bankQ: BankQuestion = {
        id: "EDGE-TF-SINGLE",
        archetype_id: "myth_busters",
        domain_id: "nature_animals",
        subtopic_id: "ocean_giants",
        question: "Cá mập không có xương?",
        format: "true_false",
        choices: [{ id: "c1", text: "Đúng", is_correct: true }],
        correct_choice_id: "c1",
        explanation: "Cá mập chỉ có khung sụn.",
        difficulty: 1,
        status: "approved",
        tags: [],
      };

      const quizQ = convertBankQuestionToQuizQuestion(bankQ);
      expect(quizQ.format).toBe("true_false");
      expect(quizQ.choices).toHaveLength(2);
      expect(quizQ.choices.map((c) => c.id)).toEqual(["a", "b"]);
    });
  });

  describe("2. Cooldown Collision & Force Override", () => {
    const testQ: BankQuestion = {
      id: "RES-COOLDOWN-001",
      archetype_id: "mystery_reveal",
      domain_id: "nature_animals",
      subtopic_id: "ocean_giants",
      language: "en",
      question: "Which creature glows in the deep dark ocean depths?",
      format: "multiple_choice",
      choices: [
        { id: "a", text: "Anglerfish", is_correct: true },
        { id: "b", text: "Clownfish", is_correct: false },
        { id: "c", text: "Salmon", is_correct: false },
      ],
      correct_choice_id: "a",
      explanation: "The anglerfish uses a bioluminescent lure to attract prey.",
      difficulty: 3,
      status: "approved",
      tags: ["deepsea"],
    };

    beforeAll(async () => {
      await app.repository.saveQuestionBankQuestion(testQ);
    });

    it("allows initial episode creation on testChannelId and puts question on cooldown", async () => {
      const res = await createEpisodeFromQuestionBank({
        repository: app.repository,
        channelId: testChannelId,
        input: {
          question_id: testQ.id,
          auto_start_pipeline: false,
        },
      });

      expect(res.episode).toBeDefined();
      expect(res.cooldown_recorded).toBe(true);

      // Verify cooldown is now active for testChannelId
      const fetched = await app.repository.getQuestionBankQuestion(testQ.id, testChannelId);
      expect(fetched?.channel_cooldown?.is_cooldown).toBe(true);
    });

    it("rejects reuse on same channel without force flag (409 QUESTION_IN_COOLDOWN)", async () => {
      await expect(
        createEpisodeFromQuestionBank({
          repository: app.repository,
          channelId: testChannelId,
          input: {
            question_id: testQ.id,
            auto_start_pipeline: false,
            force: false,
          },
        }),
      ).rejects.toThrow("in 30-day cooldown");
    });

    it("allows reuse on same channel when force=true is explicitly passed", async () => {
      const res = await createEpisodeFromQuestionBank({
        repository: app.repository,
        channelId: testChannelId,
        input: {
          question_id: testQ.id,
          auto_start_pipeline: false,
          force: true,
        },
      });

      expect(res.episode).toBeDefined();
      expect(res.cooldown_recorded).toBe(true);
    });

    it("allows creation on secondaryChannelId where question is NOT on cooldown", async () => {
      const res = await createEpisodeFromQuestionBank({
        repository: app.repository,
        channelId: secondaryChannelId,
        input: {
          question_id: testQ.id,
          auto_start_pipeline: false,
          force: false, // does not need force on channel B!
        },
      });

      expect(res.episode).toBeDefined();
      expect(res.cooldown_recorded).toBe(true);
    });
  });

  describe("3. Archetype-to-Pipeline Compatibility across ALL 8 Archetypes", () => {
    it.each(QUIZ_GAMEPLAY_ARCHETYPES)("synthesizes valid Episode, Quiz and DirectorPlan for $id", async (archetypeMeta) => {
      const q: BankQuestion = {
        id: `ARCH-${archetypeMeta.id.toUpperCase()}`,
        archetype_id: archetypeMeta.id,
        domain_id: "science_tech",
        subtopic_id: "space_universe",
        language: "en",
        question: `Test question for archetype ${archetypeMeta.name}?`,
        format: archetypeMeta.defaultFormat,
        choices:
          archetypeMeta.defaultFormat === "true_false" || archetypeMeta.id === "versus_faceoff"
            ? [
                { id: "1", text: "Option 1", is_correct: true },
                { id: "2", text: "Option 2", is_correct: false },
              ]
            : [
                { id: "1", text: "Option 1", is_correct: true },
                { id: "2", text: "Option 2", is_correct: false },
                { id: "3", text: "Option 3", is_correct: false },
              ],
        correct_choice_id: "1",
        explanation: "Test explanation for archetype validation.",
        fun_fact: "Interesting scientific fact.",
        difficulty: 2,
        status: "approved",
        tags: [],
      };

      await app.repository.saveQuestionBankQuestion(q);

      const result = await createEpisodeFromQuestionBank({
        repository: app.repository,
        channelId: testChannelId,
        input: {
          question_id: q.id,
          auto_start_pipeline: false,
          force: true,
        },
      });

      expect(EpisodeSchema.safeParse(result.episode).success).toBe(true);
      expect(QuizV2Schema.safeParse(result.quiz).success).toBe(true);
      expect(DirectorPlanSchema.safeParse(result.director_plan).success).toBe(true);
      expect(result.director_plan.beats[0].layout_id).toBe(archetypeMeta.targetLayout);
      expect(result.episode.quiz_config.target_layout).toBe(archetypeMeta.targetLayout);
    });
  });

  describe("4. Concurrency Stress Test on Question History Writes", () => {
    it("serializes 10 concurrent appendQuestionHistory writes without data corruption", async () => {
      const concurrencyChannel = await app.repository.createChannel({
        name: "Concurrency Test Channel",
        language: "Vietnamese",
      });

      const promises = Array.from({ length: 10 }).map((_, idx) => {
        const dummyQuestion: QuizQuestion = {
          id: `CONCURRENT-Q-${idx}`,
          number: 1,
          format: "multiple_choice",
          difficulty: 2,
          question: `Concurrent Question ${idx}?`,
          choices: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" },
          ],
          correct_choice_id: "a",
          explanation: `Explanation ${idx}`,
          source_ids: [],
          validation: {
            semantic_status: "validated",
            source_coverage: false,
            fact_locked: true,
          },
        };

        return app.repository.appendQuestionHistory(concurrencyChannel.channel_id, `ep_concurrent_${idx}`, [dummyQuestion]);
      });

      await Promise.all(promises);

      const history = await app.repository.readQuestionHistory(concurrencyChannel.channel_id);
      expect(history.length).toBe(10);
      const ids = new Set(history.map((q) => q.question_id));
      expect(ids.size).toBe(10);
    });
  });

  describe("5. REST API Route Error Mapping & Status Codes", () => {
    it("returns 404 QUESTION_NOT_FOUND when question does not exist", async () => {
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${testChannelId}/question-bank/create-episode`,
        payload: {
          question_id: "NON-EXISTENT-QUESTION-ID",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("QUESTION_NOT_FOUND");
    });

    it("returns 404 CHANNEL_NOT_FOUND when channel does not exist", async () => {
      const response = await app.server.inject({
        method: "POST",
        url: "/api/channels/ch_nonexistent_123/question-bank/create-episode",
        payload: {
          question_id: "RES-COOLDOWN-001",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("CHANNEL_NOT_FOUND");
    });

    it("returns 409 QUESTION_IN_COOLDOWN when attempting to reuse without force", async () => {
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${testChannelId}/question-bank/create-episode`,
        payload: {
          question_id: "RES-COOLDOWN-001",
          force: false,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("QUESTION_IN_COOLDOWN");
      expect(body.error).toContain("30-day cooldown");
    });

    it("returns 201 Created when reusing with force=true", async () => {
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${testChannelId}/question-bank/create-episode`,
        payload: {
          question_id: "RES-COOLDOWN-001",
          force: true,
          auto_start_pipeline: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.episode).toBeDefined();
      expect(body.cooldown_recorded).toBe(true);
    });
  });

  describe("6. Auto-QA Ingestion Fault Resilience", () => {
    it("flags candidates with missing fields or corrupt choices gracefully without crashing", () => {
      const corruptCandidate: any = {
        id: "CORRUPT-CANDIDATE",
        format: "multiple_choice",
        choices: [{ id: "A", text: "" }], // missing choices, empty text
        correct_choice_id: "Z", // non-existent
      };

      const result = runAutoQaOnQuestion(corruptCandidate);
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("passes a well-formed candidate with high QA score", () => {
      const validCandidate: any = {
        id: "VALID-CANDIDATE",
        format: "multiple_choice",
        question: "How do dolphins navigate and locate objects underwater?",
        choices: [
          { id: "A", text: "Echolocation sound pulses", is_correct: true },
          { id: "B", text: "Infrared thermal vision", is_correct: false },
          { id: "C", text: "Magnetic field sensing", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Dolphins emit clicking sound pulses and listen to the returning echoes to detect prey.",
        fun_fact: "Each dolphin has a unique signature whistle equivalent to an individual name.",
        difficulty: 2,
      };

      const result = runAutoQaOnQuestion(validCandidate);
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("7. Multilingual Transcreation Bridge Resilience & Edge-Cases", () => {
    const sampleEnQuestion: BankQuestion = {
      id: "RES-TRANS-001",
      archetype_id: "verdict_fact_myth",
      domain_id: "nature_animals",
      subtopic_id: "ocean_giants",
      language: "en",
      question: "Are blue whales the largest animals ever known to have lived on Earth?",
      format: "true_false",
      choices: [
        { id: "A", text: "TRUE", is_correct: true },
        { id: "B", text: "FALSE", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Blue whales can reach lengths of up to 30 meters.",
      fun_fact: "A blue whale heart can weigh over 400 pounds.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Ultra-realistic underwater photograph of a gigantic blue whale in deep sapphire ocean.",
        aspect_ratio: "16:9",
      },
      difficulty: 2,
      status: "approved",
      tags: ["ocean", "mammals"],
    };

    it("normalizes case-insensitive choice IDs and re-aligns them to source IDs in parseTranscreationOutput", () => {
      const llmOutput = JSON.stringify({
        language: "es",
        question: "¿Es la ballena azul el animal más grande que ha existido en la Tierra?",
        choices: [
          { id: "a", text: "VERDADERO" },
          { id: "b", text: "FALSO" },
        ],
        explanation: "La ballena azul puede medir hasta 30 metros.",
        fun_fact: "El corazón de una ballena azul puede pesar más de 180 kg.",
        verified: true,
      });

      const parsed = parseTranscreationOutput(llmOutput, sampleEnQuestion);
      expect(parsed.language).toBe("es");
      expect(parsed.choices).toHaveLength(2);
      expect(parsed.choices[0].id).toBe("A");
      expect(parsed.choices[1].id).toBe("B");
      expect(parsed.choices[0].text).toBe("VERDADERO");
    });

    it("matches choices case-insensitively and falls back gracefully in convertBankQuestionToQuizQuestion", () => {
      const localized = convertBankQuestionToQuizQuestion(sampleEnQuestion, {
        language: "es",
        translation: {
          language: "es",
          question: "¿Es la ballena azul el animal más grande?",
          choices: [
            { id: "a", text: "Totalmente Verdadero" },
            { id: "b", text: "Falso total" },
          ],
          explanation: "Explicación en español",
          verified: true,
        },
      });

      expect(localized.question).toBe("¿Es la ballena azul el animal más grande?");
      expect(localized.choices).toHaveLength(2);
      expect(localized.choices.map((c) => c.text)).toEqual(["Totalmente Verdadero", "Falso total"]);
    });

    it("preserves 100% English visual prompt invariant when converting translated question", () => {
      const localized = convertBankQuestionToQuizQuestion(sampleEnQuestion, {
        language: "es",
        translation: {
          language: "es",
          question: "¿Es la ballena azul...?",
          choices: [
            { id: "A", text: "Verdadero" },
            { id: "B", text: "Falso" },
          ],
          explanation: "Explicación",
          verified: true,
        },
      });

      expect(localized.visual_opportunity).toBe(sampleEnQuestion.visual_spec?.prompt);
    });

    it("falls back to offline deterministic translation if dynamic LLM transcreation throws", async () => {
      const testQ: BankQuestion = {
        id: "RES-TRANS-FAILOVER-001",
        archetype_id: "speed_blitz",
        domain_id: "nature_animals",
        subtopic_id: "ocean_giants",
        language: "en",
        question: "What is the fastest land animal?",
        format: "multiple_choice",
        choices: [
          { id: "1", text: "Cheetah", is_correct: true },
          { id: "2", text: "Lion", is_correct: false },
          { id: "3", text: "Gazelle", is_correct: false },
        ],
        correct_choice_id: "1",
        explanation: "The cheetah can reach speeds of 70 mph.",
        difficulty: 1,
        status: "approved",
        tags: ["animals"],
      };

      await app.repository.saveQuestionBankQuestion(testQ);

      const failingLLM: LLMClient = {
        generateStream: () => {
          throw new Error("LLM Gateway 504 Gateway Timeout");
        },
      };

      const res = await createEpisodeFromQuestionBank({
        repository: app.repository,
        channelId: testChannelId,
        input: {
          question_id: testQ.id,
          target_language: "es",
          auto_start_pipeline: false,
          force: true,
        },
        llmClient: failingLLM,
      });

      expect(res.episode).toBeDefined();
      expect(res.quiz).toBeDefined();
      expect(res.quiz.questions).toHaveLength(1);
      expect(res.quiz.questions[0].question).toContain("[ES]");
      expect(res.quiz.questions[0].choices[0].text).toContain("[ES]");
    });

    it("correctly routes voice copy, question prompts, and outro across various language strings", () => {
      const sampleQuiz = {
        schema_version: 2 as const,
        episode_id: "ep_test_en",
        age_band: "family" as const,
        language: "en-US",
        questions: [
          {
            id: "q1",
            number: 1,
            format: "multiple_choice" as const,
            difficulty: 2,
            question: "What is the capital of France?",
            choices: [
              { id: "a", text: "Paris" },
              { id: "b", text: "London" },
              { id: "c", text: "Berlin" },
            ],
            correct_choice_id: "a",
            explanation: "Paris is the capital of France.",
            source_ids: [],
            validation: { semantic_status: "validated" as const, source_coverage: false, fact_locked: true },
          },
        ],
      };

      const voicePlan = buildQuizVoicePlan(sampleQuiz);
      const choiceSeg = voicePlan.segments.find((s) => s.role === "choice");
      expect(choiceSeg?.text).toContain(", or Berlin?");
      const outroSeg = voicePlan.segments.find((s) => s.role === "outro");
      expect(outroSeg?.text).toContain("How many did you get right?");
    });
  });
});
