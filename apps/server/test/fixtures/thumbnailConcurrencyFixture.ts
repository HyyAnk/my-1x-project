import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { QuizV2Schema } from "@studio/shared";
import { RepositoryService } from "../../src/repository.js";
import { StudioLogger } from "../../src/logger.js";
import { ContextEngine } from "../../src/context.js";
import { TaskManager } from "../../src/tasks.js";
import type { CodexAppServerClient } from "../../src/codex.js";
import { FakeCodex, registerTestRoot } from "../tasksTestUtils.js";

export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

export async function thumbnailConcurrencyFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "thumbnail-concurrency-"));
  registerTestRoot(root);
  const projectRoot = path.resolve(import.meta.dirname, "../../../..");
  const repository = new RepositoryService(projectRoot, root);
  await repository.ensureBootstrap();
  const channel = await repository.createChannel({ name: "Concurrent thumbnail", description: "Test" });
  await repository.saveTopicRun(channel.channel_id, [
    {
      topic_id: "topic-test",
      channel_id: channel.channel_id,
      content_kind: "episode",
      title: "Animal quiz",
      premise: "Animals",
      why_it_fits: "Quiz",
      hook: "Animal challenge",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    },
  ]);
  const episode = await repository.confirmTopic(channel.channel_id, "topic-test");
  const quizSource: unknown = JSON.parse(await readFile(path.join(import.meta.dirname, "remediation/quiz/quiz-v2.json"), "utf8"));
  const quiz = QuizV2Schema.parse(quizSource);
  await repository.writeQuiz(channel.channel_id, episode.episode_id, { ...quiz, episode_id: episode.episode_id });
  const imagePath = path.join(root, "provider.jpg");
  await sharp({ create: { width: 640, height: 360, channels: 3, background: "blue" } })
    .jpeg()
    .toFile(imagePath);
  const logger = new StudioLogger(root);
  await logger.init();
  const manager = new TaskManager(
    repository,
    new ContextEngine(repository, logger),
    new FakeCodex() as unknown as CodexAppServerClient,
    1,
    8,
    logger,
  );
  manager.updateImageFallbackConfig({ enabled: false });
  return {
    root,
    repository,
    channel,
    episode,
    imagePath,
    manager,
    exportOptions: { repository, channelId: channel.channel_id, episodeId: episode.episode_id },
  };
}
