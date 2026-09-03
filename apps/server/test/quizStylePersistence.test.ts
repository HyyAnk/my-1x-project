import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  QuizAssessmentSchema,
  QuizAssetPlanSchema,
  QuizAssetResolutionSchema,
  QuizV2Schema,
  type Channel,
  type Episode,
} from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { pinEpisodeStyleRevision } from "../src/tasks/video/videoCompositionPreparer.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Quiz style persistence contracts", () => {
  it("P8B-BND-05 persists Channel Answer Card and Background through the HTTP and repository boundaries", async () => {
    const app = await createApp();
    try {
      const channel = await createChannel(app);
      const updated = await app.server.inject({
        method: "PATCH",
        url: `/api/channels/${channel.channel_id}`,
        payload: { default_answer_card_style: "glass_neon", default_background_style: "aurora_glow" },
      });
      expect(updated.statusCode).toBe(200);
      expect(updated.json()).toMatchObject({ default_answer_card_style: "glass_neon", default_background_style: "aurora_glow" });

      const listed = await app.server.inject({ method: "GET", url: "/api/channels" });
      const listedChannel = listed.json<{ channels: Channel[] }>().channels.find((item) => item.channel_id === channel.channel_id);
      expect(listedChannel).toMatchObject({ default_answer_card_style: "glass_neon", default_background_style: "aurora_glow" });
      expect(await app.repository.getChannel(channel.channel_id)).toMatchObject({
        default_answer_card_style: "glass_neon",
        default_background_style: "aurora_glow",
      });
    } finally {
      await app.close();
    }
  });

  it("P8B-BND-06 inherits Channel background and invalidates only render-dependent Episode artifacts", async () => {
    const app = await createApp();
    try {
      const channel = await createChannel(app);
      await app.server.inject({
        method: "PATCH",
        url: `/api/channels/${channel.channel_id}`,
        payload: { default_answer_card_style: "glass_neon", default_background_style: "aurora_glow" },
      });
      await app.repository.saveTopicRun(channel.channel_id, topics(channel.channel_id));
      const confirmed = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/topics/style-topic-0/confirm`,
        payload: {},
      });
      expect(confirmed.statusCode).toBe(201);
      const episode = confirmed.json<{ episode: Episode }>().episode;
      expect(episode.quiz_config).toMatchObject({ answer_card_style: "glass_neon", background_style: "aurora_glow" });
      const pinned = await pinEpisodeStyleRevision(app.repository, channel, episode);
      expect(pinned.quiz_config.style_catalog_revision).toMatch(/^catalog-/);
      expect((await app.repository.getEpisode(channel.channel_id, episode.episode_id)).quiz_config.style_catalog_revision).toBe(
        pinned.quiz_config.style_catalog_revision,
      );
      await seedQuizArtifacts(app, channel, episode);

      const updated = await app.server.inject({
        method: "PATCH",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}`,
        payload: { background_style: "candy_rays" },
      });
      expect(updated.statusCode).toBe(200);
      expect(updated.json<Episode>().quiz_config.background_style).toBe("candy_rays");
      expect((await app.repository.getEpisode(channel.channel_id, episode.episode_id)).quiz_config.background_style).toBe("candy_rays");

      await expectUpstreamArtifactsPreserved(app, channel.channel_id, episode.episode_id);
      expect(await app.repository.readQuizAssessment(channel.channel_id, episode.episode_id)).toBeNull();
      expect((await app.repository.getEpisode(channel.channel_id, episode.episode_id)).video_asset_path).toBeNull();
      await expect(app.repository.getEpisodeVideoFile(channel.channel_id, episode.episode_id)).rejects.toThrow("not found");
    } finally {
      await app.close();
    }
  });
});

async function createApp(): Promise<StudioApp> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-style-persistence-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8"),
  ]);
  return buildApp(root);
}

function createChannel(app: StudioApp) {
  return app.repository.createChannel({
    name: "Style persistence",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
}

function topics(channelId: string) {
  return Array.from({ length: 5 }, (_, index) => ({
    topic_id: `style-topic-${index}`,
    channel_id: channelId,
    title: `Style topic ${index}`,
    premise: "Premise",
    why_it_fits: "Fits",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: "2026-08-31T00:00:00.000Z",
    selected: false,
  }));
}

function quiz(episodeId: string) {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q1",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which animal has stripes?",
        choices: [
          { id: "c1", text: "Tiger" },
          { id: "c2", text: "Dolphin" },
          { id: "c3", text: "Elephant" },
        ],
        correct_choice_id: "c1",
        explanation: "A tiger has stripes.",
        source_ids: ["S01"],
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

async function seedQuizArtifacts(app: StudioApp, channel: Channel, episode: Episode): Promise<void> {
  const value = quiz(episode.episode_id);
  const director = createDefaultDirectorPlan(value);
  const voice = buildQuizVoicePlan(value);
  const timeline = compileQuizTimeline({ quiz: value, director, voicePlan: voice });
  await app.repository.writeQuiz(channel.channel_id, episode.episode_id, value);
  await app.repository.writeDirectorPlan(channel.channel_id, episode.episode_id, director);
  await app.repository.writeAssetPlan(
    channel.channel_id,
    episode.episode_id,
    QuizAssetPlanSchema.parse({ schema_version: 2, episode_id: episode.episode_id, assets: [], consistency_groups: [] }),
  );
  await app.repository.writeQuizAssetResolution(
    channel.channel_id,
    episode.episode_id,
    QuizAssetResolutionSchema.parse({ schema_version: 2, episode_id: episode.episode_id, template_id: "candy_arcade", assets: [] }),
  );
  await app.repository.writeVoicePlan(channel.channel_id, episode.episode_id, voice);
  await app.repository.writeQuizTimeline(channel.channel_id, episode.episode_id, timeline);
  await app.repository.writeQuizAssessment(
    channel.channel_id,
    episode.episode_id,
    QuizAssessmentSchema.parse({
      schema_version: 2,
      episode_id: episode.episode_id,
      assessed_at: "2026-08-31T00:00:00.000Z",
      score: 100,
      rating: "production_ready",
      categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
      issues: [],
    }),
  );
  const videoPath = await app.repository.writeVideoArtifact(channel.channel_id, episode.episode_id, new Uint8Array([1, 2, 3]));
  const manifestPath = await app.repository.writeRenderManifest(channel.channel_id, episode.episode_id, '{"quiz_engine_version":2}');
  await app.repository.saveVideoMetadata(channel.channel_id, episode.episode_id, videoPath, 30, manifestPath);
}

async function expectUpstreamArtifactsPreserved(app: StudioApp, channelId: string, episodeId: string): Promise<void> {
  expect(await app.repository.readQuiz(channelId, episodeId)).not.toBeNull();
  expect(await app.repository.readDirectorPlan(channelId, episodeId)).not.toBeNull();
  expect(await app.repository.readAssetPlan(channelId, episodeId)).not.toBeNull();
  expect(await app.repository.readQuizAssetResolution(channelId, episodeId)).not.toBeNull();
  expect(await app.repository.readVoicePlan(channelId, episodeId)).not.toBeNull();
  expect(await app.repository.readQuizTimeline(channelId, episodeId)).not.toBeNull();
}
