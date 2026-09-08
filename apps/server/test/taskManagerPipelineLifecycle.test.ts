import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QuizAssessmentSchema, QuizAssetPlanSchema, QuizAssetResolutionSchema, type Task } from "@studio/shared";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { TaskManager } from "../src/tasks.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { FakeCodex, fakeWav, registerTestRoot, waitFor } from "./tasksTestUtils.js";

describe("TaskManager locks", { timeout: 20000 }, () => {
  it("runs a Quiz pipeline through V2 and submits video without legacy narration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-v2-pipeline-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Quiz V2 Pipeline",
      description: "",
      target_audience: "",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `v2_pipeline_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `V2 Pipeline Topic ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      quiz_format: "multiple_choice" as const,
      question_count: 3,
      age_band: "7-9" as const,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
    await repository.saveEpisodeFile(channel.channel_id, episode.episode_id, "research.md", "# Research Dossier\n\nC01 verified");
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "treatment.md",
      "# Treatment\n\n## Question 1\nTiger question.\n\n## Question 2\nDolphin question.\n\n## Question 3\nElephant question.",
    );
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "script.md",
      "# V2 Pipeline Topic 0\n\n<!-- HUMOR_POLICY: v1 -->\n\n## Question 1\nGuess which animal has stripes. Tiger is the answer.\n\n## Question 2\nGuess which animal swims. Dolphin is the answer.\n\n## Question 3\nGuess which animal has a trunk. Elephant is the answer.",
    );
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "visual_bible.md",
      [
        "# Episode Visual Bible",
        "",
        "## Safe motion",
        "",
        "Gentle fades with a static reduced-motion fallback.",
        "",
        "## Continuity bundle CB-01 — Tiger",
        "",
        "Anchor-frame prompt: A friendly tiger. Reference asset slots: tiger.",
        "",
        "## Continuity bundle CB-02 — Dolphin",
        "",
        "Anchor-frame prompt: A friendly dolphin. Reference asset slots: dolphin.",
        "",
        "## Continuity bundle CB-03 — Elephant",
        "",
        "Anchor-frame prompt: A friendly elephant. Reference asset slots: elephant.",
      ].join("\n"),
    );
    await repository.saveScenes(channel.channel_id, episode.episode_id, [
      {
        scene_id: "v2-pipeline-scene",
        episode_id: episode.episode_id,
        scene_number: 1,
        duration_seconds: 6,
        dialogue: "Which animal has stripes?",
        visual_prompt: "CAMERA\nA quiz card.\nACTION\nChoices appear.\nLIGHTING\nSoft.\nATMOSPHERE\nBright.\nCONTINUITY\nCandy palette.",
        transition_note: "",
        continuity_note: "Candy palette",
        sequence_id: "sequence-1",
        sequence_title: "Quiz",
        shot_id: "shot-1",
        asset_type: "ai_reconstruction",
        continuity_bundle_id: "CB-01",
        reference_asset_ids: [],
        source_ids: [],
        reconstruction: true,
        sound_cue: "",
        editorial_overlay: { kind: "none" },
        audio_asset_path: null,
        audio_generated_at: null,
        audio_duration_seconds: null,
        quiz: {
          phase: "question" as const,
          question_number: 1,
          question: "Which animal has stripes?",
          choices: ["Tiger", "Dolphin", "Elephant"],
          answer: "Tiger",
          explanation: "Tigers have stripes.",
          image_prompt: "",
        },
      },
    ]);
    const scenes = await repository.readScenes(channel.channel_id, episode.episode_id);
    const quiz = deriveQuizV2FromScenes({
      episodeId: episode.episode_id,
      language: channel.language,
      ageBand: episode.quiz_config.age_band,
      format: episode.quiz_config.quiz_format,
      scenes,
    });
    const director = createDefaultDirectorPlan(quiz);
    const voice = buildQuizVoicePlan(quiz);
    const measuredVoice = { ...voice, segments: voice.segments.map((segment) => ({ ...segment, duration_seconds: 4 })) };
    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);
    await repository.writeDirectorPlan(channel.channel_id, episode.episode_id, director);
    await repository.writeAssetPlan(
      channel.channel_id,
      episode.episode_id,
      QuizAssetPlanSchema.parse({ schema_version: 2, episode_id: episode.episode_id, assets: [], consistency_groups: [] }),
    );
    await repository.writeQuizAssetResolution(
      channel.channel_id,
      episode.episode_id,
      QuizAssetResolutionSchema.parse({ schema_version: 2, episode_id: episode.episode_id, template_id: "candy_arcade", assets: [] }),
    );
    await repository.writeVoicePlan(channel.channel_id, episode.episode_id, measuredVoice);
    await repository.writeQuizTimeline(
      channel.channel_id,
      episode.episode_id,
      compileQuizTimeline({ quiz, director, voicePlan: measuredVoice }),
    );
    await repository.writeQuizAssessment(
      channel.channel_id,
      episode.episode_id,
      QuizAssessmentSchema.parse({
        schema_version: 2,
        episode_id: episode.episode_id,
        assessed_at: new Date().toISOString(),
        score: 90,
        rating: "production_ready",
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        issues: [],
      }),
    );
    const narrationPath = await repository.writeQuizNarrationAudio(channel.channel_id, episode.episode_id, fakeWav(2));
    await repository.saveNarrationMetadata(channel.channel_id, episode.episode_id, narrationPath, 30, measuredVoice.segments.length, 20);

    const logger = new StudioLogger(root);
    await logger.init();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), new FakeCodex() as never, 1, 8, logger);
    await manager.load();
    const internals = manager as unknown as {
      runVideoTask: (task: { task_id: string }) => Promise<void>;
      finish: (taskId: string, status: "COMPLETED", error: string | null, outputFiles?: string[]) => Promise<void>;
    };
    internals.runVideoTask = async (task) => internals.finish(task.task_id, "COMPLETED", null, []);
    const pipeline = manager.submit("GENERATE_PIPELINE", channel.channel_id, episode.episode_id);
    await waitFor(() => ["COMPLETED", "FAILED", "CANCELLED"].includes(manager.get(pipeline.task_id).status));
    expect(manager.get(pipeline.task_id)).toMatchObject({ status: "COMPLETED", error: null });
    const taskTypes = manager
      .list()
      .filter((task) => task.episode_id === episode.episode_id)
      .map((task) => task.task_type);
    expect(taskTypes).toContain("GENERATE_VIDEO");
    expect(taskTypes).not.toContain(["GENERATE_", "NARRATION"].join(""));
  });

  it("accumulates elapsed time when retrying a pipeline or task", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "tasks-timer-test-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Timer Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `timer_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Timer Topic ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);

    const logger = new StudioLogger(root);
    await logger.init();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), new FakeCodex() as never, 1, 8, logger);
    await manager.load();

    // 1. Submit initial pipeline task
    const task1 = manager.submit("GENERATE_PIPELINE", channel.channel_id, episode.episode_id);
    expect(task1.accumulated_duration_seconds).toBe(0);

    // Simulate task1 running for 120 seconds and then failing
    const startTime1 = new Date(Date.now() - 120_000).toISOString();
    const endTime1 = new Date().toISOString();
    const internals = manager as unknown as { tasks: Map<string, Task> };
    internals.tasks.set(task1.task_id, {
      ...task1,
      status: "FAILED",
      started_at: startTime1,
      completed_at: endTime1,
      error: "Temporary network issue",
    });

    // 2. Retry pipeline (Submit second pipeline task)
    const task2 = manager.submit("GENERATE_PIPELINE", channel.channel_id, episode.episode_id);
    expect(task2.accumulated_duration_seconds).toBeGreaterThanOrEqual(119);
    expect(task2.accumulated_duration_seconds).toBeLessThanOrEqual(121);
    await waitFor(() => manager.get(task2.task_id).status === "FAILED" || manager.get(task2.task_id).status === "COMPLETED");
  });
});
