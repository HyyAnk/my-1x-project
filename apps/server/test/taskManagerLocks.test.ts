import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Task } from "@studio/shared";
import { ContextEngine } from "../src/context.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { TaskManager } from "../src/tasks.js";
import type { AudioProvider } from "../src/providers/index.js";
import { FakeCodex, fakeWav, registerTestRoot, waitFor } from "./tasksTestUtils.js";

describe("TaskManager locks", { timeout: 20000 }, () => {
  it("serializes two tasks targeting the same episode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-tasks-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "shared", "script_rules.md"), "# Script\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Task Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Topic ${index}`,
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
    const fake = new FakeCodex();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), fake as never, 3, 8, logger);
    await manager.load();
    const first = manager.submit("GENERATE_RESEARCH", channel.channel_id, episode.episode_id);
    const second = manager.submit("GENERATE_RESEARCH", channel.channel_id, episode.episode_id);
    expect(second.status).toBe("QUEUED");
    await waitFor(() => manager.get(first.task_id).status === "COMPLETED");
    await waitFor(() => manager.get(second.task_id).status === "COMPLETED");
    expect(manager.get(first.task_id).status).toBe("COMPLETED");
    expect(manager.get(second.task_id).status).toBe("COMPLETED");
    const secondEpisode = await repository.confirmTopic(channel.channel_id, topics[1].topic_id);
    const parallelA = manager.submit("GENERATE_RESEARCH", channel.channel_id, episode.episode_id);
    const parallelB = manager.submit("GENERATE_RESEARCH", channel.channel_id, secondEpisode.episode_id);
    await waitFor(() => manager.get(parallelA.task_id).status === "COMPLETED" && manager.get(parallelB.task_id).status === "COMPLETED");
    expect(fake.maxActiveTurns).toBeGreaterThanOrEqual(2);
  }, 15_000);

  it("runs audio in its own pool without creating Codex turns", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-audio-tasks-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Audio Tasks",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `audio_task_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Audio Task Topic ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const firstEpisode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
    const secondEpisode = await repository.confirmTopic(channel.channel_id, topics[1].topic_id);
    for (const episode of [firstEpisode, secondEpisode])
      await repository.saveScenes(channel.channel_id, episode.episode_id, [
        {
          scene_id: `${episode.episode_id}_scene_1`,
          episode_id: episode.episode_id,
          scene_number: 1,
          duration_seconds: 6,
          dialogue: "Narrate this line",
          visual_prompt: "A scene shot",
          transition_note: "",
          continuity_note: "",
          audio_asset_path: null,
          audio_generated_at: null,
          audio_duration_seconds: null,
        },
      ]);
    const logger = new StudioLogger(root);
    await logger.init();
    const fake = new FakeCodex();
    let activeAudio = 0;
    let maxActiveAudio = 0;
    const providerFactory = (target: { channelId: string; episodeId: string; sceneNumber: number }): AudioProvider => ({
      async generateDialogue(): Promise<{ asset_path: string }> {
        activeAudio += 1;
        maxActiveAudio = Math.max(maxActiveAudio, activeAudio);
        await new Promise((resolve) => setTimeout(resolve, 30));
        const assetPath = await repository.writeSceneAudio(target.channelId, target.episodeId, target.sceneNumber, fakeWav());
        activeAudio -= 1;
        return { asset_path: assetPath };
      },
    });
    const manager = new TaskManager(
      repository,
      new ContextEngine(repository, logger),
      fake as never,
      1,
      8,
      logger,
      { provider: "chatterbox", service_url: "http://127.0.0.1:8890", exaggeration: 0.5, cfg_weight: 0.5, max_concurrent_tasks: 2 },
      providerFactory,
    );
    await manager.load();
    const first = manager.submit("GENERATE_AUDIO", channel.channel_id, firstEpisode.episode_id, 1);
    const second = manager.submit("GENERATE_AUDIO", channel.channel_id, secondEpisode.episode_id, 1);
    await waitFor(() => manager.get(first.task_id).status === "COMPLETED");
    await waitFor(() => manager.get(second.task_id).status === "COMPLETED");
    expect(maxActiveAudio).toBe(2);
    expect(fake.activeTurns).toBe(0);
    expect(manager.get(first.task_id).codex_thread_id).toBeNull();
    expect((await repository.readScenes(channel.channel_id, firstEpisode.episode_id))[0].audio_duration_seconds).toBe(2);
  });

  it("enforces video generation concurrency limit (default 2) and queues exceeding tasks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-video-concurrency-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Queue Channel",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Episode ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const ep1 = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
    const ep2 = await repository.confirmTopic(channel.channel_id, topics[1].topic_id);
    const ep3 = await repository.confirmTopic(channel.channel_id, topics[2].topic_id);

    const logger = new StudioLogger(root);
    await logger.init();
    const videoConfig = { ...DEFAULT_CONFIG.video_generation, max_concurrent_tasks: 2 };
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), new FakeCodex() as never, 3, videoConfig, logger);
    await manager.load();

    let releaseTasks: () => void = () => undefined;
    const holdPromise = new Promise<void>((resolve) => {
      releaseTasks = resolve;
    });
    const internals = manager as unknown as {
      update: (taskId: string, patch: Partial<Task>) => Promise<Task>;
      finish: (taskId: string, status: string, error?: string | null) => Promise<Task>;
      runVideoTask: (task: Task) => Promise<void>;
    };
    internals.runVideoTask = async (task: Task) => {
      await internals.update(task.task_id, { status: "RUNNING" });
      await holdPromise;
      await internals.finish(task.task_id, "COMPLETED");
    };

    const task1 = manager.submit("GENERATE_VIDEO", channel.channel_id, ep1.episode_id);
    const task2 = manager.submit("GENERATE_VIDEO", channel.channel_id, ep2.episode_id);
    const task3 = manager.submit("GENERATE_VIDEO", channel.channel_id, ep3.episode_id);

    // Wait a brief tick for task1 and task2 to enter RUNNING
    await waitFor(() => manager.get(task1.task_id).status === "RUNNING" && manager.get(task2.task_id).status === "RUNNING");

    // task3 should be held in QUEUED because max_concurrent_tasks is 2
    expect(manager.get(task3.task_id).status).toBe("QUEUED");

    // Release active tasks
    releaseTasks();

    // Now task3 should be picked and transition to COMPLETED
    await waitFor(() => manager.get(task3.task_id).status === "COMPLETED");
  });
});
