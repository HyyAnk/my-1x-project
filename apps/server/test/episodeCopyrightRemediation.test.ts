import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { QuizV2Schema } from "@studio/shared";
import { validateQuizV2Copyright, validateQuizQuestionCopyright, validateQuizScriptCopyright } from "../src/quiz/qa/copyrightValidator.js";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";

function resolveEpisodePath(): string {
  const absoluteChannelPath = path.resolve(
    "D:/1a Cursor Project/My 1x Youtube Channel File/channels/novy/episodes/arcade-game-secrets-true-or-false-gaming-showdown",
  );
  if (existsSync(absoluteChannelPath)) {
    return absoluteChannelPath;
  }
  return path.resolve(
    __dirname,
    "../../../../My 1x Youtube Channel File/channels/novy/episodes/arcade-game-secrets-true-or-false-gaming-showdown",
  );
}

describe("Stage 4 Episode Copyright Remediation & Regression Test", () => {
  const episodeDir = resolveEpisodePath();

  it("loads and parses remediated quiz-v2.json matching schema", () => {
    const quizPath = path.join(episodeDir, "quiz/quiz-v2.json");
    expect(existsSync(quizPath)).toBe(true);

    const raw = JSON.parse(readFileSync(quizPath, "utf8"));
    const parsedQuiz = QuizV2Schema.parse(raw);

    expect(parsedQuiz.episode_id).toBe("ep_4dc807da5f174c36");
    expect(parsedQuiz.questions).toHaveLength(3);
  });

  it("verifies visual opportunities are 100% free of trademarked copyright terms", () => {
    const quizPath = path.join(episodeDir, "quiz/quiz-v2.json");
    const parsedQuiz = QuizV2Schema.parse(JSON.parse(readFileSync(quizPath, "utf8")));

    for (const question of parsedQuiz.questions) {
      const visualCheck = validateQuizQuestionCopyright({
        ...question,
        question: "Generic question",
        explanation: "Generic explanation",
        choices: [
          { id: "a", text: "True" },
          { id: "b", text: "False" },
        ],
      });
      expect(visualCheck.violated).toBe(false);
    }
  });

  it("verifies Question 3 contains Pac-Man pizza trivia with safe visual proxy", () => {
    const quizPath = path.join(episodeDir, "quiz/quiz-v2.json");
    const parsedQuiz = QuizV2Schema.parse(JSON.parse(readFileSync(quizPath, "utf8")));
    const q3 = parsedQuiz.questions.find((q) => q.id === "question-03");

    expect(q3).toBeDefined();
    expect(q3?.question).toBe("Was Pac-Man inspired by a pizza missing one slice?");
    expect(q3?.correct_choice_id).toBe("choice-a");
    expect(q3?.explanation).toBe("The creator got the idea while eating round pizza!");
    expect(q3?.visual_opportunity).toContain(
      "glossy yellow round character smiling joyfully beside a giant delicious cheesy pizza with one slice missing",
    );
    expect(q3?.visual_opportunity?.toLowerCase()).not.toContain("pac-man");
  });

  it("validates scripts are synchronized with Pac-Man trivia across all files", () => {
    const scriptContent = readFileSync(path.join(episodeDir, "script.md"), "utf8");
    const dialogueContent = readFileSync(path.join(episodeDir, "dialogue_script.md"), "utf8");

    expect(scriptContent.toLowerCase()).toContain("was pac-man inspired by a pizza missing one slice?");
    expect(dialogueContent.toLowerCase()).toContain("was pac-man inspired by a pizza missing one slice?");
  });

  it("assesses remediated quiz and confirms zero copyright blockers and production_ready rating", () => {
    const quiz = JSON.parse(readFileSync(path.join(episodeDir, "quiz/quiz-v2.json"), "utf8"));
    const director = JSON.parse(readFileSync(path.join(episodeDir, "quiz/director-plan.json"), "utf8"));
    const assetPlan = JSON.parse(readFileSync(path.join(episodeDir, "quiz/asset-plan.json"), "utf8"));
    const assetRes = JSON.parse(readFileSync(path.join(episodeDir, "quiz/asset-resolution.json"), "utf8"));
    const voicePlan = JSON.parse(readFileSync(path.join(episodeDir, "quiz/voice-plan.json"), "utf8"));
    const timeline = JSON.parse(readFileSync(path.join(episodeDir, "quiz/timeline.json"), "utf8"));

    const channelPath = path.resolve("D:/1a Cursor Project/My 1x Youtube Channel File/channels/novy/channel.json");
    const channel = existsSync(channelPath) ? JSON.parse(readFileSync(channelPath, "utf8")) : null;

    const mascotPath = path.resolve(
      "D:/1a Cursor Project/My 1x Youtube Channel File/.quiz-studio/mascots/mascot_22cb190ece7b4475/mascot.json",
    );
    const mascot = existsSync(mascotPath) ? JSON.parse(readFileSync(mascotPath, "utf8")) : null;

    const assessment = assessQuiz({
      quiz,
      director,
      assetPlan,
      resolvedAssets: assetRes.assets,
      voicePlan,
      timeline,
      measuredAudio: true,
      mascot,
      mascotConfig: channel?.mascot_config,
    });

    const copyrightBlockers = assessment.issues.filter(
      (issue) => issue.code === "semantic_copyright_violation" && issue.severity === "blocker",
    );
    expect(copyrightBlockers).toHaveLength(0);

    const allBlockers = assessment.issues.filter((issue) => issue.severity === "blocker");
    expect(allBlockers).toHaveLength(0);

    expect(assessment.categories.semantic).toBeGreaterThanOrEqual(70);
    expect(assessment.score).toBeGreaterThanOrEqual(90);
    expect(assessment.rating).toBe("production_ready");
  });
});
