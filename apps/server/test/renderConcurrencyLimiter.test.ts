import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskSchema, type Task } from "@studio/shared";
import {
  VideoRenderConcurrencyLimiter,
  resolveMaxConcurrentVideoRenders,
  videoRenderConcurrencyLimiter,
} from "../src/tasks/video/renderConcurrencyLimiter.js";
import { runVideoTask } from "../src/tasks/videoRunner.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

vi.mock("../src/tasks/video/videoCompositionPreparer.js", () => ({
  prepareVideoComposition: vi.fn(),
}));
vi.mock("../src/tasks/video/videoLayoutChecker.js", () => ({
  verifyAndCheckLayout: vi.fn().mockResolvedValue({ bypassed: false }),
}));
vi.mock("../src/tasks/video/videoRenderExecution.js", () => ({
  executeHyperframesRender: vi.fn().mockResolvedValue({ probe: {}, duration: 10 }),
}));
vi.mock("../src/tasks/video/renderManifestWriter.js", () => ({
  persistVideoRenderArtifacts: vi.fn().mockResolvedValue({ videoPath: "video.mp4", manifestPath: "manifest.json" }),
}));

import { prepareVideoComposition } from "../src/tasks/video/videoCompositionPreparer.js";

describe("VideoRenderConcurrencyLimiter", () => {
  beforeEach(() => {
    videoRenderConcurrencyLimiter.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    videoRenderConcurrencyLimiter.reset();
  });

  describe("Core Concurrency & Queue Management", () => {
    it("allows up to N tasks concurrently and queues the (N+1)th task", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(2);
      const release1 = await limiter.acquireSlot("task-1");
      const release2 = await limiter.acquireSlot("task-2");

      expect(limiter.getActiveCount()).toBe(2);
      expect(limiter.getQueueLength()).toBe(0);

      const queuePositions: number[] = [];
      let task3Resolved = false;
      const task3Promise = limiter
        .acquireSlot("task-3", (pos) => {
          queuePositions.push(pos);
        })
        .then((rel) => {
          task3Resolved = true;
          return rel;
        });

      expect(limiter.getActiveCount()).toBe(2);
      expect(limiter.getQueueLength()).toBe(1);
      expect(task3Resolved).toBe(false);
      expect(queuePositions).toEqual([1]);

      release1();
      const release3 = await task3Promise;
      expect(task3Resolved).toBe(true);
      expect(limiter.getActiveCount()).toBe(2);
      expect(limiter.getQueueLength()).toBe(0);

      release2();
      release3();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("progresses FIFO queue when slots release and updates waiting positions", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const release1 = await limiter.acquireSlot("task-1");

      const posTask2: number[] = [];
      const posTask3: number[] = [];
      const task2Promise = limiter.acquireSlot("task-2", (pos) => posTask2.push(pos));
      const task3Promise = limiter.acquireSlot("task-3", (pos) => posTask3.push(pos));

      expect(limiter.getQueueLength()).toBe(2);
      expect(posTask2).toEqual([1]);
      expect(posTask3).toEqual([2]);

      release1();
      const release2 = await task2Promise;
      expect(posTask3).toEqual([2, 1]);
      expect(limiter.getActiveCount()).toBe(1);
      expect(limiter.getQueueLength()).toBe(1);

      release2();
      const release3 = await task3Promise;
      expect(limiter.getActiveCount()).toBe(1);
      expect(limiter.getQueueLength()).toBe(0);

      release3();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("guarantees slot release when a task throws an error", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const release1 = await limiter.acquireSlot("task-1");

      let task2Acquired = false;
      const task2Promise = limiter.acquireSlot("task-2").then((rel) => {
        task2Acquired = true;
        return rel;
      });

      try {
        throw new Error("Render pipeline crashed");
      } catch {
        // Expected simulated crash
      } finally {
        release1();
      }

      const release2 = await task2Promise;
      expect(task2Acquired).toBe(true);
      expect(limiter.getActiveCount()).toBe(1);
      release2();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("cleans up cleanly when aborted while waiting in queue and updates positions", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const release1 = await limiter.acquireSlot("task-1");

      const controller2 = new AbortController();
      const posTask2: number[] = [];
      const posTask3: number[] = [];

      const task2Promise = limiter.acquireSlot("task-2", (pos) => posTask2.push(pos), controller2.signal);
      const task3Promise = limiter.acquireSlot("task-3", (pos) => posTask3.push(pos));

      expect(limiter.getQueueLength()).toBe(2);
      controller2.abort();

      await expect(task2Promise).rejects.toThrow("Video render cancelled");
      expect(limiter.getQueueLength()).toBe(1);
      expect(posTask3).toEqual([2, 1]);

      release1();
      const release3 = await task3Promise;
      expect(limiter.getActiveCount()).toBe(1);
      release3();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("rejects pre-aborted signal without modifying active or queued state", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const controller = new AbortController();
      controller.abort();

      await expect(limiter.acquireSlot("pre-aborted", undefined, controller.signal)).rejects.toThrow("Video render cancelled");
      expect(limiter.getActiveCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);
    });

    it("idempotently releases slots even on multiple calls", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const release = await limiter.acquireSlot("task-idempotent");
      expect(limiter.getActiveCount()).toBe(1);
      release();
      expect(limiter.getActiveCount()).toBe(0);
      release();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("drains queue when max concurrency dynamically increases", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const release1 = await limiter.acquireSlot("task-1");

      let task2Resolved = false;
      let task3Resolved = false;
      const task2Promise = limiter.acquireSlot("task-2").then((rel) => {
        task2Resolved = true;
        return rel;
      });
      const task3Promise = limiter.acquireSlot("task-3").then((rel) => {
        task3Resolved = true;
        return rel;
      });

      expect(limiter.getQueueLength()).toBe(2);
      limiter.setMaxConcurrency(3);

      const release2 = await task2Promise;
      const release3 = await task3Promise;
      expect(task2Resolved).toBe(true);
      expect(task3Resolved).toBe(true);
      expect(limiter.getActiveCount()).toBe(3);
      expect(limiter.getQueueLength()).toBe(0);

      release1();
      release2();
      release3();
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("resolves max concurrency from environment variable", () => {
      const originalEnv = process.env.MAX_CONCURRENT_VIDEO_RENDERS;
      try {
        process.env.MAX_CONCURRENT_VIDEO_RENDERS = "4";
        expect(resolveMaxConcurrentVideoRenders(1)).toBe(4);
        delete process.env.MAX_CONCURRENT_VIDEO_RENDERS;
        expect(resolveMaxConcurrentVideoRenders(2)).toBe(2);
        expect(resolveMaxConcurrentVideoRenders()).toBe(1);
      } finally {
        if (originalEnv !== undefined) {
          process.env.MAX_CONCURRENT_VIDEO_RENDERS = originalEnv;
        } else {
          delete process.env.MAX_CONCURRENT_VIDEO_RENDERS;
        }
      }
    });

    it("reset rejects waiting tasks and clears active slots", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      await limiter.acquireSlot("task-1");
      const waitingPromise = limiter.acquireSlot("task-2");

      expect(limiter.getActiveCount()).toBe(1);
      expect(limiter.getQueueLength()).toBe(1);

      limiter.reset();
      expect(limiter.getActiveCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);

      await expect(waitingPromise).rejects.toThrow("Video render concurrency limiter reset");
    });
  });

  describe("runVideoTask Integration Lifecycle", () => {
    function createMockRuntime(limiter: VideoRenderConcurrencyLimiter) {
      const tasks = new Map<string, Task>();
      const activeVideoControllers = new Map<string, AbortController>();
      const updates: Array<{ taskId: string; patch: Partial<Task> }> = [];

      const runtime = {
        videoRenderLimiter: limiter,
        activeVideoControllers,
        videoConfig: { aspect_ratio: "16:9", max_concurrent_tasks: 1, fps: 30 },
        repository: {
          getEpisode: vi.fn().mockResolvedValue({
            episode_id: "ep-1",
            narration_asset_path: "narration.wav",
            quiz_config: { render_aspect_ratio: "16:9" },
          }),
          getChannel: vi.fn().mockResolvedValue({ channel_id: "ch-1" }),
          readScenes: vi.fn().mockResolvedValue([{ scene_id: "s1" }]),
          readQuiz: vi.fn().mockResolvedValue({ questions: [] }),
          appendQuestionHistory: vi.fn().mockResolvedValue(undefined),
          removeQuestionHistoryEntries: vi.fn().mockResolvedValue(undefined),
          rootDirectory: "/test/root",
        },
        hasValidNarrationAsset: vi.fn().mockResolvedValue(true),
        get: (taskId: string) => {
          const t = tasks.get(taskId);
          if (!t) throw new Error("Task not found");
          return t;
        },
        update: (taskId: string, patch: Partial<Task>) => {
          const current = tasks.get(taskId)!;
          const updated = TaskSchema.parse({ ...current, ...patch });
          tasks.set(taskId, updated);
          updates.push({ taskId, patch });
          return Promise.resolve();
        },
        finish: (taskId: string, status: Task["status"], error: string | null) => {
          const current = tasks.get(taskId)!;
          tasks.set(taskId, TaskSchema.parse({ ...current, status, error }));
          return Promise.resolve();
        },
        logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
      } as unknown as TaskManagerRuntime;

      return { runtime, tasks, updates, activeVideoControllers };
    }

    it("gates concurrent video tasks, shows queue progress, and releases slot sequentially", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const { runtime, tasks, updates } = createMockRuntime(limiter);

      const task1 = TaskSchema.parse({
        task_id: "task-video-1",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch-1",
        episode_id: "ep-1",
        status: "QUEUED",
        created_at: "2026-09-01T00:00:00.000Z",
        lock_key: "ep-1",
      });
      const task2 = TaskSchema.parse({
        task_id: "task-video-2",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch-2",
        episode_id: "ep-2",
        status: "QUEUED",
        created_at: "2026-09-01T00:00:01.000Z",
        lock_key: "ep-2",
      });

      tasks.set(task1.task_id, task1);
      tasks.set(task2.task_id, task2);

      let resolveComp1!: () => void;
      const comp1Promise = new Promise<void>((resolve) => {
        resolveComp1 = resolve;
      });

      const mockedPrep = vi.mocked(prepareVideoComposition);
      mockedPrep.mockImplementation(async (args: any) => {
        if (args.taskId === "task-video-1") {
          await comp1Promise;
        }
        return {
          renderRoot: "/tmp/render",
          outputPath: "/tmp/out.mp4",
          checkpointPath: "/tmp/check",
          sourceFingerprint: "fp",
          html: "<html></html>",
        } as any;
      });

      const p1 = runVideoTask.call(runtime, task1);
      // Wait for task 1 to acquire slot and reach composition
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(limiter.getActiveCount()).toBe(1);

      const p2 = runVideoTask.call(runtime, task2);
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(limiter.getQueueLength()).toBe(1);
      const task2Current = runtime.get(task2.task_id);
      expect(task2Current.queue_position).toBe(1);
      expect(task2Current.progress_message).toBe("Queued · Waiting for available render slot (position 1)");

      // Resolve task 1
      resolveComp1();
      await p1;
      expect(runtime.get(task1.task_id).status).toBe("COMPLETED");

      // Task 2 should now acquire slot and complete
      await p2;
      expect(runtime.get(task2.task_id).status).toBe("COMPLETED");
      expect(limiter.getActiveCount()).toBe(0);
      expect(limiter.getQueueLength()).toBe(0);
    });

    it("releases slot and transitions to CANCELLED when cancelled while waiting in queue", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const { runtime, tasks, activeVideoControllers } = createMockRuntime(limiter);

      const task1 = TaskSchema.parse({
        task_id: "task-v1",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch-1",
        episode_id: "ep-1",
        status: "QUEUED",
        created_at: "2026-09-01T00:00:00.000Z",
        lock_key: "ep-1",
      });
      const task2 = TaskSchema.parse({
        task_id: "task-v2",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch-2",
        episode_id: "ep-2",
        status: "QUEUED",
        created_at: "2026-09-01T00:00:01.000Z",
        lock_key: "ep-2",
      });
      tasks.set(task1.task_id, task1);
      tasks.set(task2.task_id, task2);

      let resolveComp1!: () => void;
      const comp1Promise = new Promise<void>((resolve) => {
        resolveComp1 = resolve;
      });

      const mockedPrep = vi.mocked(prepareVideoComposition);
      mockedPrep.mockImplementation(async (args: any) => {
        if (args.taskId === "task-v1") await comp1Promise;
        return { renderRoot: "/tmp/r", outputPath: "/tmp/o.mp4" } as any;
      });

      const p1 = runVideoTask.call(runtime, task1);
      await new Promise((resolve) => setTimeout(resolve, 30));

      const p2 = runVideoTask.call(runtime, task2);
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(limiter.getQueueLength()).toBe(1);

      // Abort task 2 while queued
      activeVideoControllers.get("task-v2")?.abort();
      await p2;

      expect(runtime.get("task-v2").status).toBe("CANCELLED");
      expect(limiter.getQueueLength()).toBe(0);

      resolveComp1();
      await p1;
      expect(runtime.get("task-v1").status).toBe("COMPLETED");
      expect(limiter.getActiveCount()).toBe(0);
    });

    it("releases slot when composition throws an error so subsequent tasks can run", async () => {
      const limiter = new VideoRenderConcurrencyLimiter(1);
      const { runtime, tasks } = createMockRuntime(limiter);

      const task1 = TaskSchema.parse({
        task_id: "task-err-1",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch-1",
        episode_id: "ep-1",
        status: "QUEUED",
        created_at: "2026-09-01T00:00:00.000Z",
        lock_key: "ep-1",
      });
      const task2 = TaskSchema.parse({
        task_id: "task-err-2",
        task_type: "GENERATE_VIDEO",
        channel_id: "ch-2",
        episode_id: "ep-2",
        status: "QUEUED",
        created_at: "2026-09-01T00:00:01.000Z",
        lock_key: "ep-2",
      });
      tasks.set(task1.task_id, task1);
      tasks.set(task2.task_id, task2);

      const mockedPrep = vi.mocked(prepareVideoComposition);
      mockedPrep.mockImplementation(async (args: any) => {
        if (args.taskId === "task-err-1") {
          throw new Error("Chromium OOM crash simulated");
        }
        return { renderRoot: "/tmp/r", outputPath: "/tmp/o.mp4" } as any;
      });

      await runVideoTask.call(runtime, task1);
      expect(runtime.get("task-err-1").status).toBe("FAILED");
      expect(limiter.getActiveCount()).toBe(0);

      await runVideoTask.call(runtime, task2);
      expect(runtime.get("task-err-2").status).toBe("COMPLETED");
      expect(limiter.getActiveCount()).toBe(0);
    });
  });
});
