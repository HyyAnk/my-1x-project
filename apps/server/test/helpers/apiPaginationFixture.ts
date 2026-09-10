import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BankQuestionSchema,
  createInitialShortReel,
  createSourceSnapshot,
  EpisodeSchema,
  type Channel,
  type Episode,
  type ShortReelRecord,
} from "@studio/shared";
import { buildApp, type StudioApp } from "../../src/app.js";

export interface PaginationFixture {
  app: StudioApp;
  root: string;
  channel: Channel;
  cleanup: () => Promise<void>;
}

export async function createPaginationTestFixture(): Promise<PaginationFixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), "api-pagination-test-"));
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);

  const app = await buildApp(root);
  const channel = await app.repository.createChannel({
    name: "Pagination Studio Channel",
    description: "Channel for pagination and filtering tests",
    target_audience: "General",
    language: "English",
    market: "GLOBAL",
    dna_mode: "example",
  });

  const cleanup = async () => {
    await app.close();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  };

  return { app, root, channel, cleanup };
}

export async function seedTestEpisodes(fixture: PaginationFixture): Promise<Episode[]> {
  const { root, channel } = fixture;
  const episodesData = [
    {
      id: "ep_01",
      slug: "dolphin-intelligence",
      title: "Dolphin Intelligence Secrets",
      stage: "SCRIPT" as const,
      created: "2026-09-01T10:00:00.000Z",
      updated: "2026-09-05T12:00:00.000Z",
    },
    {
      id: "ep_02",
      slug: "ancient-egyptian-pyramids",
      title: "Ancient Egyptian Pyramids",
      stage: "IDEA" as const,
      created: "2026-09-02T10:00:00.000Z",
      updated: "2026-09-04T12:00:00.000Z",
    },
    {
      id: "ep_03",
      slug: "deep-ocean-mysteries",
      title: "Deep Ocean Mysteries",
      stage: "VIDEO_READY" as const,
      created: "2026-09-03T10:00:00.000Z",
      updated: "2026-09-03T12:00:00.000Z",
    },
    {
      id: "ep_04",
      slug: "volcanoes-magma-chambers",
      title: "Volcanoes and Magma Chambers",
      stage: "SCRIPT" as const,
      created: "2026-09-04T10:00:00.000Z",
      updated: "2026-09-02T12:00:00.000Z",
    },
    {
      id: "ep_05",
      slug: "space-exploration-missions",
      title: "Space Exploration Missions",
      stage: "SCENE_READY" as const,
      created: "2026-09-05T10:00:00.000Z",
      updated: "2026-09-01T12:00:00.000Z",
    },
  ];

  const episodes: Episode[] = [];
  for (const item of episodesData) {
    const epDir = path.join(root, "channels", channel.slug, "episodes", item.slug);
    await mkdir(epDir, { recursive: true });

    const ep = EpisodeSchema.parse({
      episode_id: item.id,
      channel_id: channel.channel_id,
      slug: item.slug,
      topic: {
        topic_id: `topic-${item.id}`,
        channel_id: channel.channel_id,
        content_kind: "episode",
        origin: "discovery",
        title: item.title,
        premise: `Premise for ${item.title}`,
        why_it_fits: "Fits channel audience",
        hook: `Hook for ${item.title}`,
        estimated_potential: "High",
        generated_at: item.created,
        selected: true,
        question_count: 5,
        quiz_format: "multiple_choice",
        age_band: "family",
        visual_style: "flat_vector",
        archetype: "deep_trivia",
      },
      stage: item.stage,
      script_path: path.join(epDir, "script.md"),
      research_path: null,
      treatment_path: null,
      visual_bible_path: null,
      scene_plan_path: path.join(epDir, "scene_plan.json"),
      dialogue_script_path: path.join(epDir, "dialogue.md"),
      video_prompts_path: path.join(epDir, "prompts.md"),
      target_duration_minutes: 8,
      target_word_count: 1050,
      narration_asset_path: null,
      narration_generated_at: null,
      narration_duration_seconds: null,
      narration_segment_count: 0,
      measured_narration_words_per_second: null,
      quiz_config: {},
      video_asset_path: null,
      video_generated_at: null,
      video_duration_seconds: null,
      render_manifest_path: null,
      thumbnail_asset_path_16_9: null,
      thumbnail_asset_path_9_16: null,
      created_at: item.created,
      updated_at: item.updated,
    });

    await writeFile(path.join(epDir, "episode.json"), JSON.stringify(ep, null, 2), "utf8");
    episodes.push(ep);
  }

  return episodes;
}

export async function seedTestShortReels(fixture: PaginationFixture): Promise<ShortReelRecord[]> {
  const { root, channel } = fixture;
  const reelsData = [
    {
      reelId: "sreel_01",
      topicId: "top_reel_01",
      title: "Cheetah vs Greyhound Speed",
      created: "2026-09-01T10:00:00.000Z",
      updated: "2026-09-04T12:00:00.000Z",
      isReady: true,
    },
    {
      reelId: "sreel_02",
      topicId: "top_reel_02",
      title: "Blue Whale Heartbeat",
      created: "2026-09-02T10:00:00.000Z",
      updated: "2026-09-03T12:00:00.000Z",
      isReady: false,
    },
    {
      reelId: "sreel_03",
      topicId: "top_reel_03",
      title: "Peregrine Falcon Dive",
      created: "2026-09-03T10:00:00.000Z",
      updated: "2026-09-02T12:00:00.000Z",
      isReady: true,
    },
    {
      reelId: "sreel_04",
      topicId: "top_reel_04",
      title: "Ant Colony Megastructure",
      created: "2026-09-04T10:00:00.000Z",
      updated: "2026-09-01T12:00:00.000Z",
      isReady: false,
    },
  ];

  const reels: ShortReelRecord[] = [];
  for (const item of reelsData) {
    const reelDir = path.join(root, "channels", channel.slug, "short_reels", item.reelId);
    await mkdir(reelDir, { recursive: true });

    const q = BankQuestionSchema.parse({
      id: `q_${item.reelId}`,
      archetype_id: "versus_faceoff",
      domain_id: "nature_animals",
      subtopic_id: "predators",
      language: "en",
      question: `Which is faster: ${item.title}?`,
      format: "multiple_choice",
      choices: [
        { id: "a", text: "Option A", is_correct: true },
        { id: "b", text: "Option B", is_correct: false },
      ],
      correct_choice_id: "a",
      explanation: "Explanation text",
      status: "approved",
      age_band: "family",
      difficulty: 2,
      thinking_seconds: 5,
      created_at: item.created,
      updated_at: item.updated,
    });

    const reel = createInitialShortReel({
      channel_id: channel.channel_id,
      reel_id: item.reelId,
      topic: {
        topic_id: item.topicId,
        channel_id: channel.channel_id,
        title: item.title,
        premise: `Premise for ${item.title}`,
        hook: `Hook for ${item.title}`,
        origin: "discovery",
      },
      source: createSourceSnapshot(q),
    });

    reel.created_at = item.created;
    reel.updated_at = item.updated;
    if (item.isReady) {
      for (const unitKey of ["references", "script", "cover", "publishing"] as const) {
        reel.units[unitKey].state = "ready";
      }
    }

    await writeFile(path.join(reelDir, "reel.json"), JSON.stringify(reel, null, 2), "utf8");
    reels.push(reel);
  }

  return reels;
}
