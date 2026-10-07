import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import type { BankQuestion } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import { generateQuestionBankBatch } from "../src/quiz/bank/questionBankBatchService.js";
import { convertBankQuestionToQuizQuestionLossless } from "../src/quiz/bank/bridge/bankQuestionConverter.js";
import { detectStemAnswerLeak } from "../src/quiz/bank/autoQa/stemLeakDetector.js";

describe("Stem Leak Prevention & Self-Healing Pipeline End-to-End Simulation (Phase 7)", () => {
  let app: StudioApp;
  let tempRoot: string;

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "qb-e2e-sim-"));
    app = await buildApp(tempRoot);
  });

  afterAll(async () => {
    await app.close();
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  it("completes full end-to-end lifecycle across multiple eponymous franchises with zero leaks", async () => {
    // 1. Clean control question
    const cleanDbz: BankQuestion = {
      id: "CLEAN-DBZ-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "anime_manga",
      language: "en",
      format: "multiple_choice",
      question: "In Dragon Ball Z, what attack gathers energy from living things?",
      choices: [
        { id: "A", text: "Spirit Bomb", is_correct: true },
        { id: "B", text: "Solar Flare", is_correct: false },
        { id: "C", text: "Destructo Disc", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Goku learns the Spirit Bomb (Genki Dama) from King Kai.",
      fun_fact: "The Spirit Bomb was first used against Vegeta on Earth.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Goku floating in the sky with arms raised gathering a glowing blue sphere of energy",
        aspect_ratio: "16:9",
      },
      difficulty: 2,
      thinking_seconds: 5,
      status: "draft",
    };

    // 2. Leaked Pinocchio question
    const leakedPinocchio: BankQuestion = {
      id: "LEAK-PINOCCHIO-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "classic_fairytales",
      language: "en",
      format: "multiple_choice",
      question: "In Pinocchio, who is this puppet boy?",
      choices: [
        { id: "A", text: "Pinocchio", is_correct: true },
        { id: "B", text: "Geppetto", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Pinocchio is the puppet boy.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Pinocchio standing on a table",
        aspect_ratio: "16:9",
      },
      difficulty: 1,
      thinking_seconds: 5,
      status: "draft",
    };

    // 3. Leaked Cinderella question
    const leakedCinderella: BankQuestion = {
      id: "LEAK-CINDERELLA-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "classic_fairytales",
      language: "en",
      format: "multiple_choice",
      question: "In Cinderella, who lost a glass slipper?",
      choices: [
        { id: "A", text: "Cinderella", is_correct: true },
        { id: "B", text: "Fairy Godmother", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Cinderella lost her shoe.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Cinderella fleeing the castle",
        aspect_ratio: "16:9",
      },
      difficulty: 1,
      thinking_seconds: 5,
      status: "draft",
    };

    // 4. Leaked Naruto question
    const leakedNaruto: BankQuestion = {
      id: "LEAK-NARUTO-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "anime_manga",
      language: "en",
      format: "multiple_choice",
      question: "In Naruto, who hosts the Nine-Tails Fox?",
      choices: [
        { id: "A", text: "Naruto", is_correct: true },
        { id: "B", text: "Sasuke", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Naruto hosts the Nine-Tails.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Naruto with orange ninja tracksuit",
        aspect_ratio: "16:9",
      },
      difficulty: 2,
      thinking_seconds: 5,
      status: "draft",
    };

    // 5. Leaked Spider-Man question
    const leakedSpiderMan: BankQuestion = {
      id: "LEAK-SPIDERMAN-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "superheroes",
      language: "en",
      format: "multiple_choice",
      question: "In Spider-Man, who shoots web lines?",
      choices: [
        { id: "A", text: "Spider-Man", is_correct: true },
        { id: "B", text: "Green Goblin", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Spider-Man shoots webs.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Spider-Man swinging between city skyscrapers",
        aspect_ratio: "16:9",
      },
      difficulty: 1,
      thinking_seconds: 5,
      status: "draft",
    };

    // Mock LLM client simulating high-fidelity surgical rewriting
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
              explanation: "Geppetto carved Pinocchio out of pine wood.",
              fun_fact: "Geppetto originally created many wooden clocks before carving Pinocchio.",
              visual_spec: {
                intent: "question_illustration",
                prompt: "Elderly woodcarver Geppetto working with wood chisels in his rustic workshop",
                aspect_ratio: "16:9",
              },
            }),
          };
        }

        if (prompt.includes('Original Question: "In Cinderella')) {
          return {
            text: JSON.stringify({
              question: "In Cinderella, what item is left behind at the stroke of midnight?",
              choices: [
                { id: "A", text: "Glass slipper", is_correct: true },
                { id: "B", text: "Golden ring", is_correct: false },
                { id: "C", text: "Silk glove", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Cinderella lost her glass slipper on the palace staircase.",
              fun_fact: "The prince used the lost slipper to find the rightful maiden throughout the kingdom.",
              visual_spec: {
                intent: "question_illustration",
                prompt: "A sparkling crystalline glass slipper resting on grand marble palace steps at midnight",
                aspect_ratio: "16:9",
              },
            }),
          };
        }

        if (prompt.includes('Original Question: "In Naruto')) {
          return {
            text: JSON.stringify({
              question: "In ninja anime lore, which blonde shinobi hosts the Nine-Tails fox?",
              choices: [
                { id: "A", text: "Naruto Uzumaki", is_correct: true },
                { id: "B", text: "Sasuke Uchiha", is_correct: false },
                { id: "C", text: "Kakashi Hatake", is_correct: false },
              ],
              correct_choice_id: "A",
              explanation: "Naruto Uzumaki is the jinchuriki host of Kurama the Nine-Tails.",
              fun_fact: "The Nine-Tails was sealed inside Naruto on the day he was born.",
              visual_spec: {
                intent: "question_illustration",
                prompt: "Blonde shinobi Naruto surrounded by swirling golden chakra cloaks in the Hidden Leaf Village",
                aspect_ratio: "16:9",
              },
            }),
          };
        }

        // Spider-Man
        return {
          text: JSON.stringify({
            question: "In Spider-Man, which villain flies on a high-tech glider?",
            choices: [
              { id: "A", text: "Green Goblin", is_correct: true },
              { id: "B", text: "Doctor Octopus", is_correct: false },
              { id: "C", text: "Venom", is_correct: false },
            ],
            correct_choice_id: "A",
            explanation: "Norman Osborn terrorizes New York City as the Green Goblin on his jet glider.",
            fun_fact: "Green Goblin carries pumpkin bombs and razor bats in his satchel.",
            visual_spec: {
              intent: "question_illustration",
              prompt: "The menacing Green Goblin flying on his futuristic metallic glider hurling an orange pumpkin bomb",
              aspect_ratio: "16:9",
            },
          }),
        };
      }),
    };

    // 6. Run batch generation pipeline
    const candidates = [cleanDbz, leakedPinocchio, leakedCinderella, leakedNaruto, leakedSpiderMan];
    const batchResult = await generateQuestionBankBatch(app.repository, {
      rawCandidatesOverride: candidates,
      llmClient: mockLlmClient,
      persist: true,
    });

    // 7. Validate batch metrics
    expect(batchResult.success).toBe(true);
    expect(batchResult.requestedCount).toBe(5);
    expect(batchResult.remediatedLeakCount).toBe(4);
    expect(batchResult.approvedCount).toBe(5);
    expect(batchResult.rejectedCount).toBe(0);

    // 8. Validate 100% zero-leak verification across all saved items
    for (const savedQ of batchResult.savedQuestions) {
      expect(savedQ.status).toBe("approved");
      expect(detectStemAnswerLeak(savedQ)).toBeNull();
      expect(savedQ.visual_spec?.prompt).toBeDefined();
      expect(savedQ.visual_spec?.prompt.length).toBeGreaterThan(15);

      // Verify that bridge converts seamlessly without throwing or warning
      const quizQ = convertBankQuestionToQuizQuestionLossless(savedQ);
      expect(quizQ.question).toBe(savedQ.question);
      expect(quizQ.choices.length).toBeGreaterThanOrEqual(2);
    }
  });
});
