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
  language: "vi",
  questions: [
    {
      id: "question-01",
      number: 1,
      format: "text_multiple_choice",
      difficulty: 1,
      question: "Cá heo thở bằng gì?",
      choices: [
        { id: "choice-a", text: "Phổi" },
        { id: "choice-b", text: "Mang" },
        { id: "choice-c", text: "Da" },
      ],
      correct_choice_id: "choice-a",
      explanation: "Cá heo thở bằng phổi như con người.",
      fun_fact: "Cá heo phải ngoi lên mặt nước để thở.",
      source_ids: ["C01"],
      visual_opportunity: "Chú cá heo xanh vui nhộn nhảy vọt lên khỏi mặt nước biển.",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "question-02",
      number: 2,
      format: "text_multiple_choice",
      difficulty: 2,
      question: "Bạch tuộc có mấy quả tim?",
      choices: [
        { id: "choice-a", text: "1 quả" },
        { id: "choice-b", text: "3 quả" },
        { id: "choice-c", text: "2 quả" },
      ],
      correct_choice_id: "choice-b",
      explanation: "Bạch tuộc sở hữu tới 3 quả tim.",
      fun_fact: "Hai quả tim bơm máu qua mang, một quả đi khắp cơ thể.",
      source_ids: ["C02"],
      visual_opportunity: "Bạch tuộc màu cam tinh nghịch đang chơi trốn tìm trong rạn san hô.",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "question-03",
      number: 3,
      format: "text_multiple_choice",
      difficulty: 3,
      question: "Loài động vật nào lớn nhất đại dương?",
      choices: [
        { id: "choice-a", text: "Cá mập trắng" },
        { id: "choice-b", text: "Cá voi xanh" },
        { id: "choice-c", text: "Mực khổng lồ" },
      ],
      correct_choice_id: "choice-b",
      explanation: "Cá voi xanh là sinh vật lớn nhất từng sống trên Trái Đất.",
      fun_fact: "Tim cá voi xanh có thể to bằng một chiếc xe hơi.",
      source_ids: ["C03"],
      visual_opportunity: "Cá voi xanh khổng lồ bơi hiền hòa giữa lòng đại dương bao la.",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
};

describe("quizArtifactSynthesizer", () => {
  it("synthesizes script.md that strictly satisfies validateQuizScript", () => {
    const script = synthesizeScriptMarkdown(sampleQuiz, "Động vật biển kỳ thú");

    expect(script).toContain("# Động vật biển kỳ thú");
    expect(script).toContain("<!-- HUMOR_POLICY: v1 -->");
    expect(script).toContain("## Question 1 — Cá heo thở bằng gì?");
    expect(script).toContain("Take a guess and think carefully!");
    expect(script).toContain("The canonical correct answer is: Phổi.");

    // Must pass the repository's strict quality gate
    expect(() => validateQuizScript(script, 3)).not.toThrow();
  });

  it("synthesizes visual_bible.md that strictly satisfies validateQuizVisualBible", () => {
    const visualBible = synthesizeVisualBible(sampleQuiz);

    expect(visualBible).toContain("# Episode Visual Bible");
    expect(visualBible).toContain("## Safe motion");
    expect(visualBible).toContain("## Continuity bundle CB-01 — Question 1");
    expect(visualBible).toContain("Anchor-frame prompt: Chú cá heo xanh vui nhộn");

    // Must pass the repository's strict quality gate
    expect(() => validateQuizVisualBible(visualBible, [1, 2, 3])).not.toThrow();
  });

  it("synthesizes scenes that can be round-tripped through deriveQuizV2FromScenes", () => {
    const scenes = synthesizeScenesFromQuiz(sampleQuiz);

    expect(scenes).toHaveLength(3);
    expect(scenes[0].scene_id).toBe("scene-1");
    expect(scenes[0].quiz?.question_number).toBe(1);
    expect(scenes[0].quiz?.choices).toEqual(["Phổi", "Mang", "Da"]);
    expect(scenes[0].quiz?.answer).toBe("Phổi");

    // Reconstruct QuizV2 from scenes and verify equivalence
    const reconstructed = deriveQuizV2FromScenes({
      episodeId: sampleQuiz.episode_id,
      language: sampleQuiz.language,
      ageBand: sampleQuiz.age_band,
      format: "multiple_choice",
      scenes,
    });

    expect(reconstructed.questions).toHaveLength(3);
    expect(reconstructed.questions[0].question).toBe("Cá heo thở bằng gì?");
    expect(reconstructed.questions[1].question).toBe("Bạch tuộc có mấy quả tim?");
    expect(reconstructed.questions[2].question).toBe("Loài động vật nào lớn nhất đại dương?");
  });

  it("synthesizes all artifacts together in one call", () => {
    const all = synthesizeAllLegacyArtifacts(sampleQuiz);

    expect(all.script).toBeDefined();
    expect(all.visualBible).toBeDefined();
    expect(all.scenes).toHaveLength(3);
  });
});
