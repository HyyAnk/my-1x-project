import { describe, expect, it } from "vitest";
import type { QuizV2 } from "@studio/shared";
import {
  extractBridgeShowcaseItems,
  buildBridgeShowcaseLlmPrompt,
  parseBridgeShowcaseLlmOutput,
} from "../src/quiz/assets/bridgeTopicEntityExtractor.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";

const mockQuiz: QuizV2 = {
  episode_id: "ep_christ_test",
  topic: {
    title: "General Knowledge Christ Quiz",
    category: "religion_history",
    target_age: "7-9",
    summary: "Engaging quiz exploring history, sacred symbols, and stories.",
  },
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which sacred symbol features angel wings and a golden cross?",
      choices: [
        { id: "c1", text: "Angel Wings Cross" },
        { id: "c2", text: "Olive Branch" },
      ],
      correct_answer: "c1",
      explanation: "The cross with angel wings represents peace and divinity.",
      visual_opportunity: "Golden cross with white angel wings emblem",
    },
    {
      id: "q2",
      number: 2,
      format: "multiple_choice",
      difficulty: 1,
      question: "Who delivered the Sermon on the Mount?",
      choices: [
        { id: "c1", text: "Jesus" },
        { id: "c2", text: "Peter" },
      ],
      correct_answer: "c1",
      explanation: "Jesus delivered the Sermon on the Mount.",
      visual_opportunity: "Cinematic portrait of Jesus blessing with warm glowing light",
    },
    {
      id: "q3",
      number: 3,
      format: "multiple_choice",
      difficulty: 2,
      question: "Where did the crucifixion take place?",
      choices: [
        { id: "c1", text: "Calvary" },
        { id: "c2", text: "Nazareth" },
      ],
      correct_answer: "c1",
      explanation: "It took place at Calvary at sunset.",
      visual_opportunity: "Wooden crucifix standing on a hill at golden sunset",
    },
    {
      id: "q4",
      number: 4,
      format: "multiple_choice",
      difficulty: 1,
      question: "What is the peaceful mascot companion?",
      choices: [
        { id: "c1", text: "White Dove" },
        { id: "c2", text: "Sparrow" },
      ],
      correct_answer: "c1",
      explanation: "The dove is a universal symbol of peace.",
      visual_opportunity: "Stylized friendly character avatar of young Jesus smiling",
    },
  ],
};

