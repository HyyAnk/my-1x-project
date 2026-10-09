import { describe, expect, it } from "vitest";
import type { QuizV2 } from "@studio/shared";
import {
  synthesizeAllLegacyArtifacts,
  synthesizeScenesFromQuiz,
  synthesizeScriptMarkdown,
  synthesizeVisualBible,
} from "../src/quiz/domain/quizArtifactSynthesizer.js";
import { validateQuizScript, validateQuizVisualBible } from "../src/tasks/validators.js";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";

const sampleQuiz: QuizV2 = {
  schema_version: 2,
  episode_id: "ep-201",
  age_band: "7-9",
  language: "en",
  questions: [
    {
      id: "question-01",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "How do dolphins breathe?",
      choices: [
        { id: "choice-a", text: "Lungs" },
        { id: "choice-b", text: "Gills" },
        { id: "choice-c", text: "Skin" },
      ],
      correct_choice_id: "choice-a",
      explanation: "Dolphins breathe with lungs, just like people.",
      fun_fact: "Dolphins must swim to the surface to breathe.",
      source_ids: ["C01"],
      visual_opportunity: "A playful blue dolphin leaping out of the sea.",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "question-02",
      number: 2,
      format: "multiple_choice",
      difficulty: 2,
      question: "How many hearts does an octopus have?",
      choices: [
        { id: "choice-a", text: "1 heart" },
        { id: "choice-b", text: "3 hearts" },
        { id: "choice-c", text: "2 hearts" },
      ],
      correct_choice_id: "choice-b",
      explanation: "An octopus has three hearts.",
      fun_fact: "Two hearts pump blood through the gills and one pumps it around the body.",
      source_ids: ["C02"],
      visual_opportunity: "A cheeky orange octopus playing hide and seek in a coral reef.",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "question-03",
      number: 3,
      format: "multiple_choice",
      difficulty: 3,
      question: "Which animal is the largest in the ocean?",
      choices: [
        { id: "choice-a", text: "Great White Shark" },
        { id: "choice-b", text: "Blue Whale" },
        { id: "choice-c", text: "Giant Squid" },
      ],
      correct_choice_id: "choice-b",
      explanation: "The blue whale is the largest animal that has ever lived on Earth.",
      fun_fact: "A blue whale heart can be as big as a small car.",
      source_ids: ["C03"],
      visual_opportunity: "A gentle giant blue whale gliding through the open ocean.",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
};

describe("quizArtifactSynthesizer", () => {
  it("synthesizes script.md that strictly satisfies validateQuizScript", () => {
    const script = synthesizeScriptMarkdown(sampleQuiz, "Amazing Sea Animals");

    expect(script).toContain("# Amazing Sea Animals");
    expect(script).toContain("<!-- HUMOR_POLICY: v1 -->");
    expect(script).toContain("## Question 1 — How do dolphins breathe?");
    expect(script).toContain("Take a guess and think carefully!");
    expect(script).toContain("The canonical correct answer is: Lungs.");

    // Must pass the repository's strict quality gate
    expect(() => validateQuizScript(script, 3)).not.toThrow();
  });

  it("synthesizes visual_bible.md that strictly satisfies validateQuizVisualBible", () => {
    const visualBible = synthesizeVisualBible(sampleQuiz);

    expect(visualBible).toContain("# Episode Visual Bible");
    expect(visualBible).toContain("## Safe motion");
    expect(visualBible).toContain("## Continuity bundle CB-01 — Question 1");
    expect(visualBible).toContain("Anchor-frame prompt: A playful blue dolphin");

    // Must pass the repository's strict quality gate
    expect(() => validateQuizVisualBible(visualBible, [1, 2, 3])).not.toThrow();
  });

  it("synthesizes scenes that can be round-tripped through deriveQuizV2FromScenes", () => {
    const scenes = synthesizeScenesFromQuiz(sampleQuiz);

    expect(scenes).toHaveLength(3);
    expect(scenes[0].scene_id).toBe("scene-1");
    expect(scenes[0].quiz?.question_number).toBe(1);
    expect(scenes[0].quiz?.choices).toEqual(["Lungs", "Gills", "Skin"]);
    expect(scenes[0].quiz?.answer).toBe("Lungs");

    // Reconstruct QuizV2 from scenes and verify equivalence
    const reconstructed = deriveQuizV2FromScenes({
      episodeId: sampleQuiz.episode_id,
      language: sampleQuiz.language,
      ageBand: sampleQuiz.age_band,
      format: "multiple_choice",
      scenes,
    });

    expect(reconstructed.questions).toHaveLength(3);
    expect(reconstructed.questions[0].question).toBe("How do dolphins breathe?");
    expect(reconstructed.questions[1].question).toBe("How many hearts does an octopus have?");
    expect(reconstructed.questions[2].question).toBe("Which animal is the largest in the ocean?");
  });

  it("synthesizes all artifacts together in one call", () => {
    const all = synthesizeAllLegacyArtifacts(sampleQuiz);

    expect(all.script).toBeDefined();
    expect(all.visualBible).toBeDefined();
    expect(all.scenes).toHaveLength(3);
  });
});
