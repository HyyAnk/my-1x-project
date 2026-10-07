import { describe, expect, it } from "vitest";
import { resolveThumbnailLayout } from "../src/quiz/thumbnail/thumbnailLayoutResolver.js";
import { planThumbnailWithAI } from "../src/quiz/thumbnail/thumbnailAiPlanner.js";
import {
  cleanRawTitleNoise,
  deriveTopicHeadlineFallback,
  extractPunchyTopicHeadline,
  isGenericQuizTitle,
} from "../src/quiz/thumbnail/thumbnailTopicHookExtractor.js";

function createMockLlm(responsePayload: Record<string, unknown>) {
  return {
    connect: () => Promise.resolve(),
    startThread: () => Promise.resolve("thread_thumb_test"),
    startTurn: () => Promise.resolve("turn_thumb_test"),
    interruptTurn: () => Promise.resolve(),
    on: (event: string, cb: (payload: unknown) => void) => {
      if (event === "notification") {
        setTimeout(() => {
          cb({
            method: "turn/completed",
            params: {
              turn: {
                status: "completed",
              },
            },
          });
        }, 10);
        setTimeout(() => {
          cb({
            method: "item/agentMessage/delta",
            params: {
              delta: JSON.stringify(responsePayload),
            },
          });
        }, 5);
      }
    },
    off: () => {},
  };
}

