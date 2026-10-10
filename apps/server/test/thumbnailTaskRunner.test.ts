import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task, TaskStatus } from "@studio/shared";
import { readQuizShortCoverManifest } from "../src/quiz/thumbnail/quizShortCoverManifest.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";
import { runThumbnailTask } from "../src/tasks/thumbnail/thumbnailTaskRunner.js";
import {
  createQuizShortMetadataFixture,
  failingCoverClient,
  fakeCoverClient,
  portraitPng,
  type QuizShortMetadataFixture,
} from "./fixtures/quizShortMetadataFixture.js";

const fixtures: QuizShortMetadataFixture[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.cleanup()));
});

function buildThumbnailTask(fixture: QuizShortMetadataFixture): Task {
  const now = new Date().toISOString();
  return {
    task_id: "task-quiz-short-thumbnail",
    task_type: "GENERATE_THUMBNAIL",
    channel_id: fixture.channelId,
    episode_id: fixture.quizShortId,
    product_kind: "quiz_short",
    status: "QUEUED",
    created_at: now,
    started_at: null,
    completed_at: null,
    codex_thread_id: null,
    codex_turn_id: null,
    error: null,
    output_files: [],
    lock_key: fixture.quizShortId,
    queue_position: null,
    progress_message: null,
    scene_number: null,
  };
}

type RuntimeStub = TaskManagerRuntime & { finished: { status: TaskStatus; error: string | null; outputs: string[] }[] };

/** The slice of the task runtime the thumbnail runner touches, with a controllable portrait client. */
function buildRuntime(
  fixture: QuizShortMetadataFixture,
  task: Task,
  portraitImageClient: TaskManagerRuntime["portraitImageClient"],
): RuntimeStub {
  const tasks = new Map<string, Task>([[task.task_id, task]]);
  const logger = { info: vi.fn(), ok: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const runtime = {
    repository: fixture.repository,
    logger,
    activeEngine: "codex",
    codex: { connect: vi.fn(async () => undefined) },
    antigravity: undefined,
    portraitImageClient,
    imageConfig: undefined,
    imageFallbackConfig: undefined,
    activeImageControllers: new Map<string, AbortController>(),
    finished: [] as RuntimeStub["finished"],
    get: (taskId: string) => tasks.get(taskId)!,
    update: vi.fn(async (taskId: string, patch: Partial<Task>) => {
      tasks.set(taskId, { ...tasks.get(taskId)!, ...patch });
    }),
    finish: vi.fn(async (taskId: string, status: TaskStatus, error: string | null, outputs: string[] = []) => {
      tasks.set(taskId, { ...tasks.get(taskId)!, status, error, output_files: outputs });
      runtime.finished.push({ status, error, outputs });
    }),
  };
  return runtime as unknown as RuntimeStub;
}

describe("thumbnail task runner for Quiz Shorts", () => {
  it("generates the cover through the portrait client and completes with the cover path", async () => {
    const fixture = await createQuizShortMetadataFixture();
    fixtures.push(fixture);
    const task = buildThumbnailTask(fixture);
    const client = fakeCoverClient(await portraitPng("blue"));
    const runtime = buildRuntime(fixture, task, client);

    await runThumbnailTask(runtime, task);

    expect(client.generate).toHaveBeenCalledTimes(1);
    const manifest = await readQuizShortCoverManifest(fixture.repository, fixture.channelId, fixture.quizShortId);
    expect(manifest?.asset_path).toContain("/assets/cover.png");
    expect(runtime.finished).toEqual([{ status: "COMPLETED", error: null, outputs: [manifest!.asset_path] }]);
    expect((await fixture.repository.getQuizShort(fixture.channelId, fixture.quizShortId)).thumbnail_asset_path_9_16).toBe(
      manifest!.asset_path,
    );
    const timings = await fixture.repository.readQuizStageTimings(fixture.channelId, fixture.ref);
    expect(timings?.stages?.thumbnail?.completed_at).toBeTruthy();
    expect(runtime.activeImageControllers.size).toBe(0);
  });

  it("fails the task with a retry hint when the portrait provider fails", async () => {
    const fixture = await createQuizShortMetadataFixture();
    fixtures.push(fixture);
    const task = buildThumbnailTask(fixture);
    const runtime = buildRuntime(fixture, task, failingCoverClient("Provider unavailable"));

    await runThumbnailTask(runtime, task);

    expect(runtime.finished).toHaveLength(1);
    expect(runtime.finished[0].status).toBe("FAILED");
    expect(runtime.finished[0].error).toContain("Provider unavailable");
    expect(runtime.finished[0].error).toContain("Retry thumbnail generation");
    expect((await fixture.repository.getQuizShort(fixture.channelId, fixture.quizShortId)).thumbnail_asset_path_9_16).toBeNull();
  });
});
