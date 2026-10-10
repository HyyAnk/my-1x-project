import { describe, expect, it } from "vitest";
import { TaskSchema, type Task } from "@studio/shared";
import { recoverTasksAfterRestart } from "../src/tasks/taskRestartRecovery.js";
import { submitTask } from "../src/tasks/taskSubmission.js";
import { productRefFromTask, taskProductKind } from "../src/tasks/taskProductRef.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

const timestamp = "2026-09-12T12:00:00.000Z";

function task(patch: Partial<Task> = {}): Task {
  return TaskSchema.parse({
    task_id: "pipeline",
    task_type: "GENERATE_PIPELINE",
    channel_id: "channel",
    episode_id: "qshort_abc",
    product_kind: "quiz_short",
    lock_key: "qshort_abc:pipeline",
    status: "RUNNING",
    created_at: timestamp,
    ...patch,
  });
}

function createRuntime(existing: Task[]): TaskManagerRuntime {
  return {
    list: () => existing,
    imageConfig: { enabled: true, images_per_bundle: 1 },
    imageVariants: new Map(),
    topicHints: new Map(),
    repository: { entityIdResolver: { getEpisodeTitle: () => "Ocean giants" } },
  } as unknown as TaskManagerRuntime;
}

describe("task product kind", () => {
  it("defaults to the Episode kind when the field is absent", () => {
    const legacy = TaskSchema.parse({ ...task(), product_kind: undefined });
    expect(taskProductKind(legacy)).toBe("episode");
    expect(productRefFromTask(legacy)).toEqual({ kind: "episode", channel_id: "channel", product_id: "qshort_abc" });
    expect(productRefFromTask(task())).toEqual({ kind: "quiz_short", channel_id: "channel", product_id: "qshort_abc" });
  });

  it("survives restart recovery", () => {
    const [recovered] = recoverTasksAfterRestart([task({ progress_percent: 40 })], timestamp);
    expect(recovered).toMatchObject({ status: "QUEUED", product_kind: "quiz_short", episode_id: "qshort_abc" });
  });

  it("is inherited by children of a Quiz Short pipeline and omitted for Episode tasks", () => {
    const parent = task();
    const runtime = createRuntime([parent]);
    const child = submitTask(
      runtime,
      "GENERATE_VIDEO",
      "channel",
      "qshort_abc",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      parent.task_id,
    );
    expect(child.product_kind).toBe("quiz_short");
    expect(child.episode_title).toBe("Ocean giants");

    const episodeTask = submitTask(runtime, "GENERATE_VIDEO", "channel", "ep_1");
    expect("product_kind" in episodeTask && episodeTask.product_kind).toBeFalsy();

    const explicit = submitTask(
      runtime,
      "GENERATE_THUMBNAIL",
      "channel",
      "qshort_xyz",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "quiz_short",
    );
    expect(explicit.product_kind).toBe("quiz_short");
  });
});
