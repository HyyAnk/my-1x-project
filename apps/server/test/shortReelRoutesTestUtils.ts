import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, expect } from "vitest";
import {
  BankQuestionSchema,
  hashBankQuestionSource,
  type BankQuestion,
  type Channel,
  type ConfirmShortReelTopicResponse,
  type EpisodeTopicCandidate,
  type ShortReelRecord,
  type ShortReelTopicCandidate,
} from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";
import type { TaskManager } from "../src/tasks/manager.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})),
  );
});

export async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "short-reel-routes-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return root;
}

export async function createTestImageBuffer(width: number, height: number, color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

export function createSampleBankQuestion(id: string, archetypeId: "versus_faceoff" | "deep_trivia"): BankQuestion {
  const choices =
    archetypeId === "deep_trivia"
      ? [
          { id: "a", text: "Jaguar", is_correct: true },
          { id: "b", text: "Lion", is_correct: false },
          { id: "c", text: "Tiger", is_correct: false },
        ]
      : [
          { id: "a", text: "Jaguar", is_correct: true },
          { id: "b", text: "Lion", is_correct: false },
        ];

  return BankQuestionSchema.parse({
    id,
    archetype_id: archetypeId,
    domain_id: "nature_animals",
    subtopic_id: "predators",
    language: "en",
    question: "Which predator has a stronger bite: Jaguar or Lion?",
    format: "multiple_choice",
    choices,
    correct_choice_id: "a",
    explanation: "Jaguars possess an exceptionally powerful bite force relative to their size.",
    status: "approved",
    age_band: "family",
    difficulty: 2,
    thinking_seconds: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function buildTestApp(root: string): Promise<StudioApp> {
  return buildApp(root, { llmClient: createStubQuizLlmClient() });
}

export interface ReelTopicSeedInput {
  channelId: string;
  topicId: string;
  title?: string;
  archetype?: "versus_faceoff" | "deep_trivia";
  questionId?: string;
}

export function buildShortReelTopicCandidate({
  channelId,
  topicId,
  title,
  archetype = "versus_faceoff",
  questionId = "bank-test-q-1",
}: ReelTopicSeedInput): ShortReelTopicCandidate {
  const sampleBankQ = createSampleBankQuestion(questionId, archetype);
  return {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "short_reel",
    origin: "discovery",
    title: title ?? "Route Test Reel",
    premise: "Premise",
    why_it_fits: "Fits",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
    question_count: 1,
    aspect_ratio: "9:16",
    archetype,
    source_bindings: [
      {
        source_question_id: questionId,
        source_hash_version: 1,
        source_content_hash: hashBankQuestionSource(sampleBankQ),
        projection_provenance: {
          source_variant: "native",
          resolved_language: "en",
          translation_key: null,
          translation_provenance: "native",
        },
      },
    ],
  };
}

export function buildDummyEpisodeCandidate(channelId: string, topicId: string): EpisodeTopicCandidate {
  return {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "episode",
    origin: "discovery",
    title: "Ep 1",
    premise: "P",
    why_it_fits: "W",
    hook: "H",
    estimated_potential: "Medium",
    generated_at: new Date().toISOString(),
    selected: false,
    question_count: 5,
    quiz_format: "multiple_choice",
    age_band: "family",
    visual_style: "flat_vector",
    archetype: "deep_trivia",
  };
}

export interface SeedTopicRunInput {
  app: StudioApp;
  channelId: string;
  reelTopicId: string;
  reelArchetype?: "versus_faceoff" | "deep_trivia";
}

export async function seedTopicRunWithReel({
  app,
  channelId,
  reelTopicId,
  reelArchetype = "versus_faceoff",
}: SeedTopicRunInput): Promise<ShortReelTopicCandidate> {
  const qId = `bank-seed-${reelTopicId}`;
  await app.repository.saveQuestionBankQuestion(createSampleBankQuestion(qId, reelArchetype));
  const shortReelTopic = buildShortReelTopicCandidate({ channelId, topicId: reelTopicId, archetype: reelArchetype, questionId: qId });
  const dummyEp = buildDummyEpisodeCandidate(channelId, "ep-dummy-1");
  await app.repository.saveTopicRun(channelId, [
    dummyEp,
    { ...dummyEp, topic_id: "ep-dummy-2" },
    { ...dummyEp, topic_id: "ep-dummy-3" },
    shortReelTopic,
    { ...shortReelTopic, topic_id: "reel-dummy-2" },
  ]);
  return shortReelTopic;
}

export async function createTestChannel(app: StudioApp, name: string): Promise<Channel> {
  return app.repository.createChannel({
    name,
    description: "",
    target_audience: "General",
    language: "en",
    market: "US",
    dna_mode: "example",
  });
}

export async function createTestReel(app: StudioApp): Promise<{ channel: Channel; reel: ShortReelRecord }> {
  const channel = await createTestChannel(app, "Route Test Channel");

  await app.repository.saveQuestionBankQuestion(createSampleBankQuestion("bank-test-q-1", "versus_faceoff"));

  const shortReelTopic = buildShortReelTopicCandidate({
    channelId: channel.channel_id,
    topicId: "topic-reel-test-1",
    title: "Route Test Reel",
  });
  const dummyEp = buildDummyEpisodeCandidate(channel.channel_id, "ep-dummy-1");

  await app.repository.saveTopicRun(channel.channel_id, [
    dummyEp,
    { ...dummyEp, topic_id: "ep-dummy-2" },
    { ...dummyEp, topic_id: "ep-dummy-3" },
    shortReelTopic,
    { ...shortReelTopic, topic_id: "reel-dummy-2" },
  ]);

  const confirmResponse = await app.server.inject({
    method: "POST",
    url: `/api/channels/${channel.channel_id}/topics/${shortReelTopic.topic_id}/confirm`,
    payload: { question_count: 1 },
  });

  expect(confirmResponse.statusCode).toBe(201);
  return { channel, reel: confirmResponse.json<ConfirmShortReelTopicResponse>().short_reel };
}

export async function waitForTaskCompletion(tasks: TaskManager, taskId: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const check = () => {
      const t = tasks.get(taskId);
      if (t && ["COMPLETED", "FAILED", "CANCELLED"].includes(t.status)) {
        tasks.off("event", onEvent);
        resolve();
      }
    };
    const onEvent = (event: { type?: string; task?: { task_id?: string } }) => {
      if (event?.type === "task.updated" && event?.task?.task_id === taskId) {
        check();
      }
    };
    tasks.on("event", onEvent);
    check();
  });
}

export async function attachMascotWithStyle(app: StudioApp, channelId: string, mascotName: string): Promise<void> {
  const mascot = await app.repository.saveMascot({ name: mascotName });
  await app.repository.updateChannel(channelId, { mascot_id: mascot.id });
  const mascotBytes = await createTestImageBuffer(256, 256, { r: 10, g: 20, b: 30 });
  const styleBytes = await createTestImageBuffer(256, 256, { r: 40, g: 50, b: 60 });
  const mUrl = await app.repository.saveMascotAsset(mascot.id, "m.png", mascotBytes);
  const sUrl = await app.repository.saveMascotAsset(mascot.id, "s.png", styleBytes);
  await app.repository.saveMascot({
    ...mascot,
    master_image_url: mUrl,
    styles: [
      {
        id: "s1",
        name: "Style",
        keyword: "cinematic",
        anchor_image_url: sUrl,
        is_default: true,
        states: { thinking: [], celebrate: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    active_style_id: "s1",
  });
}

export async function installStubCoverProvider(app: StudioApp, root: string, fileName: string): Promise<void> {
  const coverPath = path.join(root, fileName);
  const coverBuf = await createTestImageBuffer(1080, 1920, { r: 100, g: 150, b: 200 });
  await writeFile(coverPath, coverBuf);
  app.tasks.createImageProvider = () => ({
    generateReference: () => Promise.resolve({ asset_path: coverPath }),
  });
}

export async function beginUnitAttempt(
  app: StudioApp,
  key: { channel_id: string; reel_id: string },
  unit: "script" | "cover",
  operationId: string,
): Promise<void> {
  const { beginReelUnitAttempt } = await import("../src/shortReel/unitLifecycle.js");
  await beginReelUnitAttempt(app.repository, key, unit, operationId);
}
