import { describe, it, expect, vi } from "vitest";
import type { BankQuestion } from "@studio/shared";
import type { LLMClient } from "../src/utils/promptSanitizer.js";
import type { AutoQaIssue } from "../src/quiz/bank/autoQa/autoQa.types.js";
import {
  remediateStemAnswerLeak,
  remediateLeakedQuestionsBatch,
} from "../src/quiz/bank/remediation/index.js";

const sampleLeakedQuestion: BankQuestion = {
  id: "PINOCCHIO-LEAK-01",
  archetype_id: "deep_trivia",
  domain_id: "entertainment_popculture",
  subtopic_id: "classic_fairytales",
  question: "In Pinocchio, who is this puppet boy?",
  choices: [
    { id: "A", text: "Pinocchio", is_correct: true },
    { id: "B", text: "Geppetto", is_correct: false },
    { id: "C", text: "Jiminy Cricket", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Pinocchio is the main character.",
  visual_spec: {
    intent: "question_illustration",
    prompt: "Pinocchio standing on a wooden workbench",
    aspect_ratio: "16:9",
  },
};

const sampleIssue: AutoQaIssue = {
  type: "quality",
  message: 'Stem-Option Leakage: Correct choice "Pinocchio" matches eponymous franchise title "Pinocchio".',
  details: {
    leakType: "eponymous_franchise_leak",
    franchiseTitle: "Pinocchio",
    correctChoice: "Pinocchio",
  },
};

function createMockLLMClient(responseHandler: (prompt: string) => string | Promise<string>): LLMClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    generateContent: vi.fn().mockImplementation(async (prompt: string) => {
      const text = await responseHandler(prompt);
      return { text };
    }),
  };
}

