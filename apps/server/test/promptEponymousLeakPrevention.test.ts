import { describe, it, expect } from "vitest";
import {
  buildBatchGenerationPrompt,
  FRANCHISE_ANCHOR_MANDATE,
  FRANCHISE_ANCHOR_MANDATE_LINES,
  ZERO_STEM_LEAK_MANDATE,
  ZERO_STEM_LEAK_MANDATE_LINES,
} from "../src/quiz/bank/batchGeneratorPrompt.js";

describe("Prompt Eponymous Franchise Leak Prevention Directives (Phase 1)", () => {
  it("exports ZERO_STEM_LEAK_MANDATE and ZERO_STEM_LEAK_MANDATE_LINES with concrete resolution rules", () => {
    expect(ZERO_STEM_LEAK_MANDATE).toContain("ZERO ANSWER-IN-STEM MANDATE");
    expect(ZERO_STEM_LEAK_MANDATE).toContain("Pinocchio");
    expect(ZERO_STEM_LEAK_MANDATE).toContain("Cinderella");
    expect(ZERO_STEM_LEAK_MANDATE).toContain("Geppetto");
    expect(ZERO_STEM_LEAK_MANDATE_LINES.length).toBeGreaterThan(3);
  });

  it("embeds eponymous zero-leak rule inside FRANCHISE_ANCHOR_MANDATE and FRANCHISE_ANCHOR_MANDATE_LINES", () => {
    expect(FRANCHISE_ANCHOR_MANDATE).toContain("ZERO STEM-ANSWER LEAKAGE (EPONYMOUS FRANCHISE RULE)");
    expect(FRANCHISE_ANCHOR_MANDATE).toContain("In Pinocchio, which woodcarver created the wooden puppet? -> Geppetto");

    const linesJoined = FRANCHISE_ANCHOR_MANDATE_LINES.join("\n");
    expect(linesJoined).toContain("ZERO STEM-ANSWER LEAKAGE (EPONYMOUS TITLES)");
    expect(linesJoined).toContain("In Pinocchio, which woodcarver created the puppet? -> Geppetto");
  });

  it("injects eponymous zero-leak directives into batch generation prompts for deep_trivia", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "deep_trivia",
      domainId: "entertainment_popculture",
      subtopicId: "animation",
      count: 3,
      language: "en",
      difficulty: 1,
    });

    expect(prompt).toContain("ZERO STEM-ANSWER LEAKAGE (EPONYMOUS TITLES)");
    expect(prompt).toContain("In Pinocchio, which woodcarver created the puppet? -> Geppetto");
  });

  it("injects eponymous zero-leak directives into batch generation prompts for speed_blitz", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "speed_blitz",
      domainId: "entertainment_popculture",
      subtopicId: "animation",
      count: 3,
      language: "en",
      difficulty: 1,
    });

    expect(prompt).toContain("ZERO STEM-ANSWER LEAKAGE (EPONYMOUS TITLES)");
  });

  it("injects eponymous zero-leak directives into batch generation prompts for mystery_reveal", () => {
    const prompt = buildBatchGenerationPrompt({
      archetypeId: "mystery_reveal",
      domainId: "entertainment_popculture",
      subtopicId: "animation",
      count: 3,
      language: "en",
      difficulty: 1,
    });

    expect(prompt).toContain("ZERO STEM-ANSWER LEAKAGE (EPONYMOUS TITLES)");
  });
});
