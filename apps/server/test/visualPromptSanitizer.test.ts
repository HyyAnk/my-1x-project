import { describe, expect, it } from "vitest";
import type { QuizAssetRequirement } from "@studio/shared";
import {
  sanitizeVisualSubject,
  sanitizeVisualPrompt,
  validateVisualPromptSafety,
  containsProhibitedVisualTerms,
} from "../src/quiz/assets/visualPromptSanitizer.js";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { AntigravityNativeImageProvider } from "../src/providers/antigravity/provider.js";
import { executeSinglePromptText } from "../src/utils/promptSanitizer.js";
import { RepositoryService } from "../src/repository.js";
import path from "node:path";
import os from "node:os";

describe("Visual Prompt Sanitizer", () => {
  describe("Subject Sanitization", () => {
    it("sanitizes Pac-Man into safe retro arcade proxy", () => {
      const sanitized = sanitizeVisualSubject("Pac-Man");
      expect(sanitized.toLowerCase()).not.toContain("pac-man");
      expect(sanitized).toMatch(/retro yellow.*arcade.*character|chomping glowing dots/i);
    });

    it("sanitizes Super Mario into safe retro platformer plumber proxy", () => {
      const sanitized = sanitizeVisualSubject("Super Mario");
      expect(sanitized.toLowerCase()).not.toContain("mario");
      expect(sanitized).toMatch(/cheerful retro arcade plumber|overalls/i);
    });

    it("sanitizes Pikachu into safe electric yellow creature proxy", () => {
      const sanitized = sanitizeVisualSubject("Pikachu");
      expect(sanitized.toLowerCase()).not.toContain("pikachu");
      expect(sanitized).toMatch(/electric yellow rodent creature|lightning bolt/i);
    });

    it("sanitizes Lion Cub and baby lion into majestic young golden lion", () => {
      const sanitizedCub = sanitizeVisualSubject("Lion Cub");
      expect(sanitizedCub.toLowerCase()).not.toContain("lion cub");
      expect(sanitizedCub).toMatch(/majestic young golden lion/i);

      const sanitizedBaby = sanitizeVisualSubject("a cute baby lion playing");
      expect(sanitizedBaby.toLowerCase()).not.toContain("baby lion");
      expect(sanitizedBaby).toMatch(/majestic young golden lion/i);
    });

    it("sanitizes Minecraft Creeper into pixelated green block creature", () => {
      const sanitized = sanitizeVisualSubject("Minecraft Creeper");
      expect(sanitized.toLowerCase()).not.toContain("creeper");
      expect(sanitized.toLowerCase()).not.toContain("minecraft");
      expect(sanitized).toMatch(/pixelated green.*block creature/i);
    });

    it("sanitizes Spider-Man into heroic costumed acrobat proxy", () => {
      const sanitized = sanitizeVisualSubject("Spider-Man");
      expect(sanitized.toLowerCase()).not.toContain("spider-man");
      expect(sanitized).toMatch(/heroic.*costumed acrobat|web/i);
    });

    it("sanitizes Batman into dark cloaked vigilante proxy", () => {
      const sanitized = sanitizeVisualSubject("Batman");
      expect(sanitized.toLowerCase()).not.toContain("batman");
      expect(sanitized).toMatch(/dark cloaked vigilante detective/i);
    });

    it("sanitizes Mickey Mouse into vintage cartoon mouse proxy", () => {
      const sanitized = sanitizeVisualSubject("Mickey Mouse");
      expect(sanitized.toLowerCase()).not.toContain("mickey mouse");
      expect(sanitized).toMatch(/retro cartoon mouse|round ears/i);
    });

    it("sanitizes Sonic the Hedgehog into cobalt blue woodland hedgehog proxy", () => {
      const sanitized = sanitizeVisualSubject("Sonic the Hedgehog");
      expect(sanitized.toLowerCase()).not.toContain("sonic");
      expect(sanitized).toMatch(/cobalt blue.*hedgehog/i);
    });

    it("preserves non-trademarked clean subjects completely intact", () => {
      const clean1 = "A vintage red bicycle resting against a brick wall";
      expect(sanitizeVisualSubject(clean1)).toBe(clean1);

      const clean2 = "A friendly golden retriever puppy playing with a tennis ball";
      expect(sanitizeVisualSubject(clean2)).toBe(clean2);

      const clean3 = "A massive volcanic eruption with glowing orange lava flows";
      expect(sanitizeVisualSubject(clean3)).toBe(clean3);
    });
  });

  describe("Full Prompt Sanitization & Pre-flight Validation", () => {
    it("sanitizes embedded trademark character references inside a prompt", () => {
      const rawPrompt = "Create a portrait of Pikachu and Pac-Man having a picnic in Minecraft.";
      const sanitized = sanitizeVisualPrompt(rawPrompt);

      expect(sanitized.toLowerCase()).not.toContain("pikachu");
      expect(sanitized.toLowerCase()).not.toContain("pac-man");
      expect(sanitized.toLowerCase()).not.toContain("minecraft");
      expect(sanitized).toContain("electric yellow rodent creature");
      expect(sanitized).toContain("retro yellow arcade character");
    });

    it("detects prohibited visual terms with containsProhibitedVisualTerms", () => {
      const dirty = containsProhibitedVisualTerms("A cool image of Spider-Man leaping");
      expect(dirty.found).toBe(true);
      expect(dirty.term?.toLowerCase()).toContain("spider-man");

      const clean = containsProhibitedVisualTerms("A graceful white egret standing in a peaceful pond");
      expect(clean.found).toBe(false);
      expect(clean.term).toBeUndefined();
    });

    it("validates visual prompt safety reporting all violations", () => {
      const validation = validateVisualPromptSafety("Batman fighting Bowser in a Nintendo arena");
      expect(validation.safe).toBe(false);
      expect(validation.violations.length).toBeGreaterThanOrEqual(2);

      const cleanValidation = validateVisualPromptSafety("A majestic mountain peak during sunset with snow");
      expect(cleanValidation.safe).toBe(true);
      expect(cleanValidation.violations).toHaveLength(0);
    });
  });

  describe("Integration with compileQuizAssetPrompt", () => {
    it("automatically sanitizes trademark subject in compileQuizAssetPrompt", () => {
      const requirement: QuizAssetRequirement = {
        asset_id: "asset-question-01-hero",
        purpose: "hero_question_image",
        subject: "Pac-Man",
        aspect_ratio: "16:9",
        required: true,
      };

      const compiled = compileQuizAssetPrompt(requirement);
      expect(compiled.prompt.toLowerCase()).not.toContain("subject: pac-man");
      expect(compiled.prompt).toMatch(/retro yellow.*arcade.*character|chomping glowing dots/i);
      expect(validateVisualPromptSafety(compiled.prompt).safe).toBe(true);
    });

    it("sanitizes Lion Cub in quiz asset hero question prompt", () => {
      const requirement: QuizAssetRequirement = {
        asset_id: "asset-question-02-hero",
        purpose: "hero_question_image",
        subject: "Lion Cub playing in the savannah",
        aspect_ratio: "16:9",
        required: true,
      };

      const compiled = compileQuizAssetPrompt(requirement);
      expect(compiled.prompt.toLowerCase()).not.toContain("lion cub");
      expect(compiled.prompt).toContain("majestic young golden lion");
      expect(validateVisualPromptSafety(compiled.prompt).safe).toBe(true);
    });

    it("preserves standard educational quiz subjects without unwanted alteration", () => {
      const requirement: QuizAssetRequirement = {
        asset_id: "asset-question-03-hero",
        purpose: "hero_question_image",
        subject: "A Tyrannosaurus Rex in a prehistoric jungle",
        aspect_ratio: "16:9",
        required: true,
      };

      const compiled = compileQuizAssetPrompt(requirement);
      expect(compiled.prompt).toContain("Subject: A Tyrannosaurus Rex in a prehistoric jungle.");
      expect(compiled.prompt).toContain("3D Pixar Animation");
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
      // Should fail fast and not wait for 5 backoff intervals (which would take >15 seconds in normal mode or >500ms in test)
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

    it("sanitizes additional diverse characters (Luigi, Bowser, SpongeBob, Simba, Elsa)", () => {
      expect(sanitizeVisualSubject("Luigi")).toMatch(/tall green-capped.*(?:brother|plumber|overalls)/i);
      expect(sanitizeVisualSubject("Bowser")).toMatch(/massive fiery spiked dragon-turtle/i);
      expect(sanitizeVisualSubject("SpongeBob SquarePants")).toMatch(/cheerful yellow sea sponge/i);
      expect(sanitizeVisualSubject("Simba")).toMatch(/spirited young golden savannah lion/i);
      expect(sanitizeVisualSubject("Elsa")).toMatch(/ice sorceress queen/i);
    });

    it("sanitizes answer_option choices in compileQuizAssetPrompt", () => {
      const choiceReq: QuizAssetRequirement = {
        asset_id: "asset-question-01-choice-a",
        purpose: "answer_option",
        subject: "Super Mario jumping",
        aspect_ratio: "1:1",
        required: false,
      };

      const compiled = compileQuizAssetPrompt(choiceReq);
      expect(compiled.prompt.toLowerCase()).not.toContain("super mario");
      expect(compiled.prompt).toMatch(/cheerful.*retro.*plumber|overalls/i);
      expect(validateVisualPromptSafety(compiled.prompt).safe).toBe(true);
    });
  });
});
