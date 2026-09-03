import { describe, expect, it } from "vitest";
import type { ProductionItemSummary } from "../types";
import { groupTaskItemsByDate } from "./taskDateGroups";

function item(id: string, timestamp: string): ProductionItemSummary {
  return {
    id,
    channelId: "channel-1",
    channelName: "Channel",
    episodeId: id,
    episodeTitle: id,
    tasks: [],
    activeTask: null,
    latestTask: {} as ProductionItemSummary["latestTask"],
    status: "COMPLETED",
    progressPercent: 100,
    progressMessage: "Completed",
    queuePosition: null,
    error: null,
    startedAt: timestamp,
    completedAt: timestamp,
    accumulatedSeconds: 0,
  };
}

describe("groupTaskItemsByDate", () => {
  it("orders date groups and their cards from newest to oldest", () => {
    const now = new Date("2026-09-03T12:00:00").getTime();
    const groups = groupTaskItemsByDate(
      [
        item("today-early", "2026-09-03T08:00:00"),
        item("older", "2026-09-01T18:00:00"),
        item("yesterday", "2026-09-02T18:00:00"),
        item("today-late", "2026-09-03T10:00:00"),
      ],
      now,
      "en-US",
    );

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "Sep 1, 2026"]);
    expect(groups[0].items.map((entry) => entry.id)).toEqual(["today-late", "today-early"]);
  });

  it("uses started time when a task has no completion time", () => {
    const now = new Date("2026-09-03T12:00:00").getTime();
    const groups = groupTaskItemsByDate([item("running", "2026-09-03T09:00:00")], now, "en-US");

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("2026-09-03");
  });
});
