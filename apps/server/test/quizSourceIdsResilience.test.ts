import { describe, expect, it, vi } from "vitest";
import { makeAuthorizedBankQuestion } from "./helpers/authorizedContentFixtures.js";
import { convertBankQuestionToQuizQuestionLossless, convertBankQuestionToQuizQuestion } from "../src/quiz/bank/bridge/bankQuestionConverter.js";
import { assessSemanticQa } from "../src/quiz/qa/stages/assessSemanticQa.js";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";
import { executeQuizQaGatesWithHealing } from "../src/tasks/pipeline/quizPipelineVoiceStep.js";
import { QuizV2Schema, type Task } from "@studio/shared";

describe("Quiz Source IDs Resilience and Preflight Safety", () => {
  it("populates source_ids and marks source_coverage true during bank question conversion", () => {
    const bankQuestion = makeAuthorizedBankQuestion("Mario");
    const lossless = convertBankQuestionToQuizQuestionLossless(bankQuestion);
    expect(lossless.source_ids.length).toBeGreaterThan(0);
    expect(lossless.source_ids).toContain("C01");
    expect(lossless.source_ids).toContain(bankQuestion.id);
    expect(lossless.validation.source_coverage).toBe(true);

    const standard = convertBankQuestionToQuizQuestion(bankQuestion);
    expect(standard.source_ids.length).toBeGreaterThan(0);
    expect(standard.source_ids).toContain("C01");
    expect(standard.validation.source_coverage).toBe(true);

    const quiz = QuizV2Schema.parse({
      schema_version: 2,
      episode_id: "test-ep",
      age_band: "7-9",
      language: "en",
      questions: [lossless],
    });

    const issues = assessSemanticQa(quiz);
    expect(issues.some((issue) => issue.code === "semantic_sources_missing")).toBe(false);
  });

  it("derives fallback claim IDs when scenes omit source_ids", () => {
    const quiz = deriveQuizV2FromScenes({
      episodeId: "test-ep-scenes",
      language: "en",
      ageBand: "7-9",
      format: "multiple_choice",
      scenes: [
        {
          scene_id: "scene-1",
          episode_id: "test-ep-scenes",
          scene_number: 1,
          duration_seconds: 7.5,
          dialogue: "Which ocean is largest? Pacific Ocean. It is massive.",
          visual_prompt: "Bright ocean globe",
          transition_note: "",
          continuity_note: "",
          quiz: {
            phase: "question",
            question_number: 1,
            question: "Which ocean is largest?",
            choices: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean"],
            answer: "Pacific Ocean",
            explanation: "It is massive.",
            image_prompt: "A beautiful globe",
          },
        },
      ],
    });

    expect(quiz.questions[0].source_ids).toEqual(["C01"]);
    expect(quiz.questions[0].validation.source_coverage).toBe(true);

    const issues = assessSemanticQa(quiz);
    expect(issues.some((issue) => issue.code === "semantic_sources_missing")).toBe(false);
  });

  it("auto-heals missing source IDs during QA gates rather than throwing QA blockers", async () => {
    const brokenQuiz = QuizV2Schema.parse({
      schema_version: 2,
      episode_id: "test-heal",
      age_band: "7-9",
      language: "en",
      questions: [
        {
          id: "q-01",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which mammal can fly?",
          choices: [
            { id: "c1", text: "Bat" },
            { id: "c2", text: "Cat" },
            { id: "c3", text: "Dog" },
          ],
          correct_choice_id: "c1",
          explanation: "Bats are the only mammals capable of true flight.",
          fun_fact: "",
          source_ids: [],
          visual_opportunity: "A cute brown bat",
          validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
        },
      ],
    });

    const writtenQuizzes: any[] = [];
    let currentQuiz = brokenQuiz;
    const mockRepo: any = {
      getChannel: vi.fn().mockResolvedValue({ language: "en", mascot_id: null }),
      readQuiz: vi.fn(() => Promise.resolve(currentQuiz)),
      readHistoryCheck: vi.fn().mockResolvedValue(null),
      readDirectorPlan: vi.fn().mockResolvedValue(null),
      readAssetPlan: vi.fn().mockResolvedValue(null),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      readVoicePlan: vi.fn().mockResolvedValue(null),
      readQuizTimeline: vi.fn().mockResolvedValue(null),
      readQuizAssessment: vi.fn().mockResolvedValue(null),
      readVideoDescription: vi.fn().mockResolvedValue(null),
      writeQuiz: vi.fn((_c, _e, q) => {
        currentQuiz = q;
        writtenQuizzes.push(q);
        return Promise.resolve("path");
      }),
      writeQuizAssessment: vi.fn().mockResolvedValue("qa-path"),
      invalidateQuizArtifacts: vi.fn().mockResolvedValue(["assessment"]),
    };

    const mockRuntime: any = {
      update: vi.fn(),
      logger: { warn: vi.fn() },
      repository: mockRepo,
    };

    const task: Task = {
      task_id: "task-test",
      channel_id: "ch-test",
      episode_id: "test-heal",
      task_type: "GENERATE_PIPELINE",
      status: "RUNNING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payload: {},
    };

    const initialArtifacts: any = {
      quiz: brokenQuiz,
      assessment: {
        schema_version: 2,
        episode_id: "test-heal",
        assessed_at: new Date().toISOString(),
        score: 70,
        rating: "needs_revision",
        categories: { semantic: 50, visual: 100, pacing: 100, audio: 100, variety: 100 },
        issues: [
          {
            code: "semantic_sources_missing",
            severity: "blocker",
            message: "Question 1 has no source IDs.",
            next_action: "Attach source IDs from the research ledger before rendering.",
            question_ids: ["q-01"],
            stage: "semantic",
          },
        ],
      },
    };

    const input: any = {
      repository: mockRepo,
      channelId: "ch-test",
      episodeId: "test-heal",
      config: {},
    };

    await executeQuizQaGatesWithHealing(
      mockRuntime,
      task,
      input,
      initialArtifacts,
      3
    );

    expect(mockRepo.writeQuiz).toHaveBeenCalled();
    expect(writtenQuizzes.length).toBeGreaterThan(0);
    expect(writtenQuizzes[0].questions[0].source_ids).toEqual(["C01"]);
    expect(writtenQuizzes[0].questions[0].validation.source_coverage).toBe(true);
  });
});
