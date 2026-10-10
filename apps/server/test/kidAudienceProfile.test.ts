import { describe, expect, it } from "vitest";
import type { BankQuestion } from "@studio/shared";
import { isAgeBandSuitableFor, resolveCombinedAgeBand } from "../src/quiz/bank/audience/audienceBand.js";
import { estimateAudienceProfile } from "../src/quiz/bank/audience/audienceProfile.js";
import { checkKidReadingLevel } from "../src/quiz/bank/audience/kidReadingLevel.js";
import { countSyllables, fleschKincaidGrade } from "../src/quiz/bank/audience/readability.js";
import { checkKidAudienceIssues } from "../src/quiz/bank/autoQa/kidAudienceRules.js";
import { KID_SAFETY_HIDDEN_TAG_PREFIX, reviewQuestionForKidAudience } from "../src/quiz/bank/kidSafety/kidAudienceReview.js";

const ACADEMIC_EXPLANATION =
  "Surgeons are specialized medical doctors licensed to perform invasive operative procedures using scalpels and surgical instruments inside sterile operating theaters.";

function makeQuestion(overrides: Partial<BankQuestion> = {}): BankQuestion {
  return {
    id: "KID-001",
    archetype_id: "deep_trivia",
    domain_id: "nature_animals",
    subtopic_id: "ocean_giants",
    language: "en",
    question: "Which animal is the biggest in the sea?",
    format: "multiple_choice",
    choices: [
      { id: "A", text: "Blue Whale", is_correct: true },
      { id: "B", text: "Shark", is_correct: false },
      { id: "C", text: "Squid", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "The blue whale is the biggest. It is longer than a bus.",
    fun_fact: "Its heart is as big as a small car!",
    age_band: "family",
    difficulty: 2,
    tags: [],
    status: "approved",
    ...overrides,
  };
}

describe("readability", () => {
  it("counts syllables and grades plain copy lower than academic copy", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("elephant")).toBe(3);
    expect(fleschKincaidGrade("The cat sat on the mat.")).toBeLessThan(3);
    expect(fleschKincaidGrade(ACADEMIC_EXPLANATION)).toBeGreaterThan(14);
  });
});

describe("audience profile", () => {
  it("places simple questions in a young band with low difficulty", () => {
    const profile = estimateAudienceProfile({ question: "What color is the sky?", explanation: "The sky is blue on a sunny day." });
    expect(profile.age_band).toBe("4-6");
    expect(profile.difficulty).toBe(1);
  });

  it("places academic copy in the family band with high difficulty", () => {
    const profile = estimateAudienceProfile({
      question: "Which professional performs invasive operations?",
      explanation: ACADEMIC_EXPLANATION,
    });
    expect(profile.age_band).toBe("family");
    expect(profile.difficulty).toBe(5);
  });

  it("orders bands from youngest to broadest", () => {
    expect(isAgeBandSuitableFor("7-9", "family")).toBe(true);
    expect(isAgeBandSuitableFor("10-12", "7-9")).toBe(false);
    expect(resolveCombinedAgeBand(["4-6", "10-12", "7-9"])).toBe("10-12");
    expect(resolveCombinedAgeBand([])).toBe("family");
  });
});

describe("kid reading level and Auto-QA kid rules", () => {
  it("accepts short plain copy and rejects long academic explanations", () => {
    expect(checkKidReadingLevel(makeQuestion())).toEqual([]);
    const issues = checkKidReadingLevel(makeQuestion({ explanation: `${ACADEMIC_EXPLANATION} ${ACADEMIC_EXPLANATION}` }));
    expect(issues.map((issue) => issue.field)).toContain("explanation");
  });

  it("raises a kid_safety quality issue for unsuitable content", () => {
    const issues = checkKidAudienceIssues(makeQuestion({ question: "Which casino game spins a wheel?" }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: "quality", details: { rule: "kid_safety", category: "gambling" } });
  });

  it("raises a kid_safety issue when the visual prompt is unsuitable", () => {
    const question = makeQuestion({
      visual_spec: { intent: "question_illustration", aspect_ratio: "16:9", prompt: "A bloody battlefield full of zombies" },
    });
    expect(checkKidAudienceIssues(question)[0]).toMatchObject({ details: { rule: "kid_safety", field: "visual_prompt" } });
  });

  it("screens malformed model candidates without throwing", () => {
    const malformed = { ...makeQuestion(), question: undefined, choices: undefined } as unknown as BankQuestion;
    expect(() => checkKidAudienceIssues(malformed)).not.toThrow();
  });
});

describe("kid audience review", () => {
  it("re-measures age band and difficulty without hiding suitable questions", () => {
    const review = reviewQuestionForKidAudience(makeQuestion());
    expect(review.hiddenFinding).toBeNull();
    expect(review.question.status).toBe("approved");
    expect(review.question.age_band).not.toBe("family");
    expect(review.changed).toBe(true);
  });

  it("archives unsuitable approved questions and tags the reason", () => {
    const review = reviewQuestionForKidAudience(makeQuestion({ fun_fact: "The ship has a casino on board." }));
    expect(review.question.status).toBe("archived");
    expect(review.question.tags).toEqual([`${KID_SAFETY_HIDDEN_TAG_PREFIX}gambling`]);
  });

  it("archives questions about teen- or mature-rated subjects", () => {
    const review = reviewQuestionForKidAudience(makeQuestion({ entity_id: "ENT-GAM-012" }), {
      restrictedEntityRating: (id) => (id === "ENT-GAM-012" ? "mature" : null),
    });
    expect(review.question.status).toBe("archived");
    expect(review.hiddenFinding?.term).toContain("mature-rated subject");
  });

  it("is idempotent once a question has been reviewed", () => {
    const once = reviewQuestionForKidAudience(makeQuestion()).question;
    expect(reviewQuestionForKidAudience(once).changed).toBe(false);
  });
});
