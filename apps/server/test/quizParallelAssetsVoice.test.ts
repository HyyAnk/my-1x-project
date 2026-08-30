import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuizAssetPlanSchema, QuizAssetResolutionSchema, type Task } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { StudioLogger } from "../src/logger.js";
import { ContextEngine } from "../src/context.js";
import { TaskManager } from "../src/tasks.js";
import { runQuizV2Pipeline } from "../src/tasks/pipelineRunner.js";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import * as resolveQuizAssetsModule from "../src/quiz/assets/resolveQuizAssets.js";
import * as orchestrator from "../src/quiz/pipeline/orchestrator.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

const fakeWav = (durationSeconds = 2): Uint8Array => {
  const sampleRate = 48000;
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = Math.floor(durationSeconds * byteRate);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
};

describe("Quiz V2 Parallel Asset & Voice Execution", () => {
  it("runs resolveAssets and generateVoice concurrently and merges progress updates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-parallel-test-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const repository = new RepositoryService(root);
    const logger = new StudioLogger(root);
    await logger.init();

    const channel = await repository.createChannel({
      name: "Quiz Parallel Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "Global",
      dna_mode: "example",
      group_id: "quiz",
    });

    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-par-${index}`,
      channel_id: channel.channel_id,
      title: `Parallel Quiz Topic ${index}`,
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

    await repository.saveScenes(
      channel.channel_id,
      episode.episode_id,
      [1, 2, 3].map((number) => ({
        scene_id: `scene-${number}`,
        episode_id: episode.episode_id,
        scene_number: number,
        duration_seconds: 6,
        dialogue: `Question ${number}`,
        visual_prompt: `Card ${number}`,
        transition_note: "",
        continuity_note: "",
        quiz: {
          phase: "question" as const,
          question_number: number,
          question: `Which animal has stripes? ${number}`,
          choices: ["Tiger", "Dolphin", "Elephant"],
          answer: "Tiger",
          explanation: "Tigers have stripes.",
          image_prompt: "Tiger image",
        },
      })),
    );

    const taskManager = new TaskManager(repository, new ContextEngine(repository, logger), new EventEmitter() as never, 1, 8, logger);
    await taskManager.load();

    const task: Task = {
      task_id: "task-parallel-run",
      task_type: "GENERATE_PIPELINE",
      channel_id: channel.channel_id,
      episode_id: episode.episode_id,
      status: "RUNNING",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: episode.episode_id,
      queue_position: null,
      progress_message: "Starting",
      scene_number: null,
    };
    (taskManager as unknown as { tasks: Map<string, Task> }).tasks.set(task.task_id, task);

    // Track concurrency execution overlap
    let resolveAssetsRunning = false;
    let generateVoiceRunning = false;
    let maxConcurrent = 0;
    const progressUpdates: Array<{ message: string; percent: number }> = [];

    vi.spyOn(taskManager, "update").mockImplementation(async (_id, partial) => {
      if (partial.progress_message || partial.progress_percent !== undefined) {
        progressUpdates.push({
          message: partial.progress_message ?? "",
          percent: partial.progress_percent ?? 0,
        });
      }
      return task;
    });

    vi.spyOn(orchestrator, "generateQuiz").mockImplementation(async (input) => {
      const episode = await input.repository.getEpisode(input.channelId, input.episodeId);
      const channel = await input.repository.getChannel(input.channelId);
      const scenes = await input.repository.readScenes(input.channelId, input.episodeId);
      const quiz = deriveQuizV2FromScenes({
        episodeId: episode.episode_id,
        language: channel.language,
        ageBand: episode.quiz_config.age_band,
        format: episode.quiz_config.quiz_format,
        scenes,
      });
      await input.repository.writeQuiz(input.channelId, input.episodeId, quiz);
      return { quiz, history_check: {} as never, artifact_path: "quiz.json", invalidated: [] };
    });

    vi.spyOn(orchestrator, "generateDirector").mockImplementation(async (input) => {
      const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
      const plan = createDefaultDirectorPlan(quiz!);
      await input.repository.writeDirectorPlan(input.channelId, input.episodeId, plan);
      return { director_plan: plan, artifact_path: "director.json", invalidated: [] };
    });

    vi.spyOn(orchestrator, "planAssets").mockImplementation(async (input) => {
      const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
      const director = await input.repository.readDirectorPlan(input.channelId, input.episodeId);
      const plan = planQuizAssets(quiz!, director!);
      await input.repository.writeAssetPlan(input.channelId, input.episodeId, plan);
      return { asset_plan: plan, artifact_path: "asset_plan.json", invalidated: [] };
    });

    vi.spyOn(orchestrator, "resolveAssets").mockImplementation(async (input) => {
      resolveAssetsRunning = true;
      const currentConcurrency = (resolveAssetsRunning ? 1 : 0) + (generateVoiceRunning ? 1 : 0);
      maxConcurrent = Math.max(maxConcurrent, currentConcurrency);

      // Simulate progress callback
      await input.onAssetProgress?.({ completed: 1, total: 1, reused: false });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resolution = QuizAssetResolutionSchema.parse({
        schema_version: 2,
        episode_id: input.episodeId,
        template_id: "candy_arcade",
        assets: [],
      });
      await input.repository.writeQuizAssetResolution(input.channelId, input.episodeId, resolution);
      resolveAssetsRunning = false;
      return { asset_resolution: resolution, issues: [], invalidated: [] };
    });

    vi.spyOn(orchestrator, "generateVoice").mockImplementation(async (input) => {
      generateVoiceRunning = true;
      const currentConcurrency = (resolveAssetsRunning ? 1 : 0) + (generateVoiceRunning ? 1 : 0);
      maxConcurrent = Math.max(maxConcurrent, currentConcurrency);

      // Simulate progress callback
      await input.onVoiceProgress?.({ completed: 1, total: 1, reused: false });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
      const director = await input.repository.readDirectorPlan(input.channelId, input.episodeId);
      const voice = buildQuizVoicePlan(quiz!);
      const voicePlan = { ...voice, segments: voice.segments.map((segment) => ({ ...segment, duration_seconds: 4 })) };
      const timeline = compileQuizTimeline({ quiz: quiz!, director: director!, voicePlan });
      await input.repository.writeVoicePlan(input.channelId, input.episodeId, voicePlan);
      await input.repository.writeQuizTimeline(input.channelId, input.episodeId, timeline);
      const narrationPath = await input.repository.writeQuizNarrationAudio(input.channelId, input.episodeId, fakeWav(2));
      await input.repository.saveNarrationMetadata(
        input.channelId,
        input.episodeId,
        narrationPath,
        timeline.duration_seconds,
        voicePlan.segments.length,
        10,
      );
      generateVoiceRunning = false;
      return {
        voice_plan: voicePlan,
        timeline,
        narration_asset_path: narrationPath,
        narration_duration_seconds: timeline.duration_seconds,
        artifact_path: "voice.json",
        timeline_path: "timeline.json",
        invalidated: [],
      };
    });

    vi.spyOn(orchestrator, "compileTimeline").mockImplementation(async (input) => {
      const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
      const director = await input.repository.readDirectorPlan(input.channelId, input.episodeId);
      const voicePlan = await input.repository.readVoicePlan(input.channelId, input.episodeId);
      const timeline = compileQuizTimeline({ quiz: quiz!, director: director!, voicePlan: voicePlan! });
      await input.repository.writeQuizTimeline(input.channelId, input.episodeId, timeline);
      return { timeline, artifact_path: "timeline.json", invalidated: [] };
    });

    vi.spyOn(orchestrator, "runQa").mockImplementation(async (input) => {
      const assessment = {
        schema_version: 2 as const,
        episode_id: input.episodeId,
        assessed_at: new Date().toISOString(),
        score: 95,
        rating: "production_ready" as const,
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        issues: [],
      };
      await input.repository.writeQuizAssessment(input.channelId, input.episodeId, assessment);
      return { assessment, artifact_path: "assessment.json" };
    });

    await runQuizV2Pipeline.call(taskManager as never, task);

    // Verify that resolveAssets and generateVoice ran concurrently
    expect(maxConcurrent).toBe(2);

    // Verify unified progress message was sent
    const parallelMessage = progressUpdates.find((p) => p.message.includes("assets and voice in parallel"));
    expect(parallelMessage).toBeDefined();

    const combinedProgressMessage = progressUpdates.find((p) => p.message.includes("Quiz · assets") && p.message.includes("voice"));
    expect(combinedProgressMessage).toBeDefined();
  });

  it("runs only resolveAssets when voice is already cached and ready", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-parallel-single-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const repository = new RepositoryService(root);
    const logger = new StudioLogger(root);
    await logger.init();

    const channel = await repository.createChannel({
      name: "Quiz Channel Single",
      description: "",
      target_audience: "",
      language: "English",
      market: "Global",
      dna_mode: "example",
      group_id: "quiz",
    });

    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-single-${index}`,
      channel_id: channel.channel_id,
      title: `Single Quiz Topic ${index}`,
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

    await repository.saveScenes(
      channel.channel_id,
      episode.episode_id,
      [1, 2, 3].map((number) => ({
        scene_id: `scene-${number}`,
        episode_id: episode.episode_id,
        scene_number: number,
        duration_seconds: 6,
        dialogue: `Question ${number}`,
        visual_prompt: `Card ${number}`,
        transition_note: "",
        continuity_note: "",
        quiz: {
          phase: "question" as const,
          question_number: number,
          question: `Which animal has stripes? ${number}`,
          choices: ["Tiger", "Dolphin", "Elephant"],
          answer: "Tiger",
          explanation: "Tigers have stripes.",
          image_prompt: "Tiger image",
        },
      })),
    );

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
    const voicePlan = { ...voice, segments: voice.segments.map((segment) => ({ ...segment, duration_seconds: 4 })) };
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });

    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);
    await repository.writeDirectorPlan(channel.channel_id, episode.episode_id, director);
    await repository.writeVoicePlan(channel.channel_id, episode.episode_id, voicePlan);
    await repository.writeQuizTimeline(channel.channel_id, episode.episode_id, timeline);
    const narrationPath = await repository.writeQuizNarrationAudio(channel.channel_id, episode.episode_id, fakeWav(2));
    await repository.saveNarrationMetadata(
      channel.channel_id,
      episode.episode_id,
      narrationPath,
      timeline.duration_seconds,
      voicePlan.segments.length,
      10,
    );

    const taskManager = new TaskManager(repository, new ContextEngine(repository, logger), new EventEmitter() as never, 1, 8, logger);
    await taskManager.load();

    const task: Task = {
      task_id: "task-single-run",
      task_type: "GENERATE_PIPELINE",
      channel_id: channel.channel_id,
      episode_id: episode.episode_id,
      status: "RUNNING",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: episode.episode_id,
      queue_position: null,
      progress_message: "Starting",
      scene_number: null,
    };
    (taskManager as unknown as { tasks: Map<string, Task> }).tasks.set(task.task_id, task);
    vi.spyOn(taskManager, "update").mockResolvedValue(task);

    vi.spyOn(orchestrator, "planAssets").mockImplementation(async (input) => {
      const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
      const director = await input.repository.readDirectorPlan(input.channelId, input.episodeId);
      const plan = planQuizAssets(quiz!, director!);
      await input.repository.writeAssetPlan(input.channelId, input.episodeId, plan);
      return { asset_plan: plan, artifact_path: "asset_plan.json", invalidated: [] };
    });

    const resolveAssetsSpy = vi.spyOn(orchestrator, "resolveAssets").mockImplementation(async (input) => {
      const resolution = QuizAssetResolutionSchema.parse({
        schema_version: 2,
        episode_id: input.episodeId,
        template_id: "candy_arcade",
        assets: [],
      });
      await input.repository.writeQuizAssetResolution(input.channelId, input.episodeId, resolution);
      return { asset_resolution: resolution, issues: [], invalidated: [] };
    });

    const generateVoiceSpy = vi.spyOn(orchestrator, "generateVoice");

    vi.spyOn(orchestrator, "runQa").mockImplementation(async (input) => {
      const assessment = {
        schema_version: 2 as const,
        episode_id: input.episodeId,
        assessed_at: new Date().toISOString(),
        score: 95,
        rating: "production_ready" as const,
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        issues: [],
      };
      await input.repository.writeQuizAssessment(input.channelId, input.episodeId, assessment);
      return { assessment, artifact_path: "assessment.json" };
    });

    await runQuizV2Pipeline.call(taskManager as never, task);

    expect(resolveAssetsSpy).toHaveBeenCalledTimes(1);
    expect(generateVoiceSpy).not.toHaveBeenCalled();
  });

  it("runs only generateVoice when assets are already cached and ready", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-parallel-voice-only-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    const repository = new RepositoryService(root);
    const logger = new StudioLogger(root);
    await logger.init();

    const channel = await repository.createChannel({
      name: "Quiz Channel Voice Only",
      description: "",
      target_audience: "",
      language: "English",
      market: "Global",
      dna_mode: "example",
      group_id: "quiz",
    });

    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-vo-${index}`,
      channel_id: channel.channel_id,
      title: `Voice Only Topic ${index}`,
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

    await repository.saveScenes(
      channel.channel_id,
      episode.episode_id,
      [1, 2, 3].map((number) => ({
        scene_id: `scene-${number}`,
        episode_id: episode.episode_id,
        scene_number: number,
        duration_seconds: 6,
        dialogue: `Question ${number}`,
        visual_prompt: `Card ${number}`,
        transition_note: "",
        continuity_note: "",
        quiz: {
          phase: "question" as const,
          question_number: number,
          question: `Which animal has stripes? ${number}`,
          choices: ["Tiger", "Dolphin", "Elephant"],
          answer: "Tiger",
          explanation: "Tigers have stripes.",
          image_prompt: "Tiger image",
        },
      })),
    );

    const scenes = await repository.readScenes(channel.channel_id, episode.episode_id);
    const quiz = deriveQuizV2FromScenes({
      episodeId: episode.episode_id,
      language: channel.language,
      ageBand: episode.quiz_config.age_band,
      format: episode.quiz_config.quiz_format,
      scenes,
    });
    const director = createDefaultDirectorPlan(quiz);
    const assetPlan = planQuizAssets(quiz, director);

    await repository.writeQuiz(channel.channel_id, episode.episode_id, quiz);
    await repository.writeDirectorPlan(channel.channel_id, episode.episode_id, director);
    await repository.writeAssetPlan(channel.channel_id, episode.episode_id, assetPlan);

    // Mock asset resolution complete
    const resolution = QuizAssetResolutionSchema.parse({
      schema_version: 2,
      episode_id: episode.episode_id,
      template_id: "candy_arcade",
      assets: [],
    });
    await repository.writeQuizAssetResolution(channel.channel_id, episode.episode_id, resolution);

    const taskManager = new TaskManager(repository, new ContextEngine(repository, logger), new EventEmitter() as never, 1, 8, logger);
    await taskManager.load();

    const task: Task = {
      task_id: "task-voice-only-run",
      task_type: "GENERATE_PIPELINE",
      channel_id: channel.channel_id,
      episode_id: episode.episode_id,
      status: "RUNNING",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: null,
      codex_thread_id: null,
      codex_turn_id: null,
      error: null,
      output_files: [],
      lock_key: episode.episode_id,
      queue_position: null,
      progress_message: "Starting",
      scene_number: null,
    };
    (taskManager as unknown as { tasks: Map<string, Task> }).tasks.set(task.task_id, task);
    vi.spyOn(taskManager, "update").mockResolvedValue(task);

    const resolveAssetsSpy = vi.spyOn(orchestrator, "resolveAssets");

    const generateVoiceSpy = vi.spyOn(orchestrator, "generateVoice").mockImplementation(async (input) => {
      const voice = buildQuizVoicePlan(quiz);
      const voicePlan = { ...voice, segments: voice.segments.map((segment) => ({ ...segment, duration_seconds: 4 })) };
      const timeline = compileQuizTimeline({ quiz, director, voicePlan });
      await input.repository.writeVoicePlan(input.channelId, input.episodeId, voicePlan);
      await input.repository.writeQuizTimeline(input.channelId, input.episodeId, timeline);
      const narrationPath = await input.repository.writeQuizNarrationAudio(input.channelId, input.episodeId, fakeWav(2));
      await input.repository.saveNarrationMetadata(
        input.channelId,
        input.episodeId,
        narrationPath,
        timeline.duration_seconds,
        voicePlan.segments.length,
        10,
      );
      return {
        voice_plan: voicePlan,
        timeline,
        narration_asset_path: narrationPath,
        narration_duration_seconds: timeline.duration_seconds,
        artifact_path: "voice.json",
        timeline_path: "timeline.json",
        invalidated: [],
      };
    });

    vi.spyOn(orchestrator, "runQa").mockImplementation(async (input) => {
      const assessment = {
        schema_version: 2 as const,
        episode_id: input.episodeId,
        assessed_at: new Date().toISOString(),
        score: 95,
        rating: "production_ready" as const,
        categories: { semantic: 100, visual: 100, pacing: 100, audio: 100, variety: 100, render_integrity: 100 },
        issues: [],
      };
      await input.repository.writeQuizAssessment(input.channelId, input.episodeId, assessment);
      return { assessment, artifact_path: "assessment.json" };
    });

    vi.spyOn(resolveQuizAssetsModule, "isQuizAssetResolutionComplete").mockResolvedValue(true);

    vi.spyOn(orchestrator, "compileTimeline").mockImplementation(async (input) => {
      const quiz = await input.repository.readQuiz(input.channelId, input.episodeId);
      const director = await input.repository.readDirectorPlan(input.channelId, input.episodeId);
      const voice = await input.repository.readVoicePlan(input.channelId, input.episodeId);
      const timeline = compileQuizTimeline({ quiz: quiz!, director: director!, voicePlan: voice! });
      await input.repository.writeQuizTimeline(input.channelId, input.episodeId, timeline);
      return { timeline, artifact_path: "timeline.json", invalidated: [] };
    });

    await runQuizV2Pipeline.call(taskManager as never, task);

    expect(generateVoiceSpy).toHaveBeenCalledTimes(1);
    expect(resolveAssetsSpy).not.toHaveBeenCalled();
  });
});
