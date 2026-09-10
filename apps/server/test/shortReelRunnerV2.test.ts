import { describe, expect, it, vi } from "vitest";
import type { GenerateShortReelRequest, ReelKey, ReelStageProgress, Task } from "@studio/shared";
import { runShortReelTask, isShortReelTask } from "../src/tasks/shortReelRunner.js";
import { createUpgradeFixture } from "./helpers/shortReelUpgradeFixture.js";
import { repairScript, repairSource } from "./helpers/shortReelRepairFixture.js";
import { createTestImageBuffer, createTestRoot, buildTestApp, createTestReel } from "./shortReelRoutesTestUtils.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";
import type { PortraitImageClient } from "../src/providers/imageGeneration/imageGeneration.types.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: "test-short-reel-task-1",
    task_type: "GENERATE_SHORT_REEL_PACKAGE",
    channel_id: "test-channel",
    episode_id: null,
    reel_id: "test-reel",
    status: "QUEUED",
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    lock_key: "test-reel:reel",
    progress_message: null,
    progress_percent: null,
    output_files: [],
    error: null,
    short_reel_request: {
      expected_revision: 1,
      request_id: "req-runner-test",
      target: "package",
      mode: "repair",
    },
    ...overrides,
  };
}

describe("Short-Reel Task Runner V2 (shortReelRunner.ts)", () => {
  it("detects short reel tasks correctly", () => {
    const reelTask = createMockTask();
    expect(isShortReelTask(reelTask)).toBe(true);

    const legacyTask = createMockTask({ task_type: "GENERATE_SHORT_REEL" as any });
    expect(isShortReelTask(legacyTask)).toBe(true);

    const pipelineTask = createMockTask({ task_type: "GENERATE_PIPELINE" });
    expect(isShortReelTask(pipelineTask)).toBe(false);
  });

  it("runs full package generation, persists structured stage progress, and completes", async () => {
    const f = await createUpgradeFixture();
    const validImageBytes = await createTestImageBuffer(1080, 1920, { r: 10, g: 20, b: 30 });

    const updates: Partial<Task>[] = [];
    let finishedStatus: string | null = null;
    let finishedError: string | null = null;

    const task = createMockTask({
      channel_id: f.key.channel_id,
      reel_id: f.key.reel_id,
      short_reel_request: {
        expected_revision: f.snapshot.revision,
        request_id: "pkg-runner-req",
        target: "package",
        mode: "repair",
      },
    });

    const mockLlm: LLMClient = {
      connect: async () => {},
      generateContent: async (prompt: string) => {
        const p = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
        if (p.includes("publishing") || p.includes("copywriter")) {
          return {
            text: JSON.stringify({
              title: "Runner Verified Title",
              description: "Runner verified publishing copy #tag",
            }),
          };
        }
        return { text: JSON.stringify(repairScript()) };
      },
    };

    const mockImageClient: PortraitImageClient = {
      supportsReferenceImage: true,
      generate: async () => ({
        bytes: validImageBytes,
        provider: "test-provider",
        model: "test-model",
      }),
    };

    const runtimeMock: Partial<TaskManagerRuntime> = {
      repository: f.repo,
      activeShortReelControllers: new Map(),
      shortReelTargets: new Map(),
      imageConfig: {} as any,
      activeEngine: "codex",
      codex: mockLlm as any,
      get: () => task,
      update: async (_id, patch) => {
        updates.push(patch);
      },
      finish: async (_id, status, error) => {
        finishedStatus = status;
        finishedError = error;
      },
    };
    (runtimeMock as any).portraitImageClient = mockImageClient;

    await runShortReelTask(runtimeMock as TaskManagerRuntime, task);

    expect(finishedStatus).toBe("COMPLETED");
    expect(finishedError).toBeNull();
    expect(runtimeMock.activeShortReelControllers?.has(task.task_id)).toBe(false);

    // Assert that structured stage progress was updated with progress_percent === null
    const progressUpdates = updates.filter((u) => u.short_reel_progress);
    expect(progressUpdates.length).toBeGreaterThan(0);

    for (const update of progressUpdates) {
      expect(update.progress_percent).toBeNull();
      expect(update.short_reel_progress?.stages).toBeDefined();
    }

    const finalProgress = progressUpdates[progressUpdates.length - 1].short_reel_progress!;
    const completedStages = finalProgress.stages.map((s: ReelStageProgress) => s.stage);
    expect(completedStages).toContain("preflight");
    expect(completedStages).toContain("script");
    expect(completedStages).toContain("style");
    expect(completedStages).toContain("cover");
    expect(completedStages).toContain("publishing");
    expect(completedStages).toContain("finalize");
  });

  it("fails individual target when prerequisites are missing without attempting to generate", async () => {
    const f = await createUpgradeFixture();

    // Create a new blank reel with incomplete prerequisites
    const topic = {
      ...f.reel.topic,
      topic_id: "blank-topic",
    };
    const blankReel = await f.repo.createShortReel(f.key.channel_id, topic, repairSource, "create-blank-reel");

    let finishedStatus: string | null = null;
    let finishedError: string | null = null;

    const task = createMockTask({
      channel_id: f.key.channel_id,
      reel_id: blankReel.reel_id,
      short_reel_request: {
        expected_revision: blankReel.revision,
        request_id: "missing-prereq-req",
        target: "cover",
      },
    });

    const runtimeMock: Partial<TaskManagerRuntime> = {
      repository: f.repo,
      activeShortReelControllers: new Map(),
      shortReelTargets: new Map(),
      imageConfig: {} as any,
      activeEngine: "codex",
      get: () => task,
      update: async () => {},
      finish: async (_id, status, error) => {
        finishedStatus = status;
        finishedError = error;
      },
    };

    await runShortReelTask(runtimeMock as TaskManagerRuntime, task);

    expect(finishedStatus).toBe("FAILED");
    expect(finishedError).toContain("required");
    expect(runtimeMock.activeShortReelControllers?.has(task.task_id)).toBe(false);
  });

  it("cleans up active controllers and safely terminates on cancellation", async () => {
    const f = await createUpgradeFixture();
    const abortCtrl = new AbortController();

    const task = createMockTask({
      channel_id: f.key.channel_id,
      reel_id: f.key.reel_id,
      short_reel_request: {
        expected_revision: f.snapshot.revision,
        request_id: "cancel-test-req",
        target: "package",
      },
    });

    // Abort upfront to verify early return
    abortCtrl.abort();

    const runtimeMock: Partial<TaskManagerRuntime> = {
      repository: f.repo,
      activeShortReelControllers: new Map(),
      shortReelTargets: new Map(),
      imageConfig: {} as any,
      activeEngine: "codex",
      get: () => ({ ...task, status: "CANCELLED" }),
      update: async () => {},
      finish: async () => {},
    };

    await runShortReelTask(runtimeMock as TaskManagerRuntime, task);
    expect(runtimeMock.activeShortReelControllers?.has(task.task_id)).toBe(false);
  });
});

