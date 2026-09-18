import { describe, expect, it } from "vitest";
import type { Episode } from "@studio/shared";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";

function makeEpisode(): Episode {
  return {
    episode_id: "ep_test_001",
    topic: { title: "Ocean Giants" },
  } as unknown as Episode;
}

describe("buildDirectQuizOutputContract", () => {
  it("states the explicit channel language instead of an ambiguous auto value", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: makeEpisode(),
      quizQuestionCount: 8,
      quizLastClaimId: "C08",
      quizSourceMinimum: 4,
      channelLanguage: "Vietnamese",
    });

    expect(contract).toContain('"language": "Vietnamese"');
    expect(contract).not.toContain('"language": "auto"');
    expect(contract).toContain('Write every question, choice text, explanation, and fun_fact 100% in "Vietnamese"');
    expect(contract).toContain("Never mix any other language");
  });

  it("falls back to English when no channel language is provided", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: makeEpisode(),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });

    expect(contract).toContain('"language": "en"');
  });

  it("enforces the Franchise Anchor Mandate in direct quiz output contract", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: makeEpisode(),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });

    expect(contract).toContain("=== FRANCHISE ANCHOR MANDATE (CRITICAL FOR CASUAL AUDIENCE) ===");
    expect(contract).toContain("NEVER formulate a question around an isolated, naked character name");
    expect(contract).toContain("ALWAYS explicitly anchor the parent franchise or show title in the question prompt");
    expect(contract).toContain("In Jujutsu Kaisen, which sorcerer...");
    expect(contract).toContain("In Dragon Ball Z, whose signature beam is...");
    expect(contract).toContain(
      "Franchise Anchoring: When generating questions about anime, manga, gaming, comics, movies, or fictional characters",
    );
  });

  it("enforces Visual Opportunity Entity & Setting Mandate in visual_opportunity prompt contract", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: makeEpisode(),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });

    expect(contract).toContain("=== VISUAL SPEC & CONTINUITY ANCHOR MANDATE (CRITICAL FOR ACCURATE ILLUSTRATIONS) ===");
    expect(contract).toContain("ALWAYS explicitly name the character/entity and their parent franchise or lore universe");
    expect(contract).toContain("NEVER describe iconic subjects with vague generic placeholders");
    expect(contract).toContain("ALWAYS anchor the subject in an authentic, lore-accurate environment/setting");
    expect(contract).toContain(
      'Visual Opportunity Entity & Setting Mandate: The "visual_opportunity" field is used directly by AI image generators',
    );
    expect(contract).toContain(
      "ENTITY & FRANCHISE IDENTITY: ALWAYS explicitly name the specific character/entity and their parent franchise or lore universe",
    );
    expect(contract).toContain('VISUAL PROMPT LANGUAGE: The "visual_opportunity" field MUST ALWAYS be written 100% in English');
  });
});
