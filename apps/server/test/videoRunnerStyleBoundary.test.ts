import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EpisodeSchema, QuizAssetResolutionSchema, type Task } from "@studio/shared";
import { assetFingerprint } from "../src/quiz/assets/assetFingerprint.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { runVideoTask } from "../src/tasks/videoRunner.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";
import { styleBoundaryChannel, styleBoundaryEpisode, styleBoundaryQuiz } from "./quizStyleBoundaryFixtures.js";

vi.mock("../src/tasks/video/videoAssetPreparation.js", () => ({
  prepareVideoAssets: (input: { assetResolution: unknown }) =>
    Promise.resolve({ assetResolution: input.assetResolution, assetSources: {} }),
}));

vi.mock("../src/tasks/video/soundtrackPreparation.js", () => ({
  prepareSoundtrack: () => Promise.resolve({ selectedBgmTrackId: null, selectedBgmFilename: null }),
}));

vi.mock("../src/tasks/video/mascotLocalization.js", () => ({ prepareLocalizedMascot: () => Promise.resolve(null) }));
vi.mock("../src/tasks/video/videoStaticAssets.js", () => ({ syncStaticMediaAssets: () => Promise.resolve({ fontFingerprints: [] }) }));
vi.mock("../src/quiz/qa/postRenderQa.js", () => ({
  inspectRenderedVideo: () =>
    Promise.resolve({
      probe: {
        format: { duration: "30" },
        streams: [
          { codec_type: "video", width: 1920, height: 1080, r_frame_rate: "30/1" },
          { codec_type: "audio", duration: "30" },
        ],
      },
      issues: [],
    }),
}));
vi.mock("../src/tasks/video/videoLayoutChecker.js", () => ({
  verifyAndCheckLayout: async (input: { renderRoot: string; sourceFingerprint: string }) => {
    await Promise.all([
      writeFile(path.join(input.renderRoot, "quiz-video.mp4"), new Uint8Array([1, 2, 3])),
      writeFile(
        path.join(input.renderRoot, "render-checkpoint.json"),
        JSON.stringify({
          schema_version: 2,
          source_fingerprint: input.sourceFingerprint,
          check: { status: "passed" },
          render: { status: "passed" },
        }),
        "utf8",
      ),
    ]);
  },
}));

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("videoRunner style boundary", () => {
  it("P8B-BND-01 crosses videoRunner, HyperframesRenderer, and Composition without external providers", async () => {
    const fixture = await createFixture();
    const finish = vi.fn();
    const runtime = runtimeFor(fixture.repository, finish);

    await runVideoTask.call(runtime, taskFor(fixture.channelId, fixture.episodeId));

    expect(finish).toHaveBeenCalledWith("task-style-boundary", "COMPLETED", null, expect.any(Array));
    const files = await findQuestionComposition(fixture.renderRoot);
    expect(files).toContain("--bg-primary:#FF964F");
    expect(files).toContain("ac-comic-chunky");
    expect(files).toContain('class="bg-aurora-glow"');
  });
});