describe("Stage 1: Universal Topic Hook & Title Intelligence Engine", () => {
  describe("Noise Cleaning & Generic Quiz Title Detection", () => {
    it("strips boilerplate noise like Quiz, Trivia, Challenge, True or False, and leading numbers", () => {
      expect(cleanRawTitleNoise("Top 10 Crazy Science Myths True or False Quiz")).toBe("Crazy Science Myths");
      expect(cleanRawTitleNoise("10 Biggest Ocean Monsters Trivia Challenge")).toBe("Ocean Monsters");
      expect(cleanRawTitleNoise("School Clinic Secrets: First Aid Heroes Quiz")).toBe("School Clinic Secrets: First Aid Heroes");
    });

    it("correctly identifies truly generic quizzes where localized templates are expected", () => {
      expect(isGenericQuizTitle("General Knowledge Trivia Quiz")).toBe(true);
      expect(isGenericQuizTitle("Allgemeinwissen 15 Fragen")).toBe(true);
      expect(isGenericQuizTitle("Yleistieto Tietovisa")).toBe(true);
      expect(isGenericQuizTitle("Almen Viden Quiz")).toBe(true);
      expect(isGenericQuizTitle("Myths and Facts")).toBe(true);
      expect(isGenericQuizTitle("True or False")).toBe(true);
      expect(isGenericQuizTitle("一般常識クイズ 15問")).toBe(true);
      expect(isGenericQuizTitle("综合知识挑战 15道题")).toBe(true);

      // Specific topic quizzes MUST NOT be identified as generic
      expect(isGenericQuizTitle("School Clinic Secrets: First Aid Heroes Quiz")).toBe(false);
      expect(isGenericQuizTitle("Arcade Game Secrets: Gaming Showdown")).toBe(false);
      expect(isGenericQuizTitle("Deep Ocean Mysteries")).toBe(false);
      expect(isGenericQuizTitle("Medieval Castles: Siege Defense")).toBe(false);
    });
  });

  describe("Topic-Specific Headline Extraction", () => {
    it("extracts punchy subject headlines from multi-segment episode titles", () => {
      const headline = extractPunchyTopicHeadline("School Clinic Secrets: First Aid Heroes Quiz");
      expect(headline).toBe("SCHOOL CLINIC SECRETS");

      const arcade = extractPunchyTopicHeadline("Arcade Game Secrets: True or False Gaming Showdown");
      expect(arcade).toBe("ARCADE GAME SECRETS");

      const volcano = extractPunchyTopicHeadline("Volcano Eruptions: Ring of Fire Mystery");
      expect(volcano).toBe("VOLCANO ERUPTIONS");
    });

    it("extracts punchy headlines from single-segment titles with noise removed", () => {
      const monsters = extractPunchyTopicHeadline("Top 5 Deep Sea Monsters Trivia");
      expect(monsters).toBe("DEEP SEA MONSTERS");

      const castles = extractPunchyTopicHeadline("Medieval Castle Siege Tactics");
      expect(castles).toBe("MEDIEVAL CASTLE SIEGE TACTICS");
    });
  });

  describe("School Clinic Secrets: First Aid Heroes Quiz Resolution", () => {
    it("resolves medical hook instead of 'GENERAL KNOWLEDGE' in mega_grid layout", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "en",
        layoutOverride: "mega_grid",
      });

      expect(plan.layout).toBe("mega_grid");
      expect(plan.hookText).toBe("FIRST AID HEROES!");
      expect(plan.hookText).not.toBe("GENERAL KNOWLEDGE");
    });

    it("resolves authentic multilingual medical hooks across core languages", () => {
      const jaPlan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "ja",
        layoutOverride: "mega_grid",
      });
      expect(jaPlan.hookText).toBe("応急処置クイズ！");

      const frPlan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "fr",
        layoutOverride: "mega_grid",
      });
      expect(frPlan.hookText).toBe("QUIZ PREMIERS SECOURS !");

      const dePlan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "de",
        layoutOverride: "mega_grid",
      });
      expect(dePlan.hookText).toBe("ERSTE HILFE QUIZ!");

      const esPlan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "es",
        layoutOverride: "mega_grid",
      });
      expect(esPlan.hookText).toBe("¡QUIZ PRIMEROS AUXILIOS!");
    });

    it("derives clean topic headline without True/False noise via headline fallback", () => {
      const derived = deriveTopicHeadlineFallback("School Clinic Secrets: First Aid Heroes Quiz", "TRUE OR FALSE?");
      expect(derived).toBe("SCHOOL CLINIC SECRETS");
      expect(derived).not.toContain("TRUE");
      expect(derived).not.toContain("FALSE");
    });
  });

  describe("AI Planner Anti-Cliché Interceptor across all layouts", () => {
    it("intercepts LLM output returning 'GENERAL KNOWLEDGE' on mega_grid and replaces with topic headline", async () => {
      const mockLlm = createMockLlm({
        hook_text: "GENERAL KNOWLEDGE",
        badge_text: "GENIUS TIER 🔥",
        layout: "mega_grid",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Medieval Castle Defense: Siege Weapons Mystery",
        language: "en",
        layoutOverride: "mega_grid",
        llmClient: mockLlm,
      });

      expect(plan.hookText).toBe("MEDIEVAL CASTLE DEFENSE");
      expect(plan.hookText).not.toBe("GENERAL KNOWLEDGE");
    });

    it("intercepts LLM output returning 'TRUE OR FALSE?' on true_false and replaces with topic headline", async () => {
      const mockLlm = createMockLlm({
        hook_text: "TRUE OR FALSE?",
        badge_text: "99% FAIL! ⚡",
        layout: "true_false",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "en",
        questionFormat: "true_false",
        llmClient: mockLlm,
      });

      expect(plan.hookText).toBe("SCHOOL CLINIC SECRETS");
      expect(plan.hookText).not.toBe("TRUE OR FALSE?");
    });

    it("intercepts LLM output returning 'WHICH WOULD YOU CHOOSE?' on split_vs and replaces with topic headline", async () => {
      const mockLlm = createMockLlm({
        hook_text: "WHICH WOULD YOU CHOOSE?",
        badge_text: "PICK ONE! ⚡",
        layout: "split_vs",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Knight vs Samurai: Ancient Warrior Showdown",
        language: "en",
        layoutOverride: "split_vs",
        llmClient: mockLlm,
      });

      expect(plan.hookText).toBe("KNIGHT VS SAMURAI");
      expect(plan.hookText).not.toBe("WHICH WOULD YOU CHOOSE?");
    });

    it("preserves valid, creative LLM-generated hook when it is not a generic cliché", async () => {
      const mockLlm = createMockLlm({
        hook_text: "SAVE THE PATIENT!",
        badge_text: "ICU HERO 🔥",
        layout: "mega_grid",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "en",
        llmClient: mockLlm,
      });

      expect(plan.hookText).toBe("SAVE THE PATIENT!");
    });

    it("derives punchy topic headline when LLM planning throws an error or times out", async () => {
      const failingLlm = {
        connect: () => Promise.reject(new Error("LLM single prompt turn timed out after 30000ms")),
      };

      const plan = await planThumbnailWithAI({
        topicTitle: "Super Transit City Hubs: Can You Spot Every Moving Wonder?",
        language: "en",
        layoutOverride: "mega_grid",
        llmClient: failingLlm,
      });

      expect(plan.hookText).toBe("SUPER TRANSIT CITY HUBS");
      expect(plan.hookText).not.toBe("GENERAL KNOWLEDGE");
    });
  });
});
