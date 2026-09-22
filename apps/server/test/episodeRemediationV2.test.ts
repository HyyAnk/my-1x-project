import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { QuizV2Schema, type QuizV2 } from "@studio/shared";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";

function resolveActiveEpisodeDir(): string {
  if (process.env.ACTIVE_EPISODE_DIR && existsSync(process.env.ACTIVE_EPISODE_DIR)) {
    return process.env.ACTIVE_EPISODE_DIR;
  }
  if (process.env.STUDIO_STORAGE_PATH) {
    const candidate = path.join(
      process.env.STUDIO_STORAGE_PATH,
      "channels/novy/episodes/arcade-game-secrets-true-or-false-gaming-showdown"
    );
    if (existsSync(candidate)) return candidate;
  }
  const projectRoot = path.resolve(__dirname, "../../..");
  const storageConfig = path.join(projectRoot, ".quiz-studio", "storage.local.json");
  if (existsSync(storageConfig)) {
    try {
      const parsed = JSON.parse(readFileSync(storageConfig, "utf8")) as { storage_path?: string };
      if (parsed.storage_path) {
        const candidate = path.join(
          parsed.storage_path,
          "channels/novy/episodes/arcade-game-secrets-true-or-false-gaming-showdown"
        );
        if (existsSync(candidate)) return candidate;
      }
    } catch { }
  }
  return path.resolve(__dirname, "fixtures/remediation");
}

const FIXTURE_EPISODE_DIR = path.resolve(__dirname, "fixtures/remediation");

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

describe("Active Episode Remediation V2 Acceptance Tests", () => {
  const episodeRoot = resolveActiveEpisodeDir();

  it("validates all episode questions use authentic arcade lore and end with interrogative question mark", () => {
    const quiz = loadJson<QuizV2>(path.join(episodeRoot, "quiz/quiz-v2.json"));
    const parsedQuiz = QuizV2Schema.parse(quiz);

    expect(parsedQuiz.questions.length).toBeGreaterThanOrEqual(3);
    for (const q of parsedQuiz.questions) {
      expect(q.question.trim().endsWith("?")).toBe(true);
      expect(q.question.length).toBeLessThanOrEqual(100);
      expect(q.choices).toHaveLength(2);
      expect(q.validation.fact_locked).toBe(true);
      expect(q.source_ids.length).toBeGreaterThan(0);
    }

    const pacmanQuestion = parsedQuiz.questions.find((q) => q.question.toLowerCase().includes("pac-man"));
    expect(pacmanQuestion).toBeDefined();
    expect(pacmanQuestion?.explanation).toContain("pizza");
  });

  it("confirms assessQuiz marks authentic Pac-Man character quiz as production_ready with zero blockers", () => {
    const quiz = loadJson<QuizV2>(path.join(episodeRoot, "quiz/quiz-v2.json"));
    const authenticQuiz: QuizV2 = {
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === "question-03"
          ? {
              ...q,
              visual_opportunity:
                "Authentic Pac-Man character eating glowing power pellets beside a giant pizza in a vibrant retro 1980s neon arcade hall.",
            }
          : q,
      ),
    };

    const director = loadJson(path.join(episodeRoot, "quiz/director-plan.json"));
    const assetPlan = loadJson(path.join(episodeRoot, "quiz/asset-plan.json"));
    const assetRes = loadJson<{ assets: Array<{ asset_id: string; path: string; source: string }> }>(
      path.join(episodeRoot, "quiz/asset-resolution.json"),
    );
    const voicePlan = loadJson(path.join(episodeRoot, "quiz/voice-plan.json"));
    const timeline = loadJson(path.join(episodeRoot, "quiz/timeline.json"));

    const assessment = assessQuiz({
      quiz: authenticQuiz,
      director,
      assetPlan,
      resolvedAssets: assetRes.assets,
      voicePlan,
      timeline,
      measuredAudio: true,
      renderIntegrity: true,
    });

    const blockers = assessment.issues.filter((i) => i.severity === "blocker");
    expect(blockers).toHaveLength(0);
    expect(assessment.rating).toBe("production_ready");
    expect(assessment.categories.semantic).toBe(100);
  });

  it("verifies active episode quiz/qa.json is saved with production_ready status and zero blockers", () => {
    const qaPath = path.join(episodeRoot, "quiz/qa.json");
    expect(existsSync(qaPath)).toBe(true);

    const qa = loadJson<{ rating: string; score: number; issues: Array<{ severity: string; code: string }> }>(qaPath);
    expect(qa.rating).toBe("production_ready");
    expect(qa.score).toBeGreaterThanOrEqual(90);

    const blockers = qa.issues.filter((i) => i.severity === "blocker");
    expect(blockers).toHaveLength(0);

    const copyrightIssues = qa.issues.filter((i) => i.code.includes("copyright"));
    expect(copyrightIssues).toHaveLength(0);
  });
});
