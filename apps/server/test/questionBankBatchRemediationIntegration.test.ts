import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import type { BankQuestion } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { generateQuestionBankBatch } from "../src/quiz/bank/questionBankBatchService.js";
import { convertBankQuestionToQuizQuestionLossless } from "../src/quiz/bank/bridge/bankQuestionConverter.js";

describe("Question Bank Batch Auto-Remediation Pre-Asset Integration (Phase 6)", () => {
  let app: StudioApp;
  let tempRoot: string;

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "qb-batch-remed-"));
    app = await buildApp(tempRoot);
  });

  afterAll(async () => {
    await app.close();
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("automatically remediates leaked questions in batch, updates visual specs, and persists approved questions", async () => {
    const cleanQuestion: BankQuestion = {
      id: "CLEAN-OCEAN-01",
      archetype_id: "deep_trivia",
      domain_id: "nature_animals",
      subtopic_id: "ocean_giants",
      language: "en",
      format: "multiple_choice",
      question: "Which ocean is the deepest and largest on planet Earth?",
      choices: [
        { id: "A", text: "Pacific Ocean", is_correct: true },
        { id: "B", text: "Atlantic Ocean", is_correct: false },
        { id: "C", text: "Indian Ocean", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "The Pacific Ocean covers over 30 percent of the Earth's surface.",
      fun_fact: "The Mariana Trench in the Pacific reaches a depth of nearly 11,000 meters.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Deep blue Pacific ocean with underwater trench rays",
        aspect_ratio: "16:9",
      },
      difficulty: 1,
      thinking_seconds: 5,
      status: "draft",
    };

    const pinocchioLeaked: BankQuestion = {
      id: "PINOCCHIO-LEAK-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "classic_fairytales",
      language: "en",
      format: "multiple_choice",
      question: "In Pinocchio, who is this puppet boy?",
      choices: [
        { id: "A", text: "Pinocchio", is_correct: true },
        { id: "B", text: "Geppetto", is_correct: false },
        { id: "C", text: "Jiminy Cricket", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Pinocchio is the main wooden puppet.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Pinocchio smiling on a workbench",
        aspect_ratio: "16:9",
      },
      difficulty: 2,
      thinking_seconds: 5,
      status: "draft",
    };

    const cinderellaLeaked: BankQuestion = {
      id: "CINDERELLA-LEAK-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "classic_fairytales",
      language: "en",
      format: "multiple_choice",
      question: "In Cinderella, who lost a glass slipper?",
      choices: [
        { id: "A", text: "Cinderella", is_correct: true },
        { id: "B", text: "Fairy Godmother", is_correct: false },
        { id: "C", text: "Lady Tremaine", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Cinderella lost her shoe at midnight.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Cinderella standing in her blue ballgown",
        aspect_ratio: "16:9",
      },
      difficulty: 2,
      thinking_seconds: 5,
      status: "draft",
    };

    const mockLlmClient: LLMClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      generateContent: vi.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Original Question: "In Pinocchio')) {
          return {
            text: JSON.stringify({
              question: "In Pinocchio, which woodcarver created the wooden puppet?",
              choices: [
                { id: "A", text: "Geppetto", is_correct: true },
                { id: "B", text: "Stromboli", is_correct: false },
                { id: "C", text: "Jiminy Cricket", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Geppetto lovingly carved Pinocchio out of a block of pine wood.",
              fun_fact: "Geppetto's workshop was filled with handcrafted cuckoo clocks.",
              visual_spec: {
                intent: "question_illustration",
                prompt: "Elderly woodcarver Geppetto working with wood chisels in his rustic workshop",
                aspect_ratio: "16:9",
              },
            }),
          };
        }

        return {
          text: JSON.stringify({
            question: "In Cinderella, what item is left behind at the stroke of midnight?",
            choices: [
              { id: "A", text: "Glass slipper", is_correct: true },
              { id: "B", text: "Golden locket", is_correct: false },
              { id: "C", text: "Silk glove", is_correct: false },
            ],
            correct_choice_id: "A",
            explanation: "Cinderella accidentally dropped her glass slipper on the palace staircase.",
            fun_fact: "In Charles Perrault's original French tale, the slipper was made of verre.",
            visual_spec: {
              intent: "question_illustration",
              prompt: "A sparkling crystalline glass slipper resting on grand marble palace steps at midnight",
              aspect_ratio: "16:9",
            },
          }),
        };
      }),
    };

    const batchResult = await generateQuestionBankBatch(app.repository, {
      rawCandidatesOverride: [cleanQuestion, pinocchioLeaked, cinderellaLeaked],
      llmClient: mockLlmClient,
      persist: true,
    });

    expect(batchResult.success).toBe(true);
    expect(batchResult.requestedCount).toBe(3);
    expect(batchResult.remediatedLeakCount).toBe(2);
    expect(batchResult.approvedCount).toBe(3);
    expect(batchResult.rejectedCount).toBe(0);

    // Verify all saved questions in repository have approved status and updated visual_spec
    const savedPinocchio = batchResult.savedQuestions.find((q) => q.id === "PINOCCHIO-LEAK-01");
    expect(savedPinocchio).toBeDefined();
    expect(savedPinocchio?.question).toBe("In Pinocchio, which woodcarver created the wooden puppet?");
    expect(savedPinocchio?.choices[0].text).toBe("Geppetto");
    expect(savedPinocchio?.status).toBe("approved");
    expect(savedPinocchio?.visual_spec?.prompt).toContain("Geppetto working with wood chisels");

    const savedCinderella = batchResult.savedQuestions.find((q) => q.id === "CINDERELLA-LEAK-01");
    expect(savedCinderella).toBeDefined();
    expect(savedCinderella?.question).toBe("In Cinderella, what item is left behind at the stroke of midnight?");
    expect(savedCinderella?.choices[0].text).toBe("Glass slipper");
    expect(savedCinderella?.status).toBe("approved");
    expect(savedCinderella?.visual_spec?.prompt).toContain("glass slipper resting on grand marble palace steps");

    // Verify lossless conversion to QuizQuestion for downstream staging
    const quizPinocchio = convertBankQuestionToQuizQuestionLossless(savedPinocchio!);
    expect(quizPinocchio.question).toBe("In Pinocchio, which woodcarver created the wooden puppet?");
    expect(quizPinocchio.choices[0].text).toBe("Geppetto");
  });
});
