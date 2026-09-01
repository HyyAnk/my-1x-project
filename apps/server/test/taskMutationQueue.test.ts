import { describe, expect, it } from "vitest";
import { TaskMutationQueue } from "../src/tasks/taskMutationQueue.js";

describe("TaskMutationQueue", () => {
  it("serializes mutations for one task while allowing other tasks to proceed", async () => {
    const queue = new TaskMutationQueue();
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue("task-1", async () => {
      order.push("first:start");
      await firstGate;
      order.push("first:end");
    });
    const second = queue.enqueue("task-1", () => {
      order.push("second");
      return Promise.resolve();
    });
    const independent = queue.enqueue("task-2", () => {
      order.push("independent");
      return Promise.resolve();
    });

    await independent;
    expect(order).toEqual(["first:start", "independent"]);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "independent", "first:end", "second"]);
  });

  it("continues the queue after a failed mutation", async () => {
    const queue = new TaskMutationQueue();
    const failed = queue.enqueue("task-1", () => Promise.reject(new Error("disk unavailable")));
    const recovered = queue.enqueue("task-1", () => Promise.resolve("persisted"));

    await expect(failed).rejects.toThrow("disk unavailable");
    await expect(recovered).resolves.toBe("persisted");
  });
});
