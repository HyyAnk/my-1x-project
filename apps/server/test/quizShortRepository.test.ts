import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { QuizShortSchema, QuizV2Schema, quizShortProductRef, type QuizShort } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { createQuizShortId } from "../src/repository/quizShorts.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<{ repository: RepositoryService; channelId: string; channelSlug: string; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-short-repository-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Shorts Lab",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  return { repository, channelId: channel.channel_id, channelSlug: channel.slug, root };
}

function buildQuizShort(channelId: string, slug = "ocean-giants"): QuizShort {
  const now = new Date().toISOString();
  return QuizShortSchema.parse({
    quiz_short_id: createQuizShortId(),
    channel_id: channelId,
    slug,
    topic: { title: "Ocean giants", premise: "Big sea animals", hook: "Who is the biggest?" },
    stage: "SCENE_READY",
    quiz_config: { question_count: 5, age_band: "7-9" },
    created_at: now,
    updated_at: now,
  });
}

const sampleQuiz = (episodeId: string) =>
  QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "question-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which animal is the largest?",
        choices: [
          { id: "choice-a", text: "Blue whale" },
          { id: "choice-b", text: "Shark" },
          { id: "choice-c", text: "Dolphin" },
        ],
        correct_choice_id: "choice-a",
        explanation: "Blue whales are the largest animals.",
        fun_fact: "Their hearts are as big as a car.",
        source_ids: ["S01"],
        visual_opportunity: "Whale",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });

describe("Quiz Short repository", () => {
  it("creates ids with the qshort_ prefix", () => {
    expect(createQuizShortId()).toMatch(/^qshort_[a-f0-9]{16}$/);
  });

  it("saves, lists, gets and deletes records under channels/<slug>/quiz_shorts/<slug>/", async () => {
    const { repository, channelId, channelSlug, root } = await fixture();
    const saved = await repository.saveQuizShort(channelId, buildQuizShort(channelId));
    const recordPath = path.join(root, "channels", channelSlug, "quiz_shorts", "ocean-giants", "quiz_short.json");
    expect(JSON.parse(await readFile(recordPath, "utf8")).quiz_short_id).toBe(saved.quiz_short_id);

    expect((await repository.listQuizShorts(channelId)).map((item) => item.quiz_short_id)).toEqual([saved.quiz_short_id]);
    expect((await repository.getQuizShort(channelId, saved.quiz_short_id)).slug).toBe("ocean-giants");

    repository.quizShortSlugCache.clear();
    expect((await repository.getQuizShort(channelId, saved.quiz_short_id)).topic.title).toBe("Ocean giants");

    await repository.deleteQuizShort(channelId, saved.quiz_short_id);
    await expect(repository.getQuizShort(channelId, saved.quiz_short_id)).rejects.toMatchObject({ code: "QUIZ_SHORT_NOT_FOUND" });
    await expect(readFile(recordPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("stores quiz artifacts in the quiz short directory through refs and plain ids", async () => {
    const { repository, channelId, channelSlug } = await fixture();
    const saved = await repository.saveQuizShort(channelId, buildQuizShort(channelId));
    const ref = quizShortProductRef(channelId, saved.quiz_short_id);
    const artifactPath = await repository.writeQuiz(channelId, ref, sampleQuiz(saved.quiz_short_id));
    expect(artifactPath).toBe(`channels/${channelSlug}/quiz_shorts/ocean-giants/quiz/quiz-v2.json`);
    expect((await repository.readQuiz(channelId, saved.quiz_short_id))?.questions).toHaveLength(1);
  });

  it("validates settings input and marks the render stale on visual changes", async () => {
    const { repository, channelId } = await fixture();
    const saved = await repository.saveQuizShort(channelId, buildQuizShort(channelId));
    const ref = quizShortProductRef(channelId, saved.quiz_short_id);
    await repository.writeQuiz(channelId, ref, sampleQuiz(saved.quiz_short_id));
    await repository.saveVideoMetadata(channelId, ref, "channels/x/quiz_shorts/ocean-giants/assets/quiz-video.mp4", 48, "manifest.json");
    expect((await repository.getQuizShort(channelId, saved.quiz_short_id)).render_stale).toBe(false);

    const updated = await repository.updateQuizShortSettings(channelId, saved.quiz_short_id, { palette_id: "sunny" });
    expect(updated.quiz_config.palette_id).toBe("sunny");
    expect(updated.render_stale).toBe(true);
    expect(updated.video_asset_path).toBe("channels/x/quiz_shorts/ocean-giants/assets/quiz-video.mp4");

    // The layout pair drives the Director plan, so changing it rebuilds every downstream artifact including the render.
    const relaidOut = await repository.updateQuizShortSettings(channelId, saved.quiz_short_id, {
      layout_pair: { primary: "short_stack_list", secondary: "short_verdict_yes_no" },
    });
    expect(relaidOut.quiz_config.layout_pair).toEqual({ primary: "short_stack_list", secondary: "short_verdict_yes_no" });
    expect(relaidOut.video_asset_path).toBeNull();
    expect(relaidOut.render_stale).toBe(false);

    await expect(repository.updateQuizShortSettings(channelId, saved.quiz_short_id, { question_count: 12 })).rejects.toThrow();
  });

  it("rebuilds downstream artifacts but keeps the quiz when the question count changes", async () => {
    const { repository, channelId } = await fixture();
    const saved = await repository.saveQuizShort(channelId, buildQuizShort(channelId));
    const ref = quizShortProductRef(channelId, saved.quiz_short_id);
    await repository.writeQuiz(channelId, ref, sampleQuiz(saved.quiz_short_id));
    const voicePlanTarget = await repository.quizArtifactTarget(channelId, ref, "voice-plan.json");
    await writeFile(voicePlanTarget.absolutePath, "{}", "utf8");

    const updated = await repository.updateQuizShortSettings(channelId, saved.quiz_short_id, { question_count: 3 });
    expect(updated.quiz_config.question_count).toBe(3);
    expect(await repository.readQuiz(channelId, ref)).not.toBeNull();
    await expect(readFile(voicePlanTarget.absolutePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
