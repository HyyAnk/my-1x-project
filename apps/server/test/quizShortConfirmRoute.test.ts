import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hashBankQuestionSource, type BankQuestion, type ConfirmQuizShortTopicResponse } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";
import { makeBankQuestion } from "./fixtures/topicConfirmationFixtures.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})),
  );
});

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-short-confirm-route-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return root;
}

function binding(question: BankQuestion) {
  return {
    source_question_id: question.id,
    source_hash_version: 1 as const,
    source_content_hash: hashBankQuestionSource(question),
    projection_provenance: {
      source_variant: "native" as const,
      resolved_language: "en" as const,
      translation_key: null,
      translation_provenance: "native" as const,
    },
  };
}

async function seedQuizShortTopic(app: Awaited<ReturnType<typeof buildApp>>, topicId: string) {
  const channel = await app.repository.createChannel({
    name: "Quiz Short confirm route",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  const questions = [1, 2, 3, 4, 5].map((n) => makeBankQuestion(`qs_route_${n}`));
  for (const question of questions) await app.repository.saveQuestionBankQuestion(question);
  await app.repository.saveTopicRun(channel.channel_id, [
    {
      topic_id: topicId,
      channel_id: channel.channel_id,
      content_kind: "quiz_short",
      origin: "discovery",
      title: "Quiz Short route topic",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      question_count: 5,
      aspect_ratio: "9:16",
      age_band: "7-9",
      source_bindings: questions.map(binding),
    },
  ]);
  return { channel, questions };
}

describe("Quiz Short confirm route", () => {
  it("creates a Quiz Short from the quiz_short branch and returns the product payload", async () => {
    const app = await buildApp(await createTestRoot(), { llmClient: createStubQuizLlmClient() });
    try {
      const { channel, questions } = await seedQuizShortTopic(app, "qs-route-topic");
      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/qs-route-topic/confirm`,
        payload: { question_count: 5, render_aspect_ratio: "9:16", auto_start_pipeline: false },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json() as ConfirmQuizShortTopicResponse;
      expect(body.content_kind).toBe("quiz_short");
      expect(body.quiz_short.quiz_config.question_count).toBe(5);
      expect(body.quiz_short.quiz_config.render_aspect_ratio).toBe("9:16");
      expect(body.task).toBeNull();
      expect(body.quiz?.questions).toHaveLength(5);
      expect(body.director_plan?.beats).toHaveLength(5);
      expect(body.question_ids).toEqual(questions.map((question) => question.id));
      expect(body.cooldown_recorded).toBe(true);

      const stored = await app.repository.listQuizShorts(channel.channel_id);
      expect(stored.map((item) => item.quiz_short_id)).toEqual([body.quiz_short.quiz_short_id]);
      expect(await app.repository.listEpisodes(channel.channel_id)).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it("rejects a landscape aspect ratio and an out-of-range question count for a Quiz Short topic", async () => {
    const app = await buildApp(await createTestRoot(), { llmClient: createStubQuizLlmClient() });
    try {
      const { channel } = await seedQuizShortTopic(app, "qs-route-invalid");
      const landscape = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/qs-route-invalid/confirm`,
        payload: { render_aspect_ratio: "16:9", auto_start_pipeline: false },
      });
      expect(landscape.statusCode).toBe(400);

      const tooMany = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/qs-route-invalid/confirm`,
        payload: { question_count: 8, auto_start_pipeline: false },
      });
      expect(tooMany.statusCode).toBe(400);
      expect(await app.repository.listQuizShorts(channel.channel_id)).toHaveLength(0);
    } finally {
      await app.close();
    }
  });
});
