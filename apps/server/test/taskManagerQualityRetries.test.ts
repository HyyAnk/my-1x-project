import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository.js";
import { TaskManager } from "../src/tasks.js";
import { FakeCodex, registerTestRoot, waitFor } from "./tasksTestUtils.js";

describe("TaskManager locks", { timeout: 20000 }, () => {
  it("retries a visual bible when continuity bundles are missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-visual-bible-retry-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Visual Retry",
      description: "",
      target_audience: "",
      language: "English",
      market: "",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `visual_retry_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Visual Retry ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
    await repository.saveEpisodeFile(channel.channel_id, episode.episode_id, "research.md", "# Research Dossier\n\nC01 verified");
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "treatment.md",
      "# Treatment\n\n## Sequence 1\nTime budget and claim C01",
    );
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "script.md",
      "# Visual Retry 0\n\n<!-- HUMOR_POLICY: v1 -->\n\n1956 C01 evidence.",
    );
    const logger = new StudioLogger(root, true);
    await logger.init();
    const fake = new FakeCodex();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), fake as never, 1, 8, logger);
    await manager.load();
    const task = manager.submit("GENERATE_VISUAL_BIBLE", channel.channel_id, episode.episode_id);
    await waitFor(() => manager.get(task.task_id).status === "COMPLETED");
    const visualBible = await repository.getEpisodeFile(channel.channel_id, episode.episode_id, "visual_bible.md");
    expect(visualBible.content).toContain("## Continuity bundle CB-05");
    expect(manager.get(task.task_id).progress_message).toBe("Completed");
  });

  it("retries a Quiz visual bible when safe motion is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-visual-bible-policy-retry-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Quiz Visual Retry",
      description: "",
      target_audience: "Children",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `quiz_visual_retry_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Quiz Visual Retry ${index}`,
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
      "# Treatment\n\n## Question 1\nTime budget and correct answer",
    );
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "script.md",
      "# Quiz Visual Retry 0\n\n<!-- HUMOR_POLICY: v1 -->\n\n## Question 1\nGuess, answer, and explanation.",
    );
    const logger = new StudioLogger(root, true);
    await logger.init();
    const fake = new FakeCodex();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), fake as never, 1, 8, logger);
    await manager.load();

    const task = manager.submit("GENERATE_VISUAL_BIBLE", channel.channel_id, episode.episode_id);
    await waitFor(() => manager.get(task.task_id).status === "COMPLETED");

    const visualBible = await repository.getEpisodeFile(channel.channel_id, episode.episode_id, "visual_bible.md");
    expect(visualBible.content.toLowerCase()).toContain("safe motion");
    expect(manager.get(task.task_id).progress_message).toBe("Completed");
  });

  it("retries a sequence shot plan when prompt structure or continuity metadata is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-shot-plan-retry-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Shot Plan Retry",
      description: "",
      target_audience: "Viewers",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `shot_retry_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Shot Retry ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
    await repository.saveEpisodeFile(channel.channel_id, episode.episode_id, "research.md", "# Research Dossier\n\nC01 verified");
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "treatment.md",
      "# Treatment\n\n## Sequence 1 — Opening\n\nTime budget: 8 seconds. Claim IDs: C01.",
    );
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "script.md",
      "# Shot Plan Retry\n\n## Sequence 1 — Opening\n\nOpening narration.",
    );
    await repository.saveEpisodeFile(
      channel.channel_id,
      episode.episode_id,
      "visual_bible.md",
      "# Episode Visual Bible\n\n## Continuity bundle CB-01 — Opening\n\n- Palette: Warm\n- Lighting: Soft\n- Anchor-frame prompt: A coherent opening.\n- Reference asset slots: anchor",
    );
    const logger = new StudioLogger(root, true);
    await logger.init();
    const fake = new FakeCodex();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), fake as never, 1, 8, logger);
    await manager.load();

    const task = manager.submit("GENERATE_SEQUENCE_SCENES", channel.channel_id, episode.episode_id, 1);
    await waitFor(() => manager.get(task.task_id).status === "COMPLETED");

    const scenes = await repository.readScenes(channel.channel_id, episode.episode_id);
    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0].visual_prompt).toContain("CAMERA");
    expect(scenes[0].continuity_bundle_id).toBe("cb-01");
    expect(scenes[0].continuity_note).toContain("CB-01");
    expect(manager.get(task.task_id).progress_message).toBe("Completed");
    expect(
      fake.prompts.some((prompt) => prompt.includes("EXACT NARRATION TO COVER VERBATIM") && prompt.includes("Opening narration.")),
    ).toBe(true);
  });

  it("retries quiz research when a question claim is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-research-retry-"));
    registerTestRoot(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "shared"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
    await writeFile(path.join(root, "shared", "research_rules.md"), "# Research\n", "utf8");
    const repository = new RepositoryService(root);
    const channel = await repository.createChannel({
      name: "Quiz Research Retry",
      description: "",
      target_audience: "Children",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `quiz_research_topic_${index}`,
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: `Quiz Research ${index}`,
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      quiz_format: "multiple_choice" as const,
      question_count: 15,
      age_band: "10-12" as const,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
    const logger = new StudioLogger(root, true);
    await logger.init();
    const fake = new FakeCodex();
    const manager = new TaskManager(repository, new ContextEngine(repository, logger), fake as never, 1, 8, logger);
    await manager.load();

    const task = manager.submit("GENERATE_RESEARCH", channel.channel_id, episode.episode_id);
    await waitFor(() => manager.get(task.task_id).status === "COMPLETED");

    const research = await repository.getEpisodeFile(channel.channel_id, episode.episode_id, "research.md");
    expect(research.content).toContain("C15");
    expect(manager.get(task.task_id).progress_message).toBe("Completed");
  });
});
