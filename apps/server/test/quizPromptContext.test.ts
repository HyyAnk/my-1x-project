import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";

const roots: string[] = [];
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function quizPromptFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-active-rules-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await mkdir(path.join(root, "shared"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  await Promise.all(
    ["treatment_rules.md", "script_rules.md"].map((filename) =>
      copyFile(path.join(repositoryRoot, "shared", filename), path.join(root, "shared", filename)),
    ),
  );

  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Active Rules",
    description: "Quiz prompt fixture",
    target_audience: "Children",
    language: "English",
    market: "Global",
    dna_mode: "example",
  });
  const topic = {
    topic_id: "active_rules_topic",
    channel_id: channel.channel_id,
    title: "Planet Quiz",
    premise: "Evidence-backed questions",
    why_it_fits: "Clear Quiz format",
    hook: "Guess the planet",
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
  };
  await repository.saveTopicRun(channel.channel_id, [
    topic,
    ...Array.from({ length: 4 }, (_, index) => ({
      ...topic,
      topic_id: `active_rules_topic_${index + 2}`,
      title: `Planet Quiz ${index + 2}`,
    })),
  ]);
  const episode = await repository.confirmTopic(channel.channel_id, topic.topic_id);
  await repository.saveEpisodeFile(channel.channel_id, episode.episode_id, "research.md", "# Research\n\nC01 has evidence");
  await repository.saveEpisodeFile(channel.channel_id, episode.episode_id, "treatment.md", "# Treatment\n\n## Question 1 — Mars\n");
  const logger = new StudioLogger(root, true);
  await logger.init();
  return { channel, episode, engine: new ContextEngine(repository, logger) };
}

describe("active Quiz treatment and script contexts", () => {
  it("assembles only exact question-block semantics without narrative contracts", async () => {
    const { channel, episode, engine } = await quizPromptFixture();
    const prompts = await Promise.all(
      (["GENERATE_TREATMENT", "GENERATE_SCRIPT"] as const).map(
        async (taskType) => (await engine.build(taskType, channel.channel_id, episode.episode_id)).prompt,
      ),
    );

    for (const prompt of prompts) {
      expect(prompt).toContain("exactly 8 question blocks");
      expect(prompt).toContain("evidence-linked");
      expect(prompt).toContain("Think/reveal timing");
      expect(prompt).toContain("Claim IDs");
      expect(prompt).not.toMatch(/6[–-]10 (?:narrative )?sequences/i);
      expect(prompt).not.toMatch(/cold open/i);
      expect(prompt).not.toMatch(/turning point/i);
      expect(prompt).not.toMatch(/consequence|replacement/i);
      expect(prompt).not.toMatch(/target word count|calibrated word target/i);
      expect(prompt).not.toMatch(/dated events|named actors/i);
      expect(prompt).not.toMatch(/story progression|change the viewer's understanding/i);
    }
    expect(prompts[1]).toContain("Fold the welcome into Question 1");
  });
});
