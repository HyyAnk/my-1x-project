import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { QuizShortSchema, QuizV2Schema, quizShortProductRef, type QuizShort } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { createQuizShortId } from "../src/repository/quizShorts.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})),
  );
});

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-short-workspace-route-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return root;
}

function buildQuizShort(channelId: string): QuizShort {
  const now = new Date().toISOString();
  return QuizShortSchema.parse({
    quiz_short_id: createQuizShortId(),
    channel_id: channelId,
    slug: "ocean-giants",
    topic: { title: "Ocean giants", premise: "Big sea animals", hook: "Who is the biggest?" },
    stage: "SCENE_READY",
    quiz_config: { question_count: 5, age_band: "7-9" },
    created_at: now,
    updated_at: now,
  });
}

const sampleQuiz = (quizShortId: string) =>
  QuizV2Schema.parse({
    schema_version: 2,
    episode_id: quizShortId,
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

async function seedQuizShort(app: Awaited<ReturnType<typeof buildApp>>) {
  const channel = await app.repository.createChannel({
    name: "Quiz Short workspace",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  const quizShort = await app.repository.saveQuizShort(channel.channel_id, buildQuizShort(channel.channel_id));
  return { channel, quizShort };
}

describe("Quiz Short workspace routes", () => {
  it("aggregates the record, artifacts and stage states", async () => {
    const app = await buildApp(await createTestRoot(), { llmClient: createStubQuizLlmClient() });
    try {
      const { channel, quizShort } = await seedQuizShort(app);
      const ref = quizShortProductRef(channel.channel_id, quizShort.quiz_short_id);
      await app.repository.writeQuiz(channel.channel_id, ref, sampleQuiz(quizShort.quiz_short_id));

      const response = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channel.channel_id}/quiz-shorts/${quizShort.quiz_short_id}/workspace`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        quiz_short: QuizShort;
        quiz: { questions: unknown[] } | null;
        director_plan: unknown;
        stages: Record<string, string>;
      };
      expect(body.quiz_short.quiz_short_id).toBe(quizShort.quiz_short_id);
      expect(body.quiz?.questions).toHaveLength(1);
      expect(body.director_plan).toBeNull();
      expect(body.stages).toEqual({
        questions: "ready",
        director: "not_started",
        timeline: "not_started",
        qa: "not_started",
        render: "not_started",
      });
    } finally {
      await app.close();
    }
  });

  it("streams the rendered video and marks a stale render", async () => {
    const app = await buildApp(await createTestRoot(), { llmClient: createStubQuizLlmClient() });
    try {
      const { channel, quizShort } = await seedQuizShort(app);
      const ref = quizShortProductRef(channel.channel_id, quizShort.quiz_short_id);
      await app.repository.writeQuiz(channel.channel_id, ref, sampleQuiz(quizShort.quiz_short_id));
      const assetPath = await app.repository.writeVideoArtifact(channel.channel_id, ref, new Uint8Array([1, 2, 3, 4]));
      const manifestPath = await app.repository.writeRenderManifest(channel.channel_id, ref, JSON.stringify({ frames: 4 }));
      await app.repository.saveVideoMetadata(channel.channel_id, ref, assetPath, 48, manifestPath);
      await app.repository.updateQuizShortSettings(channel.channel_id, quizShort.quiz_short_id, { palette_id: "sunny" });

      const base = `/api/channels/${channel.channel_id}/quiz-shorts/${quizShort.quiz_short_id}`;
      const video = await app.server.inject({ method: "GET", url: `${base}/video`, headers: { range: "bytes=0-1" } });
      expect(video.statusCode).toBe(206);
      expect(video.headers["content-type"]).toBe("video/mp4");
      expect(video.headers["content-range"]).toBe("bytes 0-1/4");

      const manifest = await app.server.inject({ method: "GET", url: `${base}/render-manifest` });
      expect(manifest.statusCode).toBe(200);
      expect(manifest.json()).toEqual({ manifest: { frames: 4 } });

      const workspace = await app.server.inject({ method: "GET", url: `${base}/workspace` });
      expect((workspace.json() as { stages: Record<string, string> }).stages.render).toBe("stale");
    } finally {
      await app.close();
    }
  });

  it("returns 404 for a missing video and an unknown Quiz Short", async () => {
    const app = await buildApp(await createTestRoot(), { llmClient: createStubQuizLlmClient() });
    try {
      const { channel, quizShort } = await seedQuizShort(app);
      const base = `/api/channels/${channel.channel_id}/quiz-shorts`;
      expect((await app.server.inject({ method: "GET", url: `${base}/${quizShort.quiz_short_id}/video` })).statusCode).toBe(404);
      expect((await app.server.inject({ method: "GET", url: `${base}/${quizShort.quiz_short_id}/render-manifest` })).statusCode).toBe(404);
      expect((await app.server.inject({ method: "GET", url: `${base}/qshort_missing/workspace` })).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
