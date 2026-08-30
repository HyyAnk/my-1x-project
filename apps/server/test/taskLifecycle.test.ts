import { EventEmitter } from "node:events";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FAILED_BUILD_RETENTION_MS, TaskSchema, type QuizQuestion, type Task } from "@studio/shared";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { TaskManager, findExpiredFailedBuilds } from "../src/tasks.js";

const roots: string[] = [];

class FakeCodex extends EventEmitter {
  isConnected = false;
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "failed-build-lifecycle-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Lifecycle Channel",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  await repository.saveTopicRun(
    channel.channel_id,
    Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-${index}`,
      channel_id: channel.channel_id,
      title: `Topic ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    })),
  );
  const episode = await repository.confirmTopic(channel.channel_id, "topic-0");
  const logger = new StudioLogger(root);
  await logger.init();
  const manager = new TaskManager(repository, new ContextEngine(repository, logger), new FakeCodex() as never, 1, 8, logger);
  await manager.load();
  return { root, repository, channel, episode, manager };
}

function videoTask(channelId: string, episodeId: string, patch: Partial<Task> = {}): Task {
  const completedAt = new Date(Date.now() - FAILED_BUILD_RETENTION_MS - 1_000).toISOString();
  return TaskSchema.parse({
    task_id: `task-${Math.random().toString(16).slice(2)}`,
    task_type: "GENERATE_VIDEO",
    channel_id: channelId,
    episode_id: episodeId,
    status: "FAILED",
    created_at: completedAt,
    started_at: completedAt,
    completed_at: completedAt,
    codex_thread_id: null,
    codex_turn_id: null,
    error: "Render failed",
    output_files: [],
    lock_key: episodeId,
    queue_position: null,
    progress_message: "Render failed",
    progress_percent: 50,
    scene_number: null,
    accumulated_duration_seconds: 0,
    ...patch,
  });
}

function quizQuestion(): QuizQuestion {
  return {
    id: "question-1",
    number: 1,
    format: "multiple_choice_text",
    difficulty: 1,
    question: "Which planet is closest to the Sun?",
    choices: [
      { id: "choice-a", text: "Mercury" },
      { id: "choice-b", text: "Venus" },
      { id: "choice-c", text: "Earth" },
    ],
    correct_choice_id: "choice-a",
    explanation: "Mercury is closest.",
    fun_fact: "A year there lasts 88 Earth days.",
    source_ids: [],
    visual_opportunity: "Solar system",
    validation: { semantic_status: "validated", source_coverage: false, fact_locked: true },
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("failed build lifecycle", () => {
  it("selects only expired failed builds that never rendered successfully", () => {
    const now = Date.parse("2026-08-29T12:00:00.000Z");
    const failed = videoTask("channel-1", "episode-1", {
      created_at: new Date(now - FAILED_BUILD_RETENTION_MS - 1).toISOString(),
      completed_at: new Date(now - FAILED_BUILD_RETENTION_MS - 1).toISOString(),
    });
    const successful = videoTask("channel-1", "episode-1", {
      task_id: "task-success",
      status: "COMPLETED",
      created_at: new Date(now - FAILED_BUILD_RETENTION_MS * 2).toISOString(),
      completed_at: new Date(now - FAILED_BUILD_RETENTION_MS * 2).toISOString(),
      error: null,
    });
    expect(findExpiredFailedBuilds([failed], now)).toHaveLength(1);
    expect(findExpiredFailedBuilds([successful, failed], now)).toHaveLength(0);
  });

  it("persists interrupted tasks as failed so restart cannot refresh their ten-hour window", async () => {
    const { repository, channel, episode } = await fixture();
    const interrupted = videoTask(channel.channel_id, episode.episode_id, {
      status: "RUNNING",
      completed_at: null,
      error: null,
    });
    const taskPath = repository.resolvePath("runtime", "tasks", `${interrupted.task_id}.json`);
    await writeFile(taskPath, `${JSON.stringify(interrupted)}\n`, "utf8");
    const logger = new StudioLogger(repository.rootDirectory);
    const reloaded = new TaskManager(repository, new ContextEngine(repository, logger), new FakeCodex() as never, 1, 8, logger);
    await reloaded.load();
    const persisted = TaskSchema.parse(JSON.parse(await readFile(taskPath, "utf8")));
    expect(persisted.status).toBe("FAILED");
    expect(persisted.completed_at).toBe(reloaded.get(interrupted.task_id).completed_at);
  });

  it("removes question history owned by a failed render during reconciliation", async () => {
    const { repository, channel, episode, manager } = await fixture();
    const failed = videoTask(channel.channel_id, episode.episode_id, { completed_at: new Date().toISOString() });
    manager.tasks.set(failed.task_id, failed);
    await repository.appendQuestionHistory(channel.channel_id, episode.episode_id, [quizQuestion()], 30, failed.task_id);
    expect(await repository.readQuestionHistory(channel.channel_id)).toHaveLength(1);

    await manager.reconcileQuestionHistory();

    expect(await repository.readQuestionHistory(channel.channel_id)).toHaveLength(0);
  });

  it("removes expired failed episode assets, runtime files, task records, and question history", async () => {
    const { repository, channel, episode, manager } = await fixture();
    const failed = videoTask(channel.channel_id, episode.episode_id);
    manager.tasks.set(failed.task_id, failed);
    const taskPath = repository.resolvePath("runtime", "tasks", `${failed.task_id}.json`);
    const hyperframesPath = repository.resolvePath("runtime", "hyperframes", episode.episode_id);
    const draftsPath = repository.resolvePath("runtime", "shot-drafts", episode.episode_id);
    await Promise.all([mkdir(hyperframesPath, { recursive: true }), mkdir(draftsPath, { recursive: true })]);
    await writeFile(taskPath, `${JSON.stringify(failed)}\n`, "utf8");
    await repository.appendQuestionHistory(channel.channel_id, episode.episode_id, [quizQuestion()], 30, failed.task_id);
    expect(await repository.readQuestionHistory(channel.channel_id)).toHaveLength(1);

    const result = await manager.cleanupExpiredFailedBuilds(Date.now());

    expect(result).toEqual({ removedEpisodes: 1, removedTasks: 1 });
    expect(await repository.listEpisodes(channel.channel_id)).toHaveLength(0);
    expect(await repository.readQuestionHistory(channel.channel_id)).toHaveLength(0);
    await expect(access(taskPath)).rejects.toThrow();
    await expect(access(hyperframesPath)).rejects.toThrow();
    await expect(access(draftsPath)).rejects.toThrow();
  });
});
