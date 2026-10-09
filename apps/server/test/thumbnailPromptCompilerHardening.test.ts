import { describe, expect, it } from "vitest";
import type { MascotProfile, ThumbnailLayoutType } from "@studio/shared";
import {
  compileThumbnailPrompt,
  parseAiPlanJson,
  planThumbnailWithAI,
  resolveThumbnailLayout,
  sanitizeCompiledPrompt,
  stripForbiddenStickers,
} from "../src/quiz/thumbnail/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const sampleMascot: MascotProfile = {
  id: "mascot_hero_1",
  name: "Barnaby",
  species: "bear",
  personality: "friendly and adventurous",
  catchphrase: "Let's discover!",
  visual_description: "A cheerful golden bear wearing blue denim overalls",
  color_theme: "#f59e0b",
};

function createMockLlm(responseObject: unknown): LLMClient {
  return {
    async executePrompt() {
      return JSON.stringify(responseObject);
    },
  };
}

describe("Stage 4: Prompt Compiler Hardening & Guardrails", () => {
  describe("50/30/20 Visual Hierarchy Contract", () => {
    const allLayouts: ThumbnailLayoutType[] = [
      "mega_grid",
      "split_vs",
      "mystery_silhouette",
      "odd_one_out",
      "difficulty_tier",
      "yes_no",
    ];

    it.each(allLayouts)("injects 50/30/20 visual hierarchy contract for %s layout", (layout) => {
      const plan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes",
        questionFormat: layout === "yes_no" ? "yes_no" : "standard",
        layoutOverride: layout,
        mascotProfile: sampleMascot,
      });

      const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
      expect(prompt169).toContain("Visual Hierarchy Contract (50/30/20 Balance)");
      expect(prompt169).toContain("Primary 50% visual weight");
      expect(prompt169).toContain("secondary 30% visual weight");
      expect(prompt169).toContain("supporting 20% visual weight");

      const prompt916 = compileThumbnailPrompt(plan, "9:16", sampleMascot);
      expect(prompt916).toContain("Visual Hierarchy Contract (50/30/20 Balance)");
    });
  });

  describe("Safe-Zone Directives Enforcement", () => {
    it("enforces YouTube timestamp safe zone in 16:9 prompts", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Space Station Adventures",
        mascotProfile: sampleMascot,
      });

      const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
      expect(prompt169).toContain("bottom-right corner");
      expect(prompt169).toContain("YouTube timestamp safe zone");
    });

    it("enforces 440px bottom buffer & middle 60% vertical safe zone in 9:16 prompts", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Deep Sea Odyssey",
        mascotProfile: sampleMascot,
      });

      const prompt916 = compileThumbnailPrompt(plan, "9:16", sampleMascot);
      expect(prompt916).toContain("440px bottom buffer");
      expect(prompt916).toContain("middle 60% vertical safe zone");
      expect(prompt916).toContain("bottom 25%");
    });
  });

  describe("Anti-Duplicate Token Sanitizer", () => {
    it("strips forbidden stickers (✅, ❌, ✓, ✗)", () => {
      const dirty = "Visual scene with checkmark ✅ and cross ❌ and tick ✓ and cross ✗.";
      const cleaned = stripForbiddenStickers(dirty);
      expect(cleaned).not.toContain("✅");
      expect(cleaned).not.toContain("❌");
      expect(cleaned).not.toContain("✓");
      expect(cleaned).not.toContain("✗");
    });

    it("sanitizes yes_no prompts to prevent duplicate yes/no paddles on mascot", () => {
      const dirtyPrompt =
        "Center hero artwork. Two tactile arcade buttons: green 'YES' and red 'NO'. Mascot holding a paddle with yes or no in hand. Keep the bottom-right corner clean with zero text (YouTube timestamp safe zone).";
      const sanitized = sanitizeCompiledPrompt(dirtyPrompt, "yes_no", "16:9");
      expect(sanitized).not.toMatch(/paddle with yes or no/i);
      expect(sanitized).toContain("hand resting thoughtfully under chin in skeptical contemplation");
      expect(sanitized).toContain("Two tactile arcade buttons: green 'YES' and red 'NO'");
    });
  });

  describe("Resilient AI Plan JSON Parsing (parseAiPlanJson)", () => {
    it("parses valid JSON enclosed in markdown code fences", () => {
      const input = "```json\n{\n  \"hook_text\": \"SPACE EXPEDITION\",\n  \"badge_text\": \"TOP 1% 🚀\"\n}\n```";
      const result = parseAiPlanJson(input);
      expect(result).not.toBeNull();
      expect(result?.hook_text).toBe("SPACE EXPEDITION");
      expect(result?.badge_text).toBe("TOP 1% 🚀");
    });

    it("parses raw JSON without code fences but with conversational preamble", () => {
      const input = "Here is the thumbnail plan:\n{\n  \"hook_text\": \"FIRST AID SECRETS\",\n  \"layout\": \"mega_grid\"\n}\nHope this helps!";
      const result = parseAiPlanJson(input);
      expect(result).not.toBeNull();
      expect(result?.hook_text).toBe("FIRST AID SECRETS");
      expect(result?.layout).toBe("mega_grid");
    });

    it("handles trailing commas before closing braces and brackets", () => {
      const input = "{\n  \"hook_text\": \"MEDICINE HEROES\",\n  \"subject_anchors\": [\n    {\"label\": \"Stethoscope\",},\n  ],\n}";
      const result = parseAiPlanJson(input);
      expect(result).not.toBeNull();
      expect(result?.hook_text).toBe("MEDICINE HEROES");
      expect(result?.subject_anchors?.[0]?.label).toBe("Stethoscope");
    });

    it("handles single-line comments in JSON", () => {
      const input = "{\n  // Ultra-punchy headline\n  \"hook_text\": \"HEROES ASSEMBLE\",\n  \"badge_text\": \"IQ 140+ ⚡\"\n}";
      const result = parseAiPlanJson(input);
      expect(result).not.toBeNull();
      expect(result?.hook_text).toBe("HEROES ASSEMBLE");
    });

    it("returns null on completely invalid non-JSON strings", () => {
      expect(parseAiPlanJson("")).toBeNull();
      expect(parseAiPlanJson("I cannot generate a plan for this.")).toBeNull();
    });
  });

  describe("AI Planner Anti-Generic Interceptor", () => {
    it("intercepts generic 'GENERAL KNOWLEDGE' hallucination and derives topic hook", async () => {
      const mockLlm = createMockLlm({
        hook_text: "GENERAL KNOWLEDGE",
        badge_text: "99% FAIL! 😱",
        layout: "mega_grid",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "School Clinic Secrets: First Aid Heroes",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      expect(plan.hookText).not.toBe("GENERAL KNOWLEDGE");
      expect(plan.hookText).toBe("FIRST AID HEROES!");
    });

    it("intercepts generic 'TRUE OR FALSE' hallucination from a retired true_false layout answer", async () => {
      const mockLlm = createMockLlm({
        hook_text: "TRUE OR FALSE",
        badge_text: "IMPOSSIBLE 🎯",
        layout: "true_false",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Ocean Secrets: Deep Sea Mysteries",
        questionFormat: "yes_no",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      expect(plan.layout).toBe("yes_no");
      expect(plan.hookText).not.toBe("TRUE OR FALSE");
      expect(plan.hookText).toBe("DEEP OCEAN MYSTERIES!");
    });

    it("intercepts generic 'QUIZ CHALLENGE' hallucination and derives topic hook", async () => {
      const mockLlm = createMockLlm({
        hook_text: "QUIZ CHALLENGE",
        badge_text: "CAN YOU PASS? 🧠",
        layout: "difficulty_tier",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "Space Station Alpha: Orbit Quiz",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      expect(plan.hookText).not.toBe("QUIZ CHALLENGE");
      expect(plan.hookText).toBe("SOLAR SYSTEM QUIZ");
    });
  });
});