describe("Route Replay Equality & Idempotency with Normalized Mode", () => {
  it("returns original task on identical replay, but rejects changed mode with 409 conflict", async () => {
    const root = await createTestRoot();
    const app = await buildTestApp(root);
    // Prevent background runner from executing full generation during route HTTP test
    app.tasks.run = async (t) => {
      await app.tasks.update(t.task_id, { status: "RUNNING" });
    };

    try {
      const { channel, reel } = await createTestReel(app);

      // 1. Initial request with target: 'package', default mode (normalized to 'repair')
      const res1 = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
        payload: {
          expected_revision: reel.revision,
          request_id: "idempotent-replay-id",
          target: "package",
          mode: "repair",
        },
      });

      expect(res1.statusCode).toBe(202);
      const data1 = res1.json<{ task: Task }>();
      const originalTaskId = data1.task.task_id;

      // 2. Exact duplicate replay with same request_id and identical body
      const resDuplicate = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
        payload: {
          expected_revision: reel.revision,
          request_id: "idempotent-replay-id",
          target: "package",
          mode: "repair",
        },
      });

      expect(resDuplicate.statusCode).toBe(202);
      const dataDuplicate = resDuplicate.json<{ task: Task }>();
      expect(dataDuplicate.task.task_id).toBe(originalTaskId);

      // 3. Same request_id but changed mode (mode: 'regenerate' vs 'repair') -> 409 IDEMPOTENCY_CONFLICT
      const resChangedMode = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
        payload: {
          expected_revision: reel.revision,
          request_id: "idempotent-replay-id",
          target: "package",
          mode: "regenerate",
        },
      });

      expect(resChangedMode.statusCode).toBe(409);
      expect(resChangedMode.json()).toMatchObject({
        code: "IDEMPOTENCY_CONFLICT",
      });

      // 4. Same request_id but changed target (target: 'cover' vs 'package') -> 409 IDEMPOTENCY_CONFLICT
      const resChangedTarget = await app.server.inject({
        method: "POST",
        url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/generate`,
        payload: {
          expected_revision: reel.revision,
          request_id: "idempotent-replay-id",
          target: "cover",
        },
      });

      expect(resChangedTarget.statusCode).toBe(409);
      expect(resChangedTarget.json()).toMatchObject({
        code: "IDEMPOTENCY_CONFLICT",
      });
    } finally {
      await app.close();
    }
  });
});
