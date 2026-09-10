import { describe, expect, it } from "vitest";
import { runConcurrent } from "../src/utils/concurrency.js";

describe("runConcurrent worker pool", () => {
  it("processes items concurrently and preserves order", async () => {
    const items = [20, 4, 12, 8, 16];
    const startedOrder: number[] = [];
    const completedOrder: number[] = [];

    const results = await runConcurrent(items, 3, async (ms, index) => {
      startedOrder.push(index);
      await new Promise((resolve) => setTimeout(resolve, ms));
      completedOrder.push(index);
      return `result-${index}-${ms}`;
    });

    expect(results).toEqual(["result-0-20", "result-1-4", "result-2-12", "result-3-8", "result-4-16"]);
    expect(startedOrder.slice(0, 3)).toEqual([0, 1, 2]);
    expect(completedOrder[0]).toBe(1); // 4ms finished first
  });

  it("handles empty items gracefully", async () => {
    const results = await runConcurrent([], 4, async () => "value");
    expect(results).toEqual([]);
  });

  it("handles single item or concurrency greater than items", async () => {
    const results = await runConcurrent([1, 2], 10, async (item) => item * 2);
    expect(results).toEqual([2, 4]);
  });
});
