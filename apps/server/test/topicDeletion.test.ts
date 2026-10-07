import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createStubQuizLlmClient } from "./helpers/stubQuizLlmClient.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})),
  );
});

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-topic-delete-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  return root;
}

describe("topic deletion", () => {
  it("deletes a single topic candidate via repository and API", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });
    try {
      const channel = await app.repository.createChannel({
        name: "Delete topic test",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });

      const topics = [
        {
          topic_id: "topic-to-delete",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          origin: "discovery" as const,
          title: "Topic To Delete",
          premise: "Premise 1",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
          question_count: 5,
        },
        {
          topic_id: "topic-to-keep",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          origin: "discovery" as const,
          title: "Topic To Keep",
          premise: "Premise 2",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: new Date().toISOString(),
          selected: false,
          question_count: 5,
        },
      ];
      await app.repository.saveTopicRun(channel.channel_id, topics);

      const beforeList = await app.repository.listTopics(channel.channel_id);
      expect(beforeList).toHaveLength(2);

      const deleteRes = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}/topics/topic-to-delete`,
      });
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.json<{ ok: boolean; topic_id: string }>()?.topic_id).toBe("topic-to-delete");

      const afterList = await app.repository.listTopics(channel.channel_id);
      expect(afterList).toHaveLength(1);
      expect(afterList[0].topic_id).toBe("topic-to-keep");

      // Deleting already deleted topic returns 404
      const secondDelete = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}/topics/topic-to-delete`,
      });
      expect(secondDelete.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("clears older topic history while preserving latest run candidates", async () => {
    const root = await createTestRoot();
    const app = await buildApp(root, { llmClient: createStubQuizLlmClient() });
    try {
      const channel = await app.repository.createChannel({
        name: "Clear history test",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });

      // Older run 1: unselected topic
      await app.repository.saveTopicRun(channel.channel_id, [
        {
          topic_id: "older-unselected-1",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          origin: "discovery" as const,
          title: "Older Unselected 1",
          premise: "Premise",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: "2026-09-01T10:00:00.000Z",
          selected: false,
          question_count: 5,
        },
      ]);

      // Small delay to ensure timestamp separation in file names
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Older run 2: selected topic + unselected topic
      await app.repository.saveTopicRun(channel.channel_id, [
        {
          topic_id: "older-selected-2",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          origin: "discovery" as const,
          title: "Older Selected 2",
          premise: "Premise",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: "2026-09-02T10:00:00.000Z",
          selected: true,
          question_count: 5,
        },
        {
          topic_id: "older-unselected-2",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          origin: "discovery" as const,
          title: "Older Unselected 2",
          premise: "Premise",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: "2026-09-02T10:00:00.000Z",
          selected: false,
          question_count: 5,
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Latest run: active candidates
      await app.repository.saveTopicRun(channel.channel_id, [
        {
          topic_id: "latest-candidate-1",
          channel_id: channel.channel_id,
          content_kind: "episode" as const,
          origin: "discovery" as const,
          title: "Latest Candidate 1",
          premise: "Premise",
          why_it_fits: "Fits",
          hook: "Hook",
          estimated_potential: "High",
          generated_at: "2026-09-03T10:00:00.000Z",
          selected: false,
          question_count: 5,
        },
      ]);

      const initialTopics = await app.repository.listTopics(channel.channel_id);
      expect(initialTopics).toHaveLength(4);

      // Clear with unselected_only=true
      const clearRes = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}/topics/history?unselected_only=true`,
      });
      expect(clearRes.statusCode).toBe(200);
      const clearBody = clearRes.json<{ ok: boolean; deleted_count: number }>();
      expect(clearBody.deleted_count).toBe(2);

      const remainingTopics = await app.repository.listTopics(channel.channel_id);
      expect(remainingTopics).toHaveLength(2);
      const remainingIds = remainingTopics.map((t) => t.topic_id);
      expect(remainingIds).toContain("latest-candidate-1");
      expect(remainingIds).toContain("older-selected-2");
      expect(remainingIds).not.toContain("older-unselected-1");
      expect(remainingIds).not.toContain("older-unselected-2");

      // Now clear with unselected_only=false to wipe all remaining older history
      const clearAllRes = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${channel.channel_id}/topics/history?unselected_only=false`,
      });
      expect(clearAllRes.statusCode).toBe(200);
      expect(clearAllRes.json<{ ok: boolean; deleted_count: number }>()?.deleted_count).toBe(1);

      const finalTopics = await app.repository.listTopics(channel.channel_id);
      expect(finalTopics).toHaveLength(1);
      expect(finalTopics[0].topic_id).toBe("latest-candidate-1");
    } finally {
      await app.close();
    }
  });
});
