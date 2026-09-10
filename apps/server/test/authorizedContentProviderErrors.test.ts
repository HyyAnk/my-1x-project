import { EventEmitter } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuizAssetPlan, Task } from "@studio/shared";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService, RepositoryError } from "../src/repository.js";
import { TaskManager } from "../src/tasks.js";
import { executeBundleImageTask } from "../src/tasks/imageRunner.js";
import { generateAssetWithProvider } from "../src/quiz/assets/resolvers/providerAssetResolver.js";
import { resolveQuizAssets } from "../src/quiz/assets/resolveQuizAssets.js";
import { Gpti2QuizImageProvider } from "../src/providers/gpti2Image.js";
import * as promptSanitizer from "../src/utils/promptSanitizer.js";

const roots: string[] = [];

class FakeLLMClient extends EventEmitter {
  connectCalled = 0;
  startThreadCalled = 0;
  startTurnCalled = 0;
  generateContentCalled = 0;

  async connect(): Promise<void> {
    this.connectCalled += 1;
    this.emit("status", "connected");
  }
  async startThread(): Promise<string> {
    this.startThreadCalled += 1;
    return "test-thread-id";
  }
  async startTurn(threadId: string, _prompt: string): Promise<string> {
    this.startTurnCalled += 1;
    const turnId = `turn-${this.startTurnCalled}`;
    setTimeout(() => {
      this.emit("notification", {
        method: "item/agentMessage/delta",
        params: { threadId, turnId, delta: "Rewritten generic prompt without Simba" },
      });
      this.emit("notification", {
        method: "turn/completed",
        params: { threadId, turnId, turn: { id: turnId, status: "completed" } },
      });
    }, 5);
    return turnId;
  }
  async generateContent(_prompt: string): Promise<{ text: string }> {
    this.generateContentCalled += 1;
    return { text: "Rewritten generic prompt without Simba" };
  }
  async interruptTurn(): Promise<void> {
    return undefined;
  }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })));
  vi.restoreAllMocks();
});

async function setupTestEnvironment() {
  const root = await mkdtemp(path.join(os.tmpdir(), "provider-errors-test-"));
  roots.push(root);

  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n\n## Visual Style\nCinematic\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

  const repository = new RepositoryService(root);
  const logger = new StudioLogger(root);
  await logger.init();

  const channel = await repository.createChannel({
    name: "Authorized Provider Test",
    description: "Testing provider error handling without prompt rewriting",
    target_audience: "General",
    language: "English",
    market: "US",
    dna_mode: "example",
  });

  const topics = [
    {
      topic_id: "topic_simba",
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: "Simba Story",
      premise: "Premise",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High" as const,
      generated_at: new Date().toISOString(),
      selected: false,
    },
  ];
  await repository.saveTopicRun(channel.channel_id, topics);
  const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);

  const visualBible = `# Episode Visual Bible\n\n## Continuity bundle CB-01 — Pride Rock\n\n- Era: Modern\n- Anchor-frame prompt: Simba standing on a bright rock\n- Reference asset slots: anchor\n`;
  await repository.saveEpisodeFile(channel.channel_id, episode.episode_id, "visual_bible.md", visualBible);

  return { root, repository, logger, channel, episode, visualBible };
}

