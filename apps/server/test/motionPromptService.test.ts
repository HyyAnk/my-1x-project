import { describe, expect, it } from "vitest";
import {
  generateMotionPromptConfig,
  inferMotionMood,
} from "../src/introOutroScripts/services/motionPromptService.js";
import { compileOpusMotionPrompt } from "../src/introOutroScripts/prompts/motionPromptCompiler.js";
import { MotionPromptOutputSchema } from "@studio/shared";

describe("Motion Prompt Generator Service (Opus-Style)", () => {
  describe("inferMotionMood", () => {
    it("correctly identifies cyberpunk mood for futuristic and sci-fi topics", () => {
      expect(inferMotionMood("Space Exploration & Solar System")).toBe("cyberpunk");
      expect(inferMotionMood("Future AI & Cyber Robots")).toBe("cyberpunk");
      expect(inferMotionMood("Digital Matrix Codes")).toBe("cyberpunk");
    });

    it("identifies minimal_luxury for architectural, cultural, and historical topics", () => {
      expect(inferMotionMood("World Architecture & Art Design")).toBe("minimal_luxury");
      expect(inferMotionMood("Ancient Philosophy & Literature")).toBe("minimal_luxury");
    });

    it("identifies arcade_playful for retro games, cartoons, and kids topics", () => {
      expect(inferMotionMood("Retro Arcade Games & Pixel Art")).toBe("arcade_playful");
      expect(inferMotionMood("Kids Cartoon Party Fun")).toBe("arcade_playful");
    });

    it("identifies epic_cinematic for battles, mythology, and empires", () => {
      expect(inferMotionMood("Gladiator Battles of the Roman Empire")).toBe("epic_cinematic");
      expect(inferMotionMood("Mythology Heroes and Dragons")).toBe("epic_cinematic");
    });

    it("identifies educational_clean for science, math, and school subjects", () => {
      expect(inferMotionMood("Basic Physics and Math Trivia")).toBe("educational_clean");
      expect(inferMotionMood("World Geography and Countries")).toBe("educational_clean");
    });

    it("falls back to high_energy for generic high-tempo topics", () => {
      expect(inferMotionMood("Rapid Fire General Challenge")).toBe("high_energy");
    });
  });

  describe("compileOpusMotionPrompt", () => {
    it("compiles an Opus-style directive with all core constraints and timing breakdown", () => {
      const prompt = compileOpusMotionPrompt({
        topicTitle: "Space Odyssey Challenge",
        channelName: "CosmoQuiz",
        placement: "intro",
        mood: "cyberpunk",
        targetDurationSeconds: 2.8,
        audienceAgeBand: "7-9",
      });

      expect(prompt).toContain("# SYSTEM DIRECTIVE: OPUS-STYLE DETERMINISTIC MOTION GRAPHICS GENERATOR");
      expect(prompt).toContain('Quiz Topic: "Space Odyssey Challenge"');
      expect(prompt).toContain('Brand / Channel: "CosmoQuiz"');
      expect(prompt).toContain("Visual Mood: CYBERPUNK");
      expect(prompt).toContain("ZERO EXTERNAL DEPENDENCIES");
      expect(prompt).toContain("DETERMINISTIC TIMING");
      expect(prompt).toContain("CONTAINER CONTRACT");
      expect(prompt).toContain("CHOREOGRAPHY BREAKDOWN");
      expect(prompt).toContain("--duration: 2.80s");
    });
  });

  describe("generateMotionPromptConfig", () => {
    it("generates a valid schema-conforming configuration for an intro hook", () => {
      const output = generateMotionPromptConfig({
        topicTitle: "Cyberpunk 2077 Night City Trivia",
        channelName: "Gamer Zone",
        placement: "intro",
      });

      expect(output.mood).toBe("cyberpunk");
      expect(output.recommendedTemplateId).toBe("cyber_neon");
      expect(output.generatedOptions.accentColor).toBe("#00FFFF");
      expect(output.generatedOptions.headlineText).toBe("GAMER ZONE PRESENTS");
      expect(output.animationPhilosophy).toContain("cyberpunk");
      expect(output.llmPromptRecipe).toContain("SYSTEM DIRECTIVE");

      // Validates schema parsing
      expect(() => MotionPromptOutputSchema.parse(output)).not.toThrow();
    });

    it("generates a valid configuration for an outro hook", () => {
      const output = generateMotionPromptConfig({
        topicTitle: "Classic 90s Arcade Nostalgia",
        channelName: "Retro Arcade",
        placement: "outro",
      });

      expect(output.mood).toBe("arcade_playful");
      expect(output.recommendedTemplateId).toBe("scorecard_recap");
      expect(output.generatedOptions.accentColor).toBe("#FFD700");
      expect(output.generatedOptions.headlineText).toBe("FINAL LEADERBOARD");
      expect(output.generatedOptions.subheadlineText).toBe("PLAY AGAIN TOMORROW");
      expect(output.animationPhilosophy).toContain("Conversion-optimized");

      expect(() => MotionPromptOutputSchema.parse(output)).not.toThrow();
    });

    it("honors preferredTemplateId override when provided by user", () => {
      const output = generateMotionPromptConfig({
        topicTitle: "Deep Sea Ocean Mysteries",
        placement: "intro",
        preferredTemplateId: "kinetic_punch",
      });

      expect(output.recommendedTemplateId).toBe("kinetic_punch");
      expect(() => MotionPromptOutputSchema.parse(output)).not.toThrow();
    });
  });
});
