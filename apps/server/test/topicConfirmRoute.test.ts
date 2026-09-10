import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BankQuestionSchema, hashBankQuestionSource, type BankQuestion } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})),
  );
});

function createBankQuestion(id: string): BankQuestion {
  return BankQuestionSchema.parse({
    id,
    archetype_id: "deep_trivia",
    domain_id: "nature_animals",
    subtopic_id: "predators",
    language: "en",
    question: `Test question ${id}?`,
    format: "multiple_choice",
    choices: [
      { id: "a", text: "Answer 1", is_correct: true },
      { id: "b", text: "Answer 2", is_correct: false },
      { id: "c", text: "Answer 3", is_correct: false },
    ],
    correct_choice_id: "a",
    explanation: "Explanation",
    status: "approved",
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

describe("topic confirmation", () => {
  it("rejects unsupported Episode target languages before provider work", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });
    try {
      const channel = await app.repository.createChannel({
        name: "Target language validation",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const questions = ["q-target-language-1", "q-target-language-2", "q-target-language-3"].map(createBankQuestion);
      for (const question of questions) await app.repository.saveQuestionBankQuestion(question);
      await app.repository.saveTopicRun(channel.channel_id, [
        {
          topic_id: "target-language-topic",
          channel_id: channel.channel_id,
          content_kind: "episode",
          origin: "discovery",
          title: "Target language topic",
          premise: "Premise",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
          question_count: 3,
          source_bindings: questions.map((question) => ({
            source_question_id: question.id,
            source_hash_version: 1 as const,
            source_content_hash: hashBankQuestionSource(question),
            projection_provenance: {
              source_variant: "native" as const,
              resolved_language: "en" as const,
              translation_key: null,
              translation_provenance: "native" as const,
            },
          })),
        },
      ]);

      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/target-language-topic/confirm`,
        payload: { target_language: "vi", question_count: 3, auto_start_pipeline: false },
      });

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain("UNSUPPORTED_TARGET_LANGUAGE");
      expect(await app.repository.listEpisodes(channel.channel_id)).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it("uses the selected question count for the new episode and selected topic record", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });
    try {
      const channel = await app.repository.createChannel({
        name: "Question count",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });

      const sampleQuestions = Array.from({ length: 50 }, (_, i) => createBankQuestion(`q-count-${i}`));
      for (const q of sampleQuestions) {
        await app.repository.saveQuestionBankQuestion(q);
      }
      const sourceBindings = sampleQuestions.map((q) => ({
        source_question_id: q.id,
        source_hash_version: 1 as const,
        source_content_hash: hashBankQuestionSource(q),
        projection_provenance: {
          source_variant: "native" as const,
          resolved_language: "en" as const,
          translation_key: null,
          translation_provenance: "native" as const,
        },
      }));

      const topics = Array.from({ length: 5 }, (_, index) => ({
        topic_id: `question-count-${index}`,
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        origin: "discovery" as const,
        title: `Question count topic ${index}`,
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 8,
        source_bindings: sourceBindings,
      }));
      await app.repository.saveTopicRun(channel.channel_id, topics);

      const response = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topics[0].topic_id}/confirm`,
        payload: { topic_id: "ignored-by-route", question_count: 12, auto_start_pipeline: false },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<{
        content_kind: string;
        episode: { quiz_config: { question_count: number }; target_duration_minutes: number; target_word_count: number };
      }>();
      expect(body.content_kind).toBe("episode");
      expect(body.episode).toMatchObject({
        quiz_config: { question_count: 12 },
        target_duration_minutes: 7,
        target_word_count: 918,
      });
      expect((await app.repository.listTopics(channel.channel_id)).find((topic) => topic.topic_id === topics[0].topic_id)).toMatchObject({
        selected: true,
        question_count: 12,
      });
    } finally {
      for (const t of app.tasks?.list() ?? []) {
        await app.tasks.cancel(t.task_id).catch(() => {});
      }
      await app.close();
    }
  }, 30000);

  it("accepts 50 questions and rejects values above the product limit", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });
    try {
      const channel = await app.repository.createChannel({
        name: "Question limit",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const sampleQuestions = Array.from({ length: 50 }, (_, i) => createBankQuestion(`q-limit-${i}`));
      for (const q of sampleQuestions) {
        await app.repository.saveQuestionBankQuestion(q);
      }
      const sourceBindings = sampleQuestions.map((q) => ({
        source_question_id: q.id,
        source_hash_version: 1 as const,
        source_content_hash: hashBankQuestionSource(q),
        projection_provenance: {
          source_variant: "native" as const,
          resolved_language: "en" as const,
          translation_key: null,
          translation_provenance: "native" as const,
        },
      }));

      const topics = Array.from({ length: 5 }, (_, index) => ({
        topic_id: `question-limit-${index}`,
        channel_id: channel.channel_id,
        content_kind: "episode" as const,
        origin: "discovery" as const,
        title: `Question limit topic ${index}`,
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
        question_count: 8,
        source_bindings: sourceBindings,
      }));
      await app.repository.saveTopicRun(channel.channel_id, topics);

      const accepted = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topics[0].topic_id}/confirm`,
        payload: { question_count: 50, auto_start_pipeline: false },
      });
      expect(accepted.statusCode).toBe(201);
      expect(accepted.json().episode).toMatchObject({ quiz_config: { question_count: 50 }, target_duration_minutes: 28 });

      const rejected = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/${topics[1].topic_id}/confirm`,
        payload: { question_count: 51 },
      });
      expect(rejected.statusCode).toBe(400);
    } finally {
      for (const t of app.tasks?.list() ?? []) {
        await app.tasks.cancel(t.task_id).catch(() => {});
      }
      await app.close();
    }
  }, 30000);
});

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-topic-confirm-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return root;
}
