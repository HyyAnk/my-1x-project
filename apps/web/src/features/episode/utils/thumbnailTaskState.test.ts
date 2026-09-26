import { describe, expect, it } from "vitest";
import { TaskSchema } from "@studio/shared";
import { thumbnailTaskStatus } from "./thumbnailTaskState";
import { resolveStreamlinedStatus } from "./railStatusResolver";
import type { QuizV2State } from "../../../api";
const readiness = { research: false, treatment: false, script: false, visualBible: false, scenes: false, video: false };

function task(status: "QUEUED" | "RUNNING" | "FAILED" | "COMPLETED") {
  return TaskSchema.parse({
    task_id: "thumb",
    task_type: "GENERATE_THUMBNAIL",
    channel_id: "ch",
    episode_id: "ep",
    lock_key: "ep:thumbnail",
    status,
    created_at: new Date().toISOString(),
  });
}

describe("thumbnail task state", () => {
  it("stays pending independently of an existing image", () => {
    expect(thumbnailTaskStatus([task("QUEUED")], true)).toBe("queued");
    expect(thumbnailTaskStatus([task("RUNNING")], true)).toBe("running");
  });
  it("reports failures without a result and only marks ready from persisted image data", () => {
    expect(thumbnailTaskStatus([task("FAILED")], false)).toBe("failed");
    expect(thumbnailTaskStatus([task("COMPLETED")], false)).toBe("not_started");
    expect(thumbnailTaskStatus([task("COMPLETED")], true)).toBe("ready");
  });
  it("does not infer thumbnail completion from the later render stage", () => {
    const pipeline = TaskSchema.parse({
      ...task("RUNNING"),
      task_id: "pipeline",
      task_type: "GENERATE_PIPELINE",
      progress_message: "Video rendering",
    });
    expect(resolveStreamlinedStatus("thumbnail", 3, readiness, {} as QuizV2State, pipeline, [], { key: "render", label: "Video" })).toBe(
      "not_started",
    );
    expect(
      resolveStreamlinedStatus("thumbnail", 3, readiness, {} as QuizV2State, pipeline, [task("RUNNING")], {
        key: "render",
        label: "Video",
      }),
    ).toBe("running");
  });
});