describe("P3: Provider Errors Without Identity Rewrite", () => {
  describe("Observable Rejection Contract", () => {
    it("Workflow 1: Short-Reel Episode Workflow rejects terminal content filter error immediately without LLM rewrite or visual bible writeback", async () => {
      const { repository, logger, channel, episode, visualBible } = await setupTestEnvironment();
      const fakeCodex = new FakeLLMClient();
      const manager = new TaskManager(
        repository,
        new ContextEngine(repository, logger),
        fakeCodex as never,
        1,
        8,
        logger,
        undefined,
        undefined,
        { enabled: true, images_per_bundle: 1 },
      );
      await manager.load();

      const task = manager.submit("GENERATE_BUNDLE_IMAGE", channel.channel_id, episode.episode_id, 1);

      const originalPrompt = "Simba standing on a bright rock";
      const rejection = new RepositoryError("Prompt rejected by content filter", "IMAGE_CONTENT_FILTER_REJECTED");

      const generate = vi.fn().mockRejectedValue(rejection);
      vi.spyOn(manager, "createImageProvider").mockReturnValue({
        generateReference: generate,
      } as never);

      const rewrite =
        typeof (promptSanitizer as any).sanitizeImagePromptWithLLM === "function"
          ? vi.spyOn(promptSanitizer as any, "sanitizeImagePromptWithLLM")
          : null;
      const saveEpisodeFile = vi.spyOn(repository, "saveEpisodeFile");
      const recordImageUsage = vi.spyOn(repository, "recordImageUsage");

      const run = () =>
        manager.generateBundleImageWithSafetyRetry(
          task,
          { channelId: channel.channel_id, episodeId: episode.episode_id, bundleNumber: 1, variant: 0 },
          originalPrompt,
          undefined,
          undefined,
          visualBible,
        );

      await expect(run()).rejects.toBe(rejection);
      expect(generate).toHaveBeenCalledTimes(1);
      if (rewrite) {
        expect(rewrite).not.toHaveBeenCalled();
      }
      expect(fakeCodex.startTurnCalled).toBe(0);
      expect(fakeCodex.generateContentCalled).toBe(0);
      expect(saveEpisodeFile).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), "visual_bible.md", expect.anything());
      expect(recordImageUsage).not.toHaveBeenCalled();
    });

    it("Workflow 2: Quiz Asset Resolution rejects terminal content filter error immediately without LLM rewrite", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();
      const fakeAntigravity = new FakeLLMClient();

      const originalPrompt = "Simba standing on a bright rock";
      const rejection = new RepositoryError("Prompt rejected by content filter", "IMAGE_CONTENT_FILTER_REJECTED");

      const generate = vi.spyOn(Gpti2QuizImageProvider.prototype, "generateAsset").mockRejectedValue(rejection);

      const rewrite =
        typeof (promptSanitizer as any).sanitizeImagePromptWithLLM === "function"
          ? vi.spyOn(promptSanitizer as any, "sanitizeImagePromptWithLLM")
          : null;
      const recordImageUsage = vi.spyOn(repository, "recordImageUsage");

      const run = () =>
        generateAssetWithProvider({
          repository,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          request: {
            asset_id: "hero_q1",
            purpose: "hero_question_image",
            aspect_ratio: "16:9",
            subject: "Simba",
            consistency_group_id: null,
            question_id: "question-1",
          },
          fingerprint: "fp-simba-01",
          compiledPrompt: originalPrompt,
          configuredProvider: "gpti2",
          activeEngine: "antigravity",
          antigravityClient: fakeAntigravity as never,
          imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
          logger,
        });

      await expect(run()).rejects.toBe(rejection);
      expect(generate).toHaveBeenCalledTimes(1);
      if (rewrite) {
        expect(rewrite).not.toHaveBeenCalled();
      }
      expect(fakeAntigravity.startTurnCalled).toBe(0);
      expect(fakeAntigravity.generateContentCalled).toBe(0);
      expect(recordImageUsage).not.toHaveBeenCalled();
    });
  });

  describe("Required Boundary Cases", () => {
    it("Case 1: First-call success retains original subject in provider payload, returns saved asset, records 1 usage event", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();
      const originalPrompt = "Simba standing on a bright rock";

      const generate = vi.spyOn(Gpti2QuizImageProvider.prototype, "generateAsset").mockResolvedValue({
        path: "generated/simba.png",
        model: "gpt-image-2",
        price_vnd: 50,
      });
      const recordImageUsage = vi.spyOn(repository, "recordImageUsage");

      const result = await generateAssetWithProvider({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        request: {
          asset_id: "hero_q1",
          purpose: "hero_question_image",
          aspect_ratio: "16:9",
          subject: "Simba",
          consistency_group_id: null,
          question_id: "question-1",
        },
        fingerprint: "fp-simba-01",
        compiledPrompt: originalPrompt,
        configuredProvider: "gpti2",
        activeEngine: "codex",
        imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
        logger,
      });

      expect(generate).toHaveBeenCalledTimes(1);
      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Simba standing on a bright rock"),
        }),
      );
      expect(result.entry.path).toBe("generated/simba.png");
      expect(recordImageUsage).toHaveBeenCalledTimes(1);
      expect(recordImageUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          provider: "gpti2",
        }),
      );
    });

    it("Case 2: Terminal filter rejection runs 1 attempt, no rewrite, no changed prompt persisted, no usage record", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();
      const originalPrompt = "Simba standing on a bright rock";
      const rejection = new RepositoryError("Prompt rejected by content filter", "IMAGE_CONTENT_FILTER_REJECTED");

      const generate = vi.spyOn(Gpti2QuizImageProvider.prototype, "generateAsset").mockRejectedValue(rejection);
      const recordImageUsage = vi.spyOn(repository, "recordImageUsage");

      await expect(
        generateAssetWithProvider({
          repository,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          request: {
            asset_id: "hero_q1",
            purpose: "hero_question_image",
            aspect_ratio: "16:9",
            subject: "Simba",
            consistency_group_id: null,
            question_id: "question-1",
          },
          fingerprint: "fp-simba-01",
          compiledPrompt: originalPrompt,
          configuredProvider: "gpti2",
          activeEngine: "codex",
          imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
          logger,
        }),
      ).rejects.toBe(rejection);

      expect(generate).toHaveBeenCalledTimes(1);
      expect(recordImageUsage).not.toHaveBeenCalled();
    });

    it("Case 3: Timeout/transient failure then success respects bounded retry count and keeps original identity unchanged", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();
      const originalPrompt = "Simba standing on a bright rock";

      const transientError = new Error("Connection timeout");
      const successResult = { path: "generated/simba_retry.png", model: "gpt-image-2", price_vnd: 50 };

      const generate = vi
        .spyOn(Gpti2QuizImageProvider.prototype, "generateAsset")
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce(successResult);

      const recordImageUsage = vi.spyOn(repository, "recordImageUsage");

      const result = await generateAssetWithProvider({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        request: {
          asset_id: "hero_q1",
          purpose: "hero_question_image",
          aspect_ratio: "16:9",
          subject: "Simba",
          consistency_group_id: null,
          question_id: "question-1",
        },
        fingerprint: "fp-simba-01",
        compiledPrompt: originalPrompt,
        configuredProvider: "gpti2",
        activeEngine: "codex",
        imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
        logger,
      });

      expect(generate).toHaveBeenCalledTimes(2);
      expect(generate.mock.calls[0][0].prompt).toContain("Simba standing on a bright rock");
      expect(generate.mock.calls[1][0].prompt).toContain("Simba standing on a bright rock");
      expect(result.entry.path).toBe("generated/simba_retry.png");
      expect(recordImageUsage).toHaveBeenCalledTimes(1);
    });

    it("Case 4: Cancellation during request/backoff aborts and prevents later retry, save, or success event", async () => {
      const { repository, logger, channel, episode, visualBible } = await setupTestEnvironment();
      const manager = new TaskManager(repository, new ContextEngine(repository, logger), new FakeLLMClient() as never, 1, 8, logger);
      await manager.load();

      const task = manager.submit("GENERATE_BUNDLE_IMAGE", channel.channel_id, episode.episode_id, 1);
      const controller = new AbortController();

      const generate = vi.fn().mockImplementation((_prompt: string, signal?: AbortSignal) => {
        return new Promise((_resolve, reject) => {
          if (signal?.aborted) return reject(new Error("Aborted"));
          signal?.addEventListener("abort", () => reject(new Error("Aborted")));
        });
      });

      vi.spyOn(manager, "createImageProvider").mockReturnValue({
        generateReference: generate,
      } as never);

      const recordImageUsage = vi.spyOn(repository, "recordImageUsage");
      const attachBundleReference = vi.spyOn(repository, "attachBundleReference");

      const promise = manager.generateBundleImageWithSafetyRetry(
        task,
        { channelId: channel.channel_id, episodeId: episode.episode_id, bundleNumber: 1, variant: 0 },
        "Simba standing on a bright rock",
        controller.signal,
        undefined,
        visualBible,
      );

      // Abort in flight
      controller.abort();

      await expect(promise).rejects.toThrow(/Aborted/i);
      expect(recordImageUsage).not.toHaveBeenCalled();
      expect(attachBundleReference).not.toHaveBeenCalled();
    });

    it("Case 5: Late success after cancellation prevents completion from overwriting cancelled state", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();
      const manager = new TaskManager(
        repository,
        new ContextEngine(repository, logger),
        new FakeLLMClient() as never,
        1,
        8,
        logger,
        undefined,
        undefined,
        { enabled: true, images_per_bundle: 1 },
      );
      await manager.load();

      vi.spyOn(manager as never, "pump").mockResolvedValue(undefined as never);
      const task = manager.submit("GENERATE_BUNDLE_IMAGE", channel.channel_id, episode.episode_id, 1);

      let delayedResolve: (value: { image: { asset_path: string } }) => void;
      const delayedPromise = new Promise<{ image: { asset_path: string } }>((resolve) => {
        delayedResolve = resolve;
      });

      vi.spyOn(manager, "generateBundleImageWithSafetyRetry").mockReturnValue(delayedPromise);
      const attachBundleReference = vi.spyOn(repository, "attachBundleReference");

      const taskExecutionPromise = executeBundleImageTask.call(manager, task, {
        step: "test_image",
        progressMessage: "Generating image",
      });

      // Cancel the task while it's in flight
      manager.tasks.set(task.task_id, {
        ...manager.get(task.task_id),
        status: "CANCELLED",
      });

      // Late resolution arrives
      delayedResolve!({ image: { asset_path: "/tmp/late_asset.png" } });
      await taskExecutionPromise;

      // Lifecycle guard must prevent overwriting CANCELLED status
      expect(manager.get(task.task_id).status).toBe("CANCELLED");
      expect(attachBundleReference).not.toHaveBeenCalled();
    });

    it("Case 6: Partial parallel assets retains successful siblings, marks rejected item failed, and produces no all-complete marker", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();

      const plan: QuizAssetPlan = {
        schema_version: 2,
        episode_id: episode.episode_id,
        template_id: "candy_arcade",
        assets: [
          {
            asset_id: "hero_q1",
            purpose: "hero_question_image",
            aspect_ratio: "16:9",
            subject: "Simba",
            consistency_group_id: null,
            question_id: "question-1",
            semantic_key: "hero_simba",
            style: "photo_reference",
            transparent_background: false,
            required: true,
          },
          {
            asset_id: "hero_q2",
            purpose: "hero_question_image",
            aspect_ratio: "16:9",
            subject: "Scar",
            consistency_group_id: null,
            question_id: "question-2",
            semantic_key: "hero_scar",
            style: "photo_reference",
            transparent_background: false,
            required: true,
          },
        ],
        consistency_groups: [],
      };

      const writeQuizImageAsset = vi
        .spyOn(repository, "writeQuizImageAsset")
        .mockImplementation(async (_c, _e, assetId) => `/assets/${assetId}.png`);

      vi.spyOn(Gpti2QuizImageProvider.prototype, "generateAsset").mockImplementation(async (opts) => {
        if (opts.assetId === "hero_q1") {
          return { path: "/assets/hero_q1.png", model: "gpt-image-2", price_vnd: 50 };
        }
        throw new RepositoryError("Prompt rejected by content filter", "IMAGE_CONTENT_FILTER_REJECTED");
      });

      const result = await resolveQuizAssets({
        repository,
        channelId: channel.channel_id,
        episodeId: episode.episode_id,
        plan,
        imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
        logger,
      });

      // Sibling 1 succeeded and is retained
      const resolvedIds = result.resolution.assets.map((a) => a.asset_id);
      expect(resolvedIds).toContain("hero_q1");
      expect(resolvedIds).not.toContain("hero_q2");

      // Rejected sibling 2 recorded as blocker issue
      expect(result.issues.some((i) => i.code === "asset_generation_failed" && i.severity === "blocker")).toBe(true);

      // No all-complete marker (length is 1 out of 2)
      expect(result.resolution.assets.length).toBe(1);
    });

    it("Case 7: Unknown provider category preserves actual error without inventing copyright accusations", async () => {
      const { repository, logger, channel, episode } = await setupTestEnvironment();
      const originalPrompt = "Simba standing on a bright rock";

      const unknownError = new Error("500 Internal Server Error: Database cluster unresponsive");
      const generate = vi.spyOn(Gpti2QuizImageProvider.prototype, "generateAsset").mockRejectedValue(unknownError);

      await expect(
        generateAssetWithProvider({
          repository,
          channelId: channel.channel_id,
          episodeId: episode.episode_id,
          request: {
            asset_id: "hero_q1",
            purpose: "hero_question_image",
            aspect_ratio: "16:9",
            subject: "Simba",
            consistency_group_id: null,
            question_id: "question-1",
          },
          fingerprint: "fp-simba-01",
          compiledPrompt: originalPrompt,
          configuredProvider: "gpti2",
          activeEngine: "codex",
          imageConfig: { provider: "gpti2", api_key: "sk-test", model: "gpt-image-2" },
          logger,
        }),
      ).rejects.toThrow("500 Internal Server Error: Database cluster unresponsive");

      // Verify no rewritten copyright text was invented
      expect(generate.mock.calls[0][0].prompt).toContain("Simba standing on a bright rock");
      expect(generate.mock.calls[0][0].prompt).not.toContain("generic lion cub");
    });
  });
});
