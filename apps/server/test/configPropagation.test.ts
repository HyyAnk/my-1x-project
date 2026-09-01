import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("route config propagation", () => {
  it("uses video settings saved by the settings plugin in the episodes plugin", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "route-config-propagation-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);
    const app = await buildApp(root);
    try {
      const channel = await app.repository.createChannel({
        name: "Config propagation",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });
      const topics = Array.from({ length: 5 }, (_, index) => ({
        topic_id: `config-topic-${index}`,
        channel_id: channel.channel_id,
        title: `Config topic ${index}`,
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
      await app.repository.saveTopicRun(channel.channel_id, topics);
      const episode = await app.repository.confirmTopic(channel.channel_id, topics[0].topic_id);

      const saved = await app.server.inject({
        method: "POST",
        url: "/api/video/settings",
        payload: { narration_words_per_second: 4, aspect_ratio: "9:16" },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json<{ video_generation: { aspect_ratio: string } }>().video_generation.aspect_ratio).toBe("9:16");

      const updated = await app.server.inject({
        method: "PATCH",
        url: `/api/channels/${channel.channel_id}/episodes/${episode.episode_id}`,
        payload: { target_duration_minutes: 3 },
      });
      expect(updated.statusCode).toBe(200);
      expect(updated.json<{ target_word_count: number }>().target_word_count).toBe(684);
    } finally {
      await app.close();
    }
  });
});
