import { describe, expect, it } from "vitest";
import { isOlderBatchSnapshot } from "./mascotSlotQueueHelpers";

describe("mascotSlotQueueHelpers", () => {
  it("identifies an older server snapshot using parsed timestamps", () => {
    expect(isOlderBatchSnapshot("2026-09-21T04:00:00.000Z", "2026-09-21T04:00:01.000Z")).toBe(true);
    expect(isOlderBatchSnapshot("2026-09-21T04:00:02.000Z", "2026-09-21T04:00:01.000Z")).toBe(false);
  });

  it("accepts a snapshot when there is no prior server timestamp", () => {
    expect(isOlderBatchSnapshot("2026-09-21T04:00:00.000Z", null)).toBe(false);
  });

  it("uses deterministic ordering when a provider returns non-date version strings", () => {
    expect(isOlderBatchSnapshot("revision-01", "revision-02")).toBe(true);
    expect(isOlderBatchSnapshot("revision-03", "revision-02")).toBe(false);
  });
});
