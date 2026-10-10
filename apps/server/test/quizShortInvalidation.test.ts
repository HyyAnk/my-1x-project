import { readFile, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { invalidateQuizArtifacts, type QuizArtifactStage } from "../src/quiz/pipeline/invalidation.js";
import { hasQuizSourceSettingsChanged } from "../src/repository/quizShortSettings.js";
import { buildQuizShortConfig } from "./fixtures/quizShortFixtures.js";
import { createQuizShortPipelineHarness, type QuizShortPipelineHarness } from "./fixtures/quizShortPipelineHarness.js";

const DIRECTOR_DOWNSTREAM: QuizArtifactStage[] = ["assets", "asset_resolution", "voice", "timeline", "render", "qa"];
const ARTIFACT_FILES = ["director-plan.json", "asset-plan.json", "voice-plan.json", "timeline.json", "qa.json"] as const;

const harnesses: QuizShortPipelineHarness[] = [];

afterEach(async () => {
  await Promise.all(
    harnesses.splice(0).map((harness) => rm(harness.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })),
  );
});

async function seedArtifacts(harness: QuizShortPipelineHarness): Promise<string[]> {
  const paths: string[] = [];
  for (const filename of ARTIFACT_FILES) {
    const target = await harness.repository.quizArtifactTarget(harness.channelId, harness.ref, filename);
    await writeFile(target.absolutePath, "{}", "utf8");
    paths.push(target.absolutePath);
  }
  return paths;
}

async function existingFiles(paths: string[]): Promise<boolean[]> {
  return Promise.all(
    paths.map((file) =>
      readFile(file, "utf8").then(
        () => true,
        () => false,
      ),
    ),
  );
}

describe("Quiz Short invalidation", () => {
  it("treats a layout pair change like a question count change: every director-downstream artifact is stale", () => {
    const base = buildQuizShortConfig({ layout_pair: { primary: "short_stack_list", secondary: "short_verdict_yes_no" } });
    const swappedPair = { ...base, layout_pair: { primary: "short_media_top_choices" as const, secondary: "short_versus_two" as const } };
    expect(hasQuizSourceSettingsChanged(swappedPair, base)).toBe(true);
    expect(hasQuizSourceSettingsChanged({ ...base, question_count: 3 }, base)).toBe(true);
    expect(hasQuizSourceSettingsChanged({ ...base, palette_id: "sunny" }, base)).toBe(false);
    expect(invalidateQuizArtifacts("director")).toEqual(DIRECTOR_DOWNSTREAM);
  });

  it("removes director, assets, voice, timeline and qa artifacts when the layout pair changes", async () => {
    const harness = await createQuizShortPipelineHarness();
    harnesses.push(harness);
    const paths = await seedArtifacts(harness);
    expect(await existingFiles(paths)).toEqual([true, true, true, true, true]);

    const updated = await harness.repository.updateQuizShortSettings(harness.channelId, harness.quizShortId, {
      layout_pair: { primary: "short_media_top_choices", secondary: "short_versus_two" },
    });
    expect(updated.quiz_config.layout_pair).toEqual({ primary: "short_media_top_choices", secondary: "short_versus_two" });
    expect(await existingFiles(paths)).toEqual([false, false, false, false, false]);
    expect(await harness.repository.readQuiz(harness.channelId, harness.ref)).not.toBeNull();
  });

  it("removes the same artifacts when the question count changes", async () => {
    const harness = await createQuizShortPipelineHarness();
    harnesses.push(harness);
    const paths = await seedArtifacts(harness);

    await harness.repository.updateQuizShortSettings(harness.channelId, harness.quizShortId, { question_count: 3 });
    expect(await existingFiles(paths)).toEqual([false, false, false, false, false]);
    expect(await harness.repository.readQuiz(harness.channelId, harness.ref)).not.toBeNull();
  });
});