describe("Bridge Topic Entity Extractor & Prompt Compiler (Phase 2)", () => {
  describe("extractBridgeShowcaseItems", () => {
    it("extracts 4 balanced showcase items leveraging visual opportunities", () => {
      const items = extractBridgeShowcaseItems(mockQuiz);

      expect(items).toHaveLength(4);
      expect(items[0].asset_id).toBe("asset-bridge-item-1");
      expect(items[0].presentation).toBe("die_cut_sticker");
      expect(items[0].transparent_background).toBe(true);
      expect(items[0].subject).toContain("Golden cross");

      expect(items[1].asset_id).toBe("asset-bridge-item-2");
      expect(items[1].presentation).toBe("photo_card");
      expect(items[1].transparent_background).toBe(false);
      expect(items[1].subject).toContain("portrait");

      expect(items[2].asset_id).toBe("asset-bridge-item-3");
      expect(items[2].presentation).toBe("photo_card");
      expect(items[2].transparent_background).toBe(false);
      expect(items[2].subject).toContain("sunset");

      expect(items[3].asset_id).toBe("asset-bridge-item-4");
      expect(items[3].presentation).toBe("die_cut_sticker");
      expect(items[3].transparent_background).toBe(true);
      expect(items[3].subject).toContain("avatar");
    });

    it("respects existing showcaseItems from bridgeConfig", () => {
      const customItems = [
        { asset_id: "asset-custom-1", subject: "Custom 1", presentation: "die_cut_sticker" as const, rotation_deg: 0, transparent_background: true },
        { asset_id: "asset-custom-2", subject: "Custom 2", presentation: "photo_card" as const, rotation_deg: 1, transparent_background: false },
        { asset_id: "asset-custom-3", subject: "Custom 3", presentation: "photo_card" as const, rotation_deg: -1, transparent_background: false },
        { asset_id: "asset-custom-4", subject: "Custom 4", presentation: "die_cut_sticker" as const, rotation_deg: 2, transparent_background: true },
      ];

      const items = extractBridgeShowcaseItems(mockQuiz, {
        bridgeConfig: {
          enabled: true,
          enableTopicScene: true,
          enableCtaScene: true,
          enablePreOutroScene: true,
          timing: { topicPauseSeconds: 0.5, ctaPauseSeconds: 0.5, preOutroPauseSeconds: 0.5, transitionType: "brand_logo_stinger", stingerDurationSeconds: 1.3 },
          showcaseItems: customItems,
        },
      });

      expect(items).toEqual(customItems);
    });

    it("falls back gracefully when questions lack visual opportunities", () => {
      const minimalQuiz: QuizV2 = {
        episode_id: "ep_minimal",
        topic: { title: "Ocean Explorers", category: "nature", target_age: "7-9" },
        questions: [
          { id: "mq1", number: 1, format: "multiple_choice", difficulty: 1, question: "Which animal is the largest?", choices: [{ id: "c1", text: "Whale" }], correct_answer: "c1", explanation: "Blue Whale." },
        ],
      };

      const items = extractBridgeShowcaseItems(minimalQuiz);
      expect(items).toHaveLength(4);
      expect(items[0].subject).toContain("Ocean Explorers");
      expect(items[0].presentation).toBe("die_cut_sticker");
      expect(items[1].presentation).toBe("photo_card");
    });
  });

  describe("buildBridgeShowcaseLlmPrompt", () => {
    it("generates a structured prompt containing quiz topic and rules", () => {
      const prompt = buildBridgeShowcaseLlmPrompt(mockQuiz);
      expect(prompt).toContain("General Knowledge Christ Quiz");
      expect(prompt).toContain("die_cut_sticker");
      expect(prompt).toContain("photo_card");
      expect(prompt).toContain("asset-bridge-item-1");
    });
  });

  describe("parseBridgeShowcaseLlmOutput", () => {
    const fallback = extractBridgeShowcaseItems(mockQuiz);

    it("parses valid JSON response", () => {
      const validJson = JSON.stringify([
        { subject: "Golden Chalice", presentation: "die_cut_sticker", rotation_deg: -2, transparent_background: true },
        { subject: "Christ Walking on Water", presentation: "photo_card", rotation_deg: 1, transparent_background: false },
        { subject: "The Nativity Star", presentation: "photo_card", rotation_deg: -3, transparent_background: false },
        { subject: "Cute Sheep Sticker", presentation: "die_cut_sticker", rotation_deg: 2, transparent_background: true },
      ]);

      const items = parseBridgeShowcaseLlmOutput(validJson, fallback);
      expect(items).toHaveLength(4);
      expect(items[0].subject).toBe("Golden Chalice");
      expect(items[0].asset_id).toBe("asset-bridge-item-1");
      expect(items[1].subject).toBe("Christ Walking on Water");
      expect(items[1].asset_id).toBe("asset-bridge-item-2");
    });

    it("handles markdown code fence wrapping cleanly", () => {
      const wrapped = "```json\n" + JSON.stringify([
        { subject: "Crown of Thorns", presentation: "die_cut_sticker", rotation_deg: -2, transparent_background: true },
        { subject: "Jerusalem at Dusk", presentation: "photo_card", rotation_deg: 1, transparent_background: false },
        { subject: "Garden of Gethsemane", presentation: "photo_card", rotation_deg: -3, transparent_background: false },
        { subject: "Angel Gabriel Avatar", presentation: "die_cut_sticker", rotation_deg: 2, transparent_background: true },
      ]) + "\n```";

      const items = parseBridgeShowcaseLlmOutput(wrapped, fallback);
      expect(items[0].subject).toBe("Crown of Thorns");
    });

    it("falls back gracefully when output is malformed", () => {
      const invalid = "Not JSON output!";
      const items = parseBridgeShowcaseLlmOutput(invalid, fallback);
      expect(items).toEqual(fallback);
    });

    it("falls back when array length is not 4", () => {
      const partial = JSON.stringify([{ subject: "Only one item" }]);
      const items = parseBridgeShowcaseLlmOutput(partial, fallback);
      expect(items).toEqual(fallback);
    });
  });

  describe("compileQuizAssetPrompt for bridge_topic_item", () => {
    it("compiles sticker prompt with white studio backdrop and matting guidance", () => {
      const result = compileQuizAssetPrompt({
        asset_id: "asset-bridge-item-1",
        question_id: null,
        subject: "Golden cross with angel wings emblem",
        purpose: "bridge_topic_item",
        style: "cute_illustration",
        aspect_ratio: "1:1",
        transparent_background: true,
        required: true,
        semantic_key: "bridge:showcase:1",
      });

      expect(result.prompt).toContain("Bridge showcase sticker contract");
      expect(result.prompt).toContain("pure solid white studio backdrop");
      expect(result.prompt).toContain("clean background matting");
      expect(result.cacheVersion).toContain("-v1-bridge-showcase");
    });

    it("compiles card vignette prompt with scenic depth", () => {
      const result = compileQuizAssetPrompt({
        asset_id: "asset-bridge-item-2",
        question_id: null,
        subject: "Christ teaching by the sea of Galilee",
        purpose: "bridge_topic_item",
        style: "photo_reference",
        aspect_ratio: "4:3",
        transparent_background: false,
        required: true,
        semantic_key: "bridge:showcase:2",
      });

      expect(result.prompt).toContain("Bridge showcase card vignette contract");
      expect(result.prompt).toContain("rich atmospheric background");
      expect(result.cacheVersion).toContain("-v1-bridge-showcase");
    });
  });
});
