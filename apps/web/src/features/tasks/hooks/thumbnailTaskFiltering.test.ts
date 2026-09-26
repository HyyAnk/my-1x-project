import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskSchema } from "@studio/shared";
import { useTaskFiltering } from "./useTaskFiltering";

describe("thumbnail task grouping", () => {
  it("keeps thumbnail failure and retry separate from completed video production", () => {
    const common = { channel_id: "ch", episode_id: "ep", lock_key: "ep", created_at: new Date().toISOString() };
    const video = TaskSchema.parse({ ...common, task_id: "video", task_type: "GENERATE_VIDEO", status: "COMPLETED" });
    const thumbnail = TaskSchema.parse({ ...common, task_id: "thumb", task_type: "GENERATE_THUMBNAIL", status: "FAILED" });
    const { result } = renderHook(() =>
      useTaskFiltering({
        tasks: [video, thumbnail],
        dismissedTaskIds: new Set(),
        channelMap: new Map(),
        episodeTitleMap: new Map(),
        statusFilter: "all",
        channelFilter: "all",
        searchQuery: "",
        now: Date.now(),
      }),
    );
    expect(result.current.productionItems).toHaveLength(2);
    expect(result.current.productionItems.find((item) => item.id === "ep-ep")?.status).toBe("COMPLETED");
    expect(result.current.productionItems.find((item) => item.id === "ep-ep:thumbnail")?.latestTask).toBe(thumbnail);
  });
});
