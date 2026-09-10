import { describe, expect, it } from "vitest";
import type { QuizAssetRequirement } from "@studio/shared";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { AntigravityNativeImageProvider } from "../src/providers/antigravity/provider.js";
import { executeSinglePromptText } from "../src/utils/promptSanitizer.js";
import { RepositoryService } from "../src/repository.js";
import path from "node:path";
import os from "node:os";

describe("Visual Prompt Subject Identity Preservation", () => {
  describe("compileQuizAssetPrompt preserves subjects without proxy alteration", () => {
    it.each([
      ["Pac-Man", "Pac-Man"],
      ["Super Mario", "Super Mario"],
      ["Pikachu", "Pikachu"],
      ["Lion Cub", "Lion Cub"],
      ["a cute baby lion playing", "a cute baby lion playing"],
      ["Minecraft Creeper", "Minecraft Creeper"],
      ["Spider-Man", "Spider-Man"],
      ["Batman", "Batman"],
      ["Mickey Mouse", "Mickey Mouse"],
      ["Sonic the Hedgehog", "Sonic the Hedgehog"],
      ["A vintage red bicycle resting against a brick wall", "A vintage red bicycle resting against a brick wall"],
    ])("preserves %s in compiled prompt", (subject, expectedText) => {
      const requirement: QuizAssetRequirement = {
        asset_id: "asset-question-01-hero",
        purpose: "hero_question_image",
        subject,
        aspect_ratio: "16:9",
        required: true,
      };

      const compiled = compileQuizAssetPrompt(requirement);
      expect(compiled.prompt).toContain(`Subject: ${expectedText}.`);
      expect(compiled.cacheVersion).toMatch(/-v4-subject-identity$/);
    });

    it("preserves answer_option choices in compileQuizAssetPrompt", () => {
      const choiceReq: QuizAssetRequirement = {
        asset_id: "asset-question-01-choice-a",
        purpose: "answer_option",
        subject: "Super Mario jumping",
        aspect_ratio: "1:1",
        required: false,
      };

      const compiled = compileQuizAssetPrompt(choiceReq);
      expect(compiled.prompt).toContain("Subject: Super Mario jumping.");
    });
  });

  describe("Provider Hardening & Resilience", () => {
    it("fails fast when Antigravity client lacks startThread instead of hanging in retry loop", async () => {
      const dummyRepo = new RepositoryService(path.join(os.tmpdir(), "studio-test-repo-guard"));
      const unsupportedClient = {
        connect: async () => {},
        generateContent: async () => "mock",
      };

      const provider = new AntigravityNativeImageProvider(
        dummyRepo,
        { channelId: "ch-test", episodeId: "ep-test", assetId: "asset-test", fingerprint: "fp-test" },
        unsupportedClient as never,
      );

      const startTime = Date.now();
      await expect(provider.generateReference("test prompt")).rejects.toThrow();
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000);
    });

    it("executeSinglePromptText does not crash with TypeError when client lacks startThread", async () => {
      const mockClientWithoutThread = {
        connect: async () => {},
      };

      const result = await executeSinglePromptText(mockClientWithoutThread, "A photo of a bloody gun confrontation");

      // Falls back to rule-based sanitization gracefully
      expect(result).not.toContain("bloody");
      expect(result).not.toContain("gun");
      expect(result).toContain("crimson-toned dramatic");
    });
  });
});
