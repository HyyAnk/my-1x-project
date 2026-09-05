import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EpisodeSchema, QuizStageTimingsSchema, QuizV2Schema, type QuizV2 } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

const roots: string[] = [];

async function fixture(): Promise<{ repository: RepositoryService; channelId: string; episodeId: string; quiz: QuizV2 }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-artifact-concurrency-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repository = new RepositoryService(root);
  await repository.ensureBootstrap();
  const channel = await repository.createChannel({
    name: "Concurrency Channel",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  const topics = Array.from({ length: 5 }, (_, index) => ({
    topic_id: `topic_${index}`,
    channel_id: channel.channel_id,
    title: `Concurrency Topic ${index}`,
    premise: "Premise",
    why_it_fits: "Fits",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
  }));
  await repository.saveTopicRun(channel.channel_id, topics);
  const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
  const quiz = buildQuiz(episode.episode_id);
  await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);
  return { repository, channelId: channel.channel_id, episodeId: episode.episode_id, quiz };
}

function buildQuiz(episodeId: string): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: "7-9",
    language: "English",
    questions: [
      {
        id: "q-1",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "Which planet has the most prominent rings?",
        choices: [
          { id: "c-a", text: "Jupiter" },
          { id: "c-b", text: "Saturn" },
          { id: "c-c", text: "Uranus" },
        ],
        correct_choice_id: "c-b",
        explanation: "Saturn has wide, bright rings.",
        fun_fact: "Saturn rings are mostly made of ice chunks.",
        source_ids: ["S1"],
        visual_opportunity: "Saturn with visible rings",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  });
}

function buildStageTimings(totalSeconds: number) {
  return QuizStageTimingsSchema.parse({
    schema_version: 1,
    stages: {
      quiz: { duration_seconds: totalSeconds, started_at: "2026-09-05T00:00:00.000Z", completed_at: "2026-09-05T00:00:01.000Z" },
    },
    parallel_groups: {},
    total_duration_seconds: totalSeconds,
  });
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("per-episode quiz artifact mutation serialization", () => {
  it("keeps episode.json consistent under concurrent render invalidations", async () => {
    const { repository, channelId, episodeId } = await fixture();

    await Promise.all(
      Array.from({ length: 8 }, () => repository.invalidateQuizArtifacts(channelId, episodeId, ["render", "qa"])),
    );

    const episode = EpisodeSchema.parse(await repository.getEpisode(channelId, episodeId));
    expect(episode.video_asset_path).toBeNull();
    expect(episode.video_generated_at).toBeNull();
    expect(episode.video_duration_seconds).toBeNull();
    expect(episode.render_manifest_path).toBeNull();
  });

  it("keeps artifacts schema-valid when parallel stage invalidations interleave with writes", async () => {
    const { repository, channelId, episodeId, quiz } = await fixture();
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });

    // Mirrors the runner's Promise.all branch: resolveAssets invalidates asset_resolution
    // downstream while generateVoice invalidates voice downstream and both write artifacts.
    await Promise.all([
      repository.invalidateQuizArtifacts(channelId, episodeId, ["asset_resolution", "timeline", "render", "qa"]),
      repository.invalidateQuizArtifacts(channelId, episodeId, ["timeline", "render", "qa"]),
      repository.writeVoicePlan(channelId, episodeId, voicePlan),
      repository.writeQuizTimeline(channelId, episodeId, timeline),
      repository.writeQuizStageTimings(channelId, episodeId, buildStageTimings(12)),
    ]);

    const storedVoicePlan = await repository.readVoicePlan(channelId, episodeId);
    expect(storedVoicePlan).not.toBeNull();
    const storedTimings = await repository.readQuizStageTimings(channelId, episodeId);
    expect(storedTimings?.total_duration_seconds).toBe(12);
    // Timeline may legitimately be null (removed by a queued invalidation that ran last)
    // but it must never be malformed — readQuizTimeline throws on schema violation.
    const storedTimeline = await repository.readQuizTimeline(channelId, episodeId);
    expect(storedTimeline === null || storedTimeline.schema_version === timeline.schema_version).toBe(true);
  });

  it("persists exactly one winning stage-timings record under concurrent writers", async () => {
    const { repository, channelId, episodeId } = await fixture();
    const variants = Array.from({ length: 12 }, (_, index) => buildStageTimings(index + 1));

    await Promise.all(variants.map((timings) => repository.writeQuizStageTimings(channelId, episodeId, timings)));

    const stored = await repository.readQuizStageTimings(channelId, episodeId);
    expect(stored).not.toBeNull();
    expect(variants.map((variant) => variant.total_duration_seconds)).toContain(stored?.total_duration_seconds);
  });
});
