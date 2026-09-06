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
    expect(contract).toContain("Write every question, choice text, explanation, and fun_fact 100% in \"Vietnamese\"");
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
});
