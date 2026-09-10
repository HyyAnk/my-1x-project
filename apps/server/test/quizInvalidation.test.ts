import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { QuizV2Schema, type QuizV2 } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { RepositoryService } from "../src/repository.js";
import { invalidateQuizArtifacts } from "../src/quiz/pipeline/invalidation.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function createMockQuiz(episodeId: string): QuizV2 {
  return QuizV2Schema.parse({
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
        question: "Which animal has stripes?",
        choices: [
          { id: "choice-a", text: "Tiger" },
          { id: "choice-b", text: "Dolphin" },
          { id: "choice-c", text: "Elephant" },
        ],
        correct_choice_id: "choice-a",
        explanation: "A tiger has stripes.",
        fun_fact: "",
        source_ids: ["C01"],
        visual_opportunity: "",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

async function createRepositoryFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-invalidation-test-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Quiz Invalidation Channel",
    description: "Channel for testing invalidation",
    target_audience: "General",
    language: "English",
    market: "Global",
    dna_mode: "example",
  });
  const topics = [
    {
      topic_id: "topic-1",
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: "Topic 1",
      premise: "Premise 1",
      why_it_fits: "Fits well",
      hook: "Great hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    },
  ];
  await repository.saveTopicRun(channel.channel_id, topics);
  const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
  return { repository, channelId: channel.channel_id, episodeId: episode.episode_id };
}

describe("Quiz V2 invalidation graph", () => {
  it("invalidates only downstream artifacts", () => {
    expect(invalidateQuizArtifacts("quiz")).toEqual(["director", "assets", "asset_resolution", "voice", "timeline", "render", "qa"]);
    expect(invalidateQuizArtifacts("assets")).toEqual(["asset_resolution", "timeline", "render", "qa"]);
    expect(invalidateQuizArtifacts("timeline")).toEqual(["render", "qa"]);
    expect(invalidateQuizArtifacts("qa")).toEqual([]);
  });
});

describe("Non-destructive style invalidation engine", () => {
  it("preserves video_asset_path and video file on disk when style is invalidated", async () => {
    const { repository, channelId, episodeId } = await createRepositoryFixture();
    await repository.writeQuiz(channelId, episodeId, createMockQuiz(episodeId));
    const videoPath = await repository.writeVideoArtifact(channelId, episodeId, new Uint8Array([10, 20, 30]));
    const manifestPath = await repository.writeRenderManifest(channelId, episodeId, '{"quiz_engine_version":2}');
    await repository.saveVideoMetadata(channelId, episodeId, videoPath, 15, manifestPath);

    const initialEpisode = await repository.getEpisode(channelId, episodeId);
    expect(initialEpisode.stage).toBe("VIDEO_READY");
    expect(initialEpisode.video_asset_path).toBe(videoPath);
    expect(initialEpisode.render_stale).toBe(false);

    await repository.invalidateQuizArtifacts(channelId, episodeId, ["style"]);

    const staleEpisode = await repository.getEpisode(channelId, episodeId);
    expect(staleEpisode.stage).toBe("VIDEO_READY");
    expect(staleEpisode.video_asset_path).toBe(videoPath);
    expect(staleEpisode.render_stale).toBe(true);

    const videoFile = await repository.getEpisodeVideoFile(channelId, episodeId);
    expect(videoFile.size).toBe(3);

    await repository.saveVideoMetadata(channelId, episodeId, videoPath, 15, manifestPath);
    const refreshedEpisode = await repository.getEpisode(channelId, episodeId);
    expect(refreshedEpisode.render_stale).toBe(false);
  });

  it("destroys video artifact when render is explicitly invalidated", async () => {
    const { repository, channelId, episodeId } = await createRepositoryFixture();
    await repository.writeQuiz(channelId, episodeId, createMockQuiz(episodeId));
    const videoPath = await repository.writeVideoArtifact(channelId, episodeId, new Uint8Array([1, 2, 3]));
    const manifestPath = await repository.writeRenderManifest(channelId, episodeId, '{"quiz_engine_version":2}');
    await repository.saveVideoMetadata(channelId, episodeId, videoPath, 10, manifestPath);

    await repository.invalidateQuizArtifacts(channelId, episodeId, ["render"]);

    const clearedEpisode = await repository.getEpisode(channelId, episodeId);
    expect(clearedEpisode.video_asset_path).toBeNull();
    expect(clearedEpisode.render_stale).toBe(false);
    expect(clearedEpisode.stage).toBe("SCENE_READY");
    await expect(repository.getEpisodeVideoFile(channelId, episodeId)).rejects.toThrow("not found");
  });

  it("reports render status as stale in quiz-v2 route when video is marked render_stale", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-invalidation-route-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
    const app = await buildApp(root);
    try {
      const channel = await app.repository.createChannel({
        name: "Quiz Invalidation Route Channel",
        description: "",
        target_audience: "General",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });
      const topics = [
        {
          topic_id: "topic-1",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          title: "Topic 1",
          premise: "Premise 1",
          why_it_fits: "Fits well",
          hook: "Great hook",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
        },
      ];
      await app.repository.saveTopicRun(channel.channel_id, topics);
      const episode = await app.repository.confirmTopic(channel.channel_id, topics[0].topic_id);
      await app.repository.writeQuiz(channel.channel_id, episode.episode_id, createMockQuiz(episode.episode_id));
      const videoPath = await app.repository.writeVideoArtifact(channel.channel_id, episode.episode_id, new Uint8Array([1, 2, 3]));
      const manifestPath = await app.repository.writeRenderManifest(channel.channel_id, episode.episode_id, '{"quiz_engine_version":2}');
      await app.repository.saveVideoMetadata(channel.channel_id, episode.episode_id, videoPath, 10, manifestPath);

      const initialRes = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2`,
      });
      expect(initialRes.statusCode).toBe(200);
      const initialJson = initialRes.json<{ stages: { render: string }; render_stale: boolean }>();
      expect(initialJson.stages.render).toBe("ready");
      expect(initialJson.render_stale).toBe(false);

      await app.repository.invalidateQuizArtifacts(channel.channel_id, episode.episode_id, ["style"]);

      const staleRes = await app.server.inject({
        method: "GET",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2`,
      });
      expect(staleRes.statusCode).toBe(200);
      const staleJson = staleRes.json<{ stages: { render: string }; render_stale: boolean }>();
      expect(staleJson.stages.render).toBe("stale");
      expect(staleJson.render_stale).toBe(true);
    } finally {
      await app.close();
    }
  });
});
