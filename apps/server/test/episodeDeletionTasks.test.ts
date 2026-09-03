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
  const root = await mkdtemp(path.join(os.tmpdir(), "episode-task-deletion-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
  ]);
  const app = await buildApp(root);
  const channel = await app.repository.createChannel({
    name: "Deletion lifecycle",
    description: "",
    target_audience: "",
    language: "English",
    market: "",
    dna_mode: "example",
  });
  await app.repository.saveTopicRun(
    channel.channel_id,
    Array.from({ length: 5 }, (_, index) => ({
      topic_id: `deletion-topic-${index}`,
      channel_id: channel.channel_id,
      title: `Deletion topic ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    })),
  );
  const episode = await app.repository.confirmTopic(channel.channel_id, "deletion-topic-0");
  return { app, root, channel, episode };
}

function episodeTask(channelId: string, episodeId: string, status: "COMPLETED" | "RUNNING") {
  const timestamp = "2026-09-03T02:00:00.000Z";
  return TaskSchema.parse({
    task_id: `task-${status.toLowerCase()}`,
    task_type: "GENERATE_VIDEO",
    channel_id: channelId,
    episode_id: episodeId,
    status,
    created_at: timestamp,
    started_at: timestamp,
    completed_at: status === "COMPLETED" ? timestamp : null,
    error: null,
    output_files: [],
    lock_key: episodeId,
    queue_position: null,
    progress_message: status === "COMPLETED" ? "Completed" : "Rendering",
    progress_percent: status === "COMPLETED" ? 100 : 50,
    scene_number: null,
    accumulated_duration_seconds: 0,
  });
}

describe("episode deletion task lifecycle", () => {
  it("removes persisted and in-memory task history after deleting an episode", async () => {
    const { app, channel, episode } = await fixture();
    try {
      const task = episodeTask(channel.channel_id, episode.episode_id, "COMPLETED");
      const taskPath = app.repository.resolvePath("runtime", "tasks", `${task.task_id}.json`);
      app.tasks.tasks.set(task.task_id, task);
      await writeFile(taskPath, `${JSON.stringify(task)}\n`, "utf8");
      const events: TaskEvent[] = [];
      app.tasks.on("event", (event: TaskEvent) => events.push(event));

      const response = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}?confirm=true`,
      });

      expect(response.statusCode).toBe(200);
      expect(app.tasks.list()).toHaveLength(0);
      await expect(access(taskPath)).rejects.toThrow();
      expect(events).toContainEqual({
        type: "tasks.pruned",
        task_ids: [task.task_id],
        episode_ids: [episode.episode_id],
      });
    } finally {
      await app.close();
    }
  });

  it("preserves the episode and history while one of its tasks is active", async () => {
    const { app, channel, episode } = await fixture();
    try {
      const task = episodeTask(channel.channel_id, episode.episode_id, "RUNNING");
      app.tasks.tasks.set(task.task_id, task);

      const response = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}?confirm=true`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json<{ error: string }>().error).toContain("active tasks");
      expect(await app.repository.getEpisode(channel.channel_id, episode.episode_id)).toBeTruthy();
      expect(app.tasks.get(task.task_id)).toEqual(task);
    } finally {
      await app.close();
    }
  });
});
