import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { vi } from "vitest";
import { QuizShortSchema, quizShortProductRef, type Channel, type QuizProductRef, type QuizShort, type QuizV2 } from "@studio/shared";
import type { PortraitImageClient } from "../../src/providers/imageGeneration/imageGeneration.types.js";
import { RepositoryService } from "../../src/repository.js";
import { createQuizShortId } from "../../src/repository/quizShorts.js";
import { computeConfirmationOptionsFingerprint, saveTopicConfirmationReceipt } from "../../src/repository/topicConfirmationReceipts.js";
import { QUIZ_SHORT_TEXT_PAIR } from "./quizShortPipelineHarness.js";
import { buildTextQuizShortQuiz } from "./quizShortFixtures.js";

export type QuizShortMetadataFixture = {
  root: string;
  repository: RepositoryService;
  channel: Channel;
  channelId: string;
  quizShort: QuizShort;
  quizShortId: string;
  quiz: QuizV2;
  ref: QuizProductRef;
  cleanup: () => Promise<void>;
};

export async function portraitPng(color: string, width = 720, height = 1280): Promise<Uint8Array> {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer();
}

/** A portrait client that records every request and returns the same bytes each time. */
export function fakeCoverClient(bytes: Uint8Array): PortraitImageClient & { generate: ReturnType<typeof vi.fn> } {
  return {
    supportsReferenceImage: true,
    generate: vi.fn(async () => ({ bytes, provider: "test", model: "fixture-model" })),
  };
}

export function failingCoverClient(message = "Provider unavailable"): PortraitImageClient {
  return { supportsReferenceImage: true, generate: vi.fn(async () => Promise.reject(new Error(message))) };
}

/** The English confirmation receipt the language resolver reads, as topic confirmation would have written it. */
async function writeConfirmationReceipt(repository: RepositoryService, quizShort: QuizShort): Promise<void> {
  const options = { target_language: "en" };
  await saveTopicConfirmationReceipt(repository, quizShort.channel_id, {
    receipt_id: `receipt-${quizShort.quiz_short_id}`,
    channel_id: quizShort.channel_id,
    topic_id: `topic-${quizShort.quiz_short_id}`,
    content_kind: "quiz_short",
    product_id: quizShort.quiz_short_id,
    product_slug: quizShort.slug,
    status: "completed",
    confirmed_at: new Date().toISOString(),
    request_id: `request-${quizShort.quiz_short_id}`,
    options_fingerprint: computeConfirmationOptionsFingerprint(options),
    options,
    source_question_ids: [],
    source_content_hashes: [],
  });
}

/** A channel with one five-question Quiz Short whose questions and confirmation receipt are already written. */
export async function createQuizShortMetadataFixture(options?: {
  language?: string;
  ageBand?: "7-9" | "family";
}): Promise<QuizShortMetadataFixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-short-metadata-"));
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Shorts Metadata Lab",
    description: "",
    target_audience: "",
    language: options?.language ?? "English",
    market: "Global",
    dna_mode: "example",
  });
  const now = new Date().toISOString();
  const quizShort = await repository.saveQuizShort(
    channel.channel_id,
    QuizShortSchema.parse({
      quiz_short_id: createQuizShortId(),
      channel_id: channel.channel_id,
      slug: "planet-sprint",
      topic: { title: "Planet Sprint", premise: "Five quick planet facts", hook: "Which planet wins the race?" },
      stage: "SCENE_READY",
      quiz_config: { question_count: 5, age_band: options?.ageBand ?? "7-9", layout_pair: QUIZ_SHORT_TEXT_PAIR },
      created_at: now,
      updated_at: now,
    }),
  );
  const ref = quizShortProductRef(channel.channel_id, quizShort.quiz_short_id);
  const quiz = { ...buildTextQuizShortQuiz(), episode_id: quizShort.quiz_short_id };
  await repository.writeQuiz(channel.channel_id, ref, quiz);
  await writeConfirmationReceipt(repository, quizShort);
  return {
    root,
    repository,
    channel,
    channelId: channel.channel_id,
    quizShort,
    quizShortId: quizShort.quiz_short_id,
    quiz,
    ref,
    cleanup: () => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }),
  };
}