async function createFixture() {
  const root = await createTestRoot();
  const channel = styleBoundaryChannel();
  const episodeId = "runner-style-boundary";
  const episode = EpisodeSchema.parse({
    episode_id: episodeId,
    channel_id: channel.channel_id,
    slug: episodeId,
    topic: { title: "Runner topic", premise: "Premise", hook: "Hook" },
    stage: "NARRATION_READY",
    script_path: "script.md",
    scene_plan_path: "scenes.json",
    dialogue_script_path: "dialogue.md",
    video_prompts_path: "prompts.md",
    narration_asset_path: "narration.wav",
    narration_generated_at: "2026-08-31T00:00:00.000Z",
    narration_duration_seconds: 30,
    narration_segment_count: 1,
    measured_narration_words_per_second: 20,
    quiz_config: styleBoundaryEpisode({
      palette_id: "orange",
      answer_card_style: "comic_chunky",
      background_style: "auto",
    }),
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
  });
  const quiz = { ...styleBoundaryQuiz, episode_id: episodeId };
  const director = createDefaultDirectorPlan(quiz);
  director.beats[0].palette_id = "auto";
  director.beats[0].answer_card_style = "auto";
  director.beats[0].background_style = "auto";
  const assetPlan = planQuizAssets(quiz, director);
  const voice = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan: voice, targetDurationSeconds: 30 });
  const resolution = QuizAssetResolutionSchema.parse({
    schema_version: 2,
    episode_id: episodeId,
    template_id: "candy_arcade",
    assets: assetPlan.assets.map((asset) => ({
      ...asset,
      fingerprint: assetFingerprint(asset),
      path: `assets/${asset.asset_id}.png`,
      source: "cache",
    })),
  });
  const narrationPath = path.join(root, "narration.wav");
  await writeFile(narrationPath, fakeWav());
  const repository = {
    rootDirectory: root,
    resolvePath: (...segments: string[]) => path.join(root, ...segments),
    getEpisode: () => Promise.resolve(episode),
    getChannel: () => Promise.resolve(channel),
    readScenes: () => Promise.resolve([scene(episodeId)]),
    getEpisodeAudioFile: () =>
      Promise.resolve({
        absolutePath: narrationPath,
        path: "narration.wav",
        size: 44,
        modified_at: "2026-08-31T00:00:00.000Z",
      }),
    readQuiz: () => Promise.resolve(quiz),
    readDirectorPlan: () => Promise.resolve(director),
    readAssetPlan: () => Promise.resolve(assetPlan),
    readQuizAssetResolution: () => Promise.resolve(resolution),
    readVoicePlan: () => Promise.resolve(voice),
    readQuizTimeline: () => Promise.resolve(timeline),
    writeQuizAssessment: () => Promise.resolve("assessment.json"),
    readBgmHistory: () => Promise.resolve([]),
    writeRenderManifest: () => Promise.resolve("render-manifest.json"),
    writeVideoArtifact: () => Promise.resolve("quiz-video.mp4"),
    saveVideoMetadata: () => Promise.resolve(episode),
    appendQuestionHistory: () => Promise.resolve(undefined),
    appendBgmHistory: () => Promise.resolve(undefined),
    removeQuestionHistoryEntries: () => Promise.resolve(undefined),
  };
  return {
    repository,
    channelId: channel.channel_id,
    episodeId,
    renderRoot: repository.resolvePath("runtime", "hyperframes", episodeId),
  };
}

function runtimeFor(repository: object, finish: ReturnType<typeof vi.fn>): TaskManagerRuntime {
  const activeVideoControllers = new Map<string, AbortController>();
  return {
    repository,
    videoConfig: { aspect_ratio: "16:9", fast_render_mode: true, render_quality: "medium", fps: 30, render_workers: 1 },
    activeVideoControllers,
    get: () => ({ status: "RUNNING" }),
    hasValidNarrationAsset: () => Promise.resolve(true),
    update: () => Promise.resolve(undefined),
    finish,
    logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as TaskManagerRuntime;
}

function taskFor(channelId: string, episodeId: string): Task {
  return {
    task_id: "task-style-boundary",
    task_type: "GENERATE_VIDEO",
    channel_id: channelId,
    episode_id: episodeId,
    status: "RUNNING",
    created_at: "2026-08-31T00:00:00.000Z",
    started_at: "2026-08-31T00:00:00.000Z",
    completed_at: null,
    codex_thread_id: null,
    codex_turn_id: null,
    error: null,
    output_files: [],
    lock_key: episodeId,
    queue_position: null,
    progress_message: "",
    scene_number: null,
  } as Task;
}

async function findQuestionComposition(renderRoot: string): Promise<string> {
  const compositionDirectory = path.join(renderRoot, "compositions");
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(compositionDirectory));
  const questionFile = entries.find((entry) => entry.includes("quiz-q1-"));
  if (!questionFile) throw new Error("Question composition was not written");
  return readFile(path.join(compositionDirectory, questionFile), "utf8");
}

function scene(episodeId: string) {
  return {
    scene_id: "runner-scene-1",
    episode_id: episodeId,
    scene_number: 1,
    duration_seconds: 6,
    dialogue: "Which animal has stripes?",
    visual_prompt: "A friendly tiger",
    transition_note: "",
    continuity_note: "",
    source_ids: ["S01"],
    quiz: {
      phase: "question" as const,
      question_number: 1,
      question: "Which animal has stripes?",
      choices: ["Tiger", "Dolphin", "Elephant"],
      answer: "Tiger",
      explanation: "A tiger has stripes.",
      image_prompt: "A friendly tiger",
    },
  };
}

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "video-runner-style-boundary-"));
  roots.push(root);
  return root;
}

function fakeWav(): Uint8Array {
  const bytes = new Uint8Array(44);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WAVE"), 8);
  return bytes;
}
