import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { releaseWriterAdmission } from "../src/repository/shortReelStorage.js";

const roots: string[] = [];

afterEach(async () => {
  const currentRoots = roots.splice(0);
  for (const root of currentRoots) {
    await releaseWriterAdmission(root).catch(() => {});
  }
  await Promise.all(
    currentRoots.map((root) => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {})),
  );
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "tasks-batch-title-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8"),
  ]);

  const app = await buildApp(root);
  const channel = await app.repository.createChannel({
    name: "Tech Science Channel",
    description: "Science and trivia channel",
    target_audience: "Everyone",
    language: "English",
    market: "Global",
    dna_mode: "example",
  });

  await app.repository.saveTopicRun(channel.channel_id, [
    {
      topic_id: "topic-bt-1",
      channel_id: channel.channel_id,
      content_kind: "episode",
      title: "The Speed of Light Explained",
      premise: "Exploring photons",
      why_it_fits: "Great educational topic",
      hook: "How fast is fast?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    },
    {
      topic_id: "topic-bt-2",
      channel_id: channel.channel_id,
      content_kind: "episode",
      title: "Quantum Mechanics for Beginners",
      premise: "Wave-particle duality",
      why_it_fits: "Deep exploration",
      hook: "Can particles exist in two places at once?",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    },
  ]);

  const ep1 = await app.repository.confirmTopic(channel.channel_id, "topic-bt-1");
  const ep2 = await app.repository.confirmTopic(channel.channel_id, "topic-bt-2");

  return { app, channel, ep1, ep2 };
}

describe("Batch Episode Title Lookup & Task Integration (Stage 6)", () => {
  it("resolves titles in O(1) time without scanning channel episode folders when indexed", async () => {
    const { app, ep1, ep2 } = await fixture();
    try {
      // Episodes were confirmed and thus indexed into entityIdResolver
      const listEpisodesSpy = vi.spyOn(app.repository, "listEpisodes");

      const titles = await app.repository.resolveEpisodeTitles([ep1.episode_id, ep2.episode_id]);

      expect(titles[ep1.episode_id]).toBe("The Speed of Light Explained");
      expect(titles[ep2.episode_id]).toBe("Quantum Mechanics for Beginners");

      // Verifies O(1) direct resolution without any directory listing
      expect(listEpisodesSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("handles unknown and missing IDs gracefully without errors", async () => {
    const { app, ep1 } = await fixture();
    try {
      const titles = await app.repository.resolveEpisodeTitles([ep1.episode_id, "non-existent-episode-id", "another-fake-id"]);

      expect(titles[ep1.episode_id]).toBe("The Speed of Light Explained");
      expect(titles["non-existent-episode-id"]).toBeUndefined();
      expect(titles["another-fake-id"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("returns an empty map when an empty array of IDs is supplied", async () => {
    const { app } = await fixture();
    try {
      const titles = await app.repository.resolveEpisodeTitles([]);
      expect(titles).toEqual({});
    } finally {
      await app.close();
    }
  });

  it("supports GET /api/episodes/titles with query parameters", async () => {
    const { app, ep1, ep2 } = await fixture();
    try {
      const response = await app.server.inject({
        method: "GET",
        url: `/api/episodes/titles?ids=${ep1.episode_id},${ep2.episode_id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json<{ titles: Record<string, string> }>();
      expect(data.titles[ep1.episode_id]).toBe("The Speed of Light Explained");
      expect(data.titles[ep2.episode_id]).toBe("Quantum Mechanics for Beginners");
    } finally {
      await app.close();
    }
  });

  it("supports POST /api/episodes/batch-titles with JSON body", async () => {
    const { app, ep1, ep2 } = await fixture();
    try {
      const response = await app.server.inject({
        method: "POST",
        url: "/api/episodes/batch-titles",
        payload: {
          episode_ids: [ep1.episode_id, ep2.episode_id, "unknown-ep"],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json<{ titles: Record<string, string> }>();
      expect(data.titles[ep1.episode_id]).toBe("The Speed of Light Explained");
      expect(data.titles[ep2.episode_id]).toBe("Quantum Mechanics for Beginners");
      expect(data.titles["unknown-ep"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("populates index on cold start and resolves titles reliably", async () => {
    const { app, channel, ep1 } = await fixture();
    try {
      // Clear cache to simulate cold start
      app.repository.entityIdResolver.clear();
      expect(app.repository.entityIdResolver.getEpisodeTitle(ep1.episode_id)).toBeUndefined();

      const titles = await app.repository.resolveEpisodeTitles([ep1.episode_id]);
      expect(titles[ep1.episode_id]).toBe("The Speed of Light Explained");

      // Subsequent lookup should now be in cache
      expect(app.repository.entityIdResolver.getEpisodeTitle(ep1.episode_id)).toBe("The Speed of Light Explained");
      expect(app.repository.entityIdResolver.getEpisodeSlug(channel.channel_id, ep1.episode_id)).toBe(ep1.slug);
    } finally {
      await app.close();
    }
  });

  it("preserves zero regressions on tasks endpoints and attaches episode_title when available", async () => {
    const { app, channel, ep1 } = await fixture();
    try {
      // 1. Submit a task for the episode
      const createRes = await app.server.inject({
        method: "POST",
        url: "/api/tasks",
        payload: {
          task_type: "GENERATE_PIPELINE",
          channel_id: channel.channel_id,
          episode_id: ep1.episode_id,
        },
      });

      expect(createRes.statusCode).toBe(202);
      const createdTask = createRes.json<{ task: { task_id: string; episode_title?: string; episode_id: string } }>().task;
      expect(createdTask.task_id).toBeDefined();
      expect(createdTask.episode_id).toBe(ep1.episode_id);
      expect(createdTask.episode_title).toBe("The Speed of Light Explained");

      // 2. List tasks
      const listRes = await app.server.inject({
        method: "GET",
        url: "/api/tasks",
      });

      expect(listRes.statusCode).toBe(200);
      const tasksList = listRes.json<{ tasks: Array<{ task_id: string; episode_title?: string }> }>().tasks;
      const found = tasksList.find((t) => t.task_id === createdTask.task_id);
      expect(found).toBeDefined();
      expect(found?.episode_title).toBe("The Speed of Light Explained");

      // 3. Cancel task
      const cancelRes = await app.server.inject({
        method: "POST",
        url: `/api/tasks/${createdTask.task_id}/cancel`,
      });
      expect(cancelRes.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
