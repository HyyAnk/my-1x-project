import { describe, expect, it } from "vitest";
import type { QuizV2 } from "@studio/shared";
import { extractBridgeShowcaseItems } from "../src/quiz/assets/bridgeTopicEntityExtractor.js";
import {
  buildExclusionClause,
  buildTopicIgnoreSet,
  extractSalientKeywords,
  sharesEntity,
} from "../src/quiz/assets/showcaseSubjectDistinctness.js";

function makeQuestion(id: string, question: string, visualOpportunity: string): QuizV2["questions"][number] {
  return {
    id,
    number: Number(id.replace(/\D/g, "")) || 1,
    format: "multiple_choice",
    difficulty: 1,
    question,
    choices: [{ id: "c1", text: "A" }, { id: "c2", text: "B" }],
    correct_answer: "c1",
    explanation: "Because.",
    visual_opportunity: visualOpportunity,
  };
}

const mythicalMonsterQuiz: QuizV2 = {
  episode_id: "ep_mythical",
  topic: { title: "Mythical Monster Truth Test", category: "mythology", target_age: "7-9" },
  questions: [
    makeQuestion("q1", "Which creature has a lion body and human head?", "Majestic sphinx creature with golden pharaoh headdress"),
    makeQuestion("q2", "Who guards the pyramids?", "Cinematic portrait of the great sphinx king guarding pyramids at dusk"),
    makeQuestion("q3", "Which winged horse flies?", "Stylized pegasus creature with white feathered wings"),
    makeQuestion("q4", "Which fox has nine tails?", "Nine-tailed fox creature glowing under the moon"),
    makeQuestion("q5", "Where do dragons live?", "Ancient mountain temple ruins where the sphinx sleeps"),
  ],
};

describe("showcaseSubjectDistinctness", () => {
  it("ignores topic words and generic descriptors when extracting salient keywords", () => {
    const ignore = buildTopicIgnoreSet("Mythical Monster Truth Test");
    const keywords = extractSalientKeywords("Cinematic portrait of a mythical monster sphinx with golden light", ignore);
    expect([...keywords]).toEqual(["sphinx"]);
  });

  it("treats subjects that share one core entity word as the same entity", () => {
    const ignore = buildTopicIgnoreSet("Mythical Monster");
    expect(sharesEntity(
      "Majestic sphinx creature with golden pharaoh headdress",
      "Cinematic portrait of the great sphinxes guarding pyramids",
      ignore,
    )).toBe(true);
    expect(sharesEntity(
      "Stylized pegasus with white feathered wings",
      "Nine-tailed fox glowing under the moon",
      ignore,
    )).toBe(false);
  });

  it("builds a bounded exclusion clause from chosen subjects", () => {
    const ignore = buildTopicIgnoreSet("Mythical Monster");
    const clause = buildExclusionClause(["Majestic sphinx with pharaoh headdress", "Pegasus with wings"], ignore);
    expect(clause).toContain("must not depict");
    expect(clause).toContain("sphinx");
    expect(clause).toContain("pegasu");
  });
});

describe("extractBridgeShowcaseItems entity uniqueness", () => {
  it("never places the same entity in two showcase slots", () => {
    const items = extractBridgeShowcaseItems(mythicalMonsterQuiz);
    const ignore = buildTopicIgnoreSet("Mythical Monster Truth Test");
    const subjects = items.map((item) => item.subject);

    expect(subjects).toHaveLength(4);
    const sphinxCount = subjects.filter((s) => /sphinx/i.test(s.replace(/\(must not depict:[^)]*\)/, ""))).length;
    expect(sphinxCount).toBe(1);

    for (let i = 0; i < subjects.length; i++) {
      for (let j = i + 1; j < subjects.length; j++) {
        expect(sharesEntity(subjects[i], subjects[j], ignore)).toBe(false);
      }
    }
  });

  it("appends an exclusion clause to fallback subjects when clue pools are exhausted", () => {
    const items = extractBridgeShowcaseItems(mythicalMonsterQuiz);
    const fallbackItems = items.filter((item) => item.subject.includes("must not depict"));
    expect(fallbackItems.length).toBeGreaterThan(0);
    for (const item of fallbackItems) {
      expect(item.subject).toMatch(/must not depict: .*sphinx/);
    }
  });
});