describe("Stem Leak Auto-Remediation Service & Self-Healing Loop (Phase 5)", () => {
  it("successfully remediates leaked question and updates visual_spec on first attempt", async () => {
    const validRemediatedJson = JSON.stringify({
      question: "In Pinocchio, which woodcarver created the wooden puppet?",
      choices: [
        { id: "A", text: "Geppetto", is_correct: true },
        { id: "B", text: "Stromboli", is_correct: false },
        { id: "C", text: "Jiminy Cricket", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Geppetto carved Pinocchio out of pine wood.",
      fun_fact: "Geppetto's workshop was filled with handcrafted cuckoo clocks.",
      visual_spec: {
        intent: "question_illustration",
        prompt: "Elderly woodcarver Geppetto meticulously carving a marionette in his workshop",
        aspect_ratio: "16:9",
      },
    });

    const mockClient = createMockLLMClient(() => validRemediatedJson);

    const result = await remediateStemAnswerLeak(
      { question: sampleLeakedQuestion, issue: sampleIssue },
      { llmClient: mockClient },
    );

    expect(result.success).toBe(true);
    expect(result.remediatedQuestion).toBeDefined();
    expect(result.remediatedQuestion?.question).toBe("In Pinocchio, which woodcarver created the wooden puppet?");
    expect(result.remediatedQuestion?.correct_choice_id).toBe("A");
    expect(result.remediatedQuestion?.choices[0].text).toBe("Geppetto");
    expect(result.remediatedQuestion?.status).toBe("approved");
    expect(result.remediatedQuestion?.visual_spec?.prompt).toContain("Geppetto meticulously carving");
    expect(result.strategyApplied).toBe("plot_or_supporting_character");
  });

  it("self-heals via retry when first attempt still leaks, switching strategy to context_reanchoring", async () => {
    let callCount = 0;

    const mockClient = createMockLLMClient(() => {
      callCount++;
      if (callCount === 1) {
        // Hallucinated response still contains Pinocchio in stem and answer
        return JSON.stringify({
          question: "In Pinocchio, who is the magical puppet named Pinocchio?",
          choices: [
            { id: "A", text: "Pinocchio", is_correct: true },
            { id: "B", text: "Geppetto", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Pinocchio is magical.",
          visual_spec: { prompt: "Pinocchio walking" },
        });
      }

      // Second attempt switches to context re-anchoring successfully
      return JSON.stringify({
        question: "In classic Disney animation, which puppet dreams of becoming real?",
        choices: [
          { id: "A", text: "Pinocchio", is_correct: true },
          { id: "B", text: "Peter Pan", is_correct: false },
          { id: "C", text: "Dumbo", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "Pinocchio longs to be a real boy.",
        visual_spec: {
          intent: "question_illustration",
          prompt: "The Blue Fairy transforming a wooden puppet into a real living boy",
          aspect_ratio: "16:9",
        },
      });
    });

    const result = await remediateStemAnswerLeak(
      { question: sampleLeakedQuestion, issue: sampleIssue },
      { llmClient: mockClient, maxRetries: 2 },
    );

    expect(callCount).toBe(2);
    expect(result.success).toBe(true);
    expect(result.strategyApplied).toBe("context_reanchoring");
    expect(result.remediatedQuestion?.question).toBe(
      "In classic Disney animation, which puppet dreams of becoming real?",
    );
    expect(result.remediatedQuestion?.visual_spec?.prompt).toContain("Blue Fairy transforming");
  });

  it("handles batch remediation across multiple leaked questions", async () => {
    const cinderellaLeakedQ: BankQuestion = {
      id: "CINDERELLA-LEAK-01",
      archetype_id: "deep_trivia",
      domain_id: "entertainment_popculture",
      subtopic_id: "classic_fairytales",
      question: "In Cinderella, who lost a glass slipper?",
      choices: [
        { id: "A", text: "Cinderella", is_correct: true },
        { id: "B", text: "Lady Tremaine", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Cinderella lost her glass slipper.",
      visual_spec: { prompt: "Cinderella running" },
    };

    const cinderellaIssue: AutoQaIssue = {
      type: "quality",
      message: 'Stem-Option Leakage: Correct choice "Cinderella" matches eponymous title.',
      details: { leakType: "eponymous_franchise_leak", correctChoice: "Cinderella" },
    };

    const mockClient = createMockLLMClient((prompt) => {
      if (prompt.includes('Original Question: "In Pinocchio')) {
        return JSON.stringify({
          question: "In Pinocchio, which woodcarver created the wooden puppet?",
          choices: [
            { id: "A", text: "Geppetto", is_correct: true },
            { id: "B", text: "Stromboli", is_correct: false },
          ],
          correct_choice_id: "A",
          explanation: "Geppetto created Pinocchio.",
          visual_spec: { prompt: "Geppetto in his workshop" },
        });
      }

      return JSON.stringify({
        question: "In Cinderella, what item is left behind at the stroke of midnight?",
        choices: [
          { id: "A", text: "Glass slipper", is_correct: true },
          { id: "B", text: "Golden necklace", is_correct: false },
        ],
        correct_choice_id: "A",
        explanation: "She left behind a glass slipper on the palace staircase.",
        visual_spec: { prompt: "A sparkling glass slipper left on marble palace stairs at midnight" },
      });
    });

    const batchResult = await remediateLeakedQuestionsBatch(
      [
        { question: sampleLeakedQuestion, issue: sampleIssue },
        { question: cinderellaLeakedQ, issue: cinderellaIssue },
      ],
      { llmClient: mockClient, concurrency: 2 },
    );

    expect(batchResult.total).toBe(2);
    expect(batchResult.remediatedCount).toBe(2);
    expect(batchResult.failedCount).toBe(0);
    expect(batchResult.remediatedQuestions[0].choices[0].text).toBe("Geppetto");
    expect(batchResult.remediatedQuestions[1].choices[0].text).toBe("Glass slipper");
  });

  it("safely reports failure when LLM client throws without crashing the pipeline", async () => {
    const errorClient = createMockLLMClient(() => {
      throw new Error("Provider rate limit exceeded");
    });

    const result = await remediateStemAnswerLeak(
      { question: sampleLeakedQuestion, issue: sampleIssue },
      { llmClient: errorClient, maxRetries: 1 },
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Provider rate limit exceeded");
    expect(result.remediatedQuestion).toBeUndefined();
  });
});
