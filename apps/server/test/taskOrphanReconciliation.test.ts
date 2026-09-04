import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TaskSchema, type TaskEvent } from "@studio/shared";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "orphan-task-reconciliation-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  const app = await buildApp(root);
  const channel = await app.repository.createChannel({
    name: "Active Channel",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  await app.repository.saveTopicRun(
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
  const episode = await app.repository.confirmTopic(channel.channel_id, "topic-0");
  return { app, root, channel, episode };
}

function createTask(taskId: string, channelId: string, episodeId: string | null, status: "COMPLETED" | "RUNNING") {
  const timestamp = "2026-09-03T02:00:00.000Z";
  return TaskSchema.parse({
    task_id: taskId,
    task_type: "GENERATE_VIDEO",
    channel_id: channelId,
    episode_id: episodeId,
    status,
    created_at: timestamp,
    started_at: timestamp,
    completed_at: status === "COMPLETED" ? timestamp : null,
    error: null,
    output_files: [],
    lock_key: episodeId || channelId,
    queue_position: null,
    progress_message: status === "COMPLETED" ? "Completed" : "Rendering",
    progress_percent: status === "COMPLETED" ? 100 : 50,
    scene_number: null,
    accumulated_duration_seconds: 0,
  });
}

describe("task orphan reconciliation and channel deletion", () => {
  it("automatically purges orphaned tasks for non-existent episodes and channels on load", async () => {
    const { app, root, channel, episode } = await fixture();
    try {
      // Create a valid task
      const validTask = createTask("task-valid", channel.channel_id, episode.episode_id, "COMPLETED");
      // Create an orphaned task pointing to a deleted episode
      const orphanEpTask = createTask("task-orphan-ep", channel.channel_id, "ep_non_existent_999", "COMPLETED");
      // Create an orphaned task pointing to a deleted channel
      const orphanChTask = createTask("task-orphan-ch", "ch_non_existent_888", null, "COMPLETED");

      const validTaskPath = app.repository.resolvePath("runtime", "tasks", `${validTask.task_id}.json`);
      const orphanEpTaskPath = app.repository.resolvePath("runtime", "tasks", `${orphanEpTask.task_id}.json`);
      const orphanChTaskPath = app.repository.resolvePath("runtime", "tasks", `${orphanChTask.task_id}.json`);

      await Promise.all([
        writeFile(validTaskPath, `${JSON.stringify(validTask)}\n`, "utf8"),
        writeFile(orphanEpTaskPath, `${JSON.stringify(orphanEpTask)}\n`, "utf8"),
        writeFile(orphanChTaskPath, `${JSON.stringify(orphanChTask)}\n`, "utf8"),
      ]);

      // Re-load tasks from disk to trigger startup reconciliation
      await app.tasks.load();

      // Valid task should still be in memory and on disk
      expect(app.tasks.list().map((t) => t.task_id)).toEqual(["task-valid"]);
      await expect(access(validTaskPath)).resolves.toBeUndefined();

      // Orphaned tasks should have been removed from memory and deleted from disk
      await expect(access(orphanEpTaskPath)).rejects.toThrow();
      await expect(access(orphanChTaskPath)).rejects.toThrow();
    } finally {
      await app.close();
    }
  });

  it("prunes all tasks for a channel when deleting the channel", async () => {
    const { app, channel, episode } = await fixture();
    try {
      const task = createTask("task-channel-ep", channel.channel_id, episode.episode_id, "COMPLETED");
      const taskPath = app.repository.resolvePath("runtime", "tasks", `${task.task_id}.json`);
      app.tasks.tasks.set(task.task_id, task);
      await writeFile(taskPath, `${JSON.stringify(task)}\n`, "utf8");

      const events: TaskEvent[] = [];
      app.tasks.on("event", (event: TaskEvent) => events.push(event));

      const response = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}?confirm=true`,
      });

      expect(response.statusCode).toBe(200);
      expect(app.tasks.list()).toHaveLength(0);
      await expect(access(taskPath)).rejects.toThrow();
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "tasks.pruned",
          task_ids: [task.task_id],
        }),
      );
    } finally {
      await app.close();
    }
  });

  it("prevents channel deletion when it has active tasks", async () => {
    const { app, channel } = await fixture();
    try {
      const activeTask = createTask("task-channel-active", channel.channel_id, null, "RUNNING");
      app.tasks.tasks.set(activeTask.task_id, activeTask);

      const response = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}?confirm=true`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json<{ error: string }>().error).toContain("active tasks");
      expect(app.tasks.get(activeTask.task_id)).toEqual(activeTask);
    } finally {
      await app.close();
    }
  });
});
