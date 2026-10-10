import { describe, expect, it } from "vitest";
import { createCoalescingRunner } from "../src/utils/concurrency.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createCoalescingRunner", () => {
  it("runs at most one active and one queued task per key, sharing the queued result", async () => {
    const run = createCoalescingRunner<number>();
    const gates = [deferred<number>(), deferred<number>()];
    let starts = 0;
    const task = () => gates[starts++].promise;

    const first = run("channel", task);
    const second = run("channel", task);
    const third = run("channel", task);
    expect(starts).toBe(1);
    expect(third).toBe(second);

    gates[0].resolve(1);
    await expect(first).resolves.toBe(1);

    gates[1].resolve(2);
    await expect(second).resolves.toBe(2);
    await expect(third).resolves.toBe(2);
    expect(starts).toBe(2);
  });

  it("keeps keys independent and starts a queued run even when the active run fails", async () => {
    const run = createCoalescingRunner<string>();
    const failing = deferred<string>();
    const first = run("a", () => failing.promise);
    const queued = run("a", async () => "fresh");
    const other = run("b", async () => "other");

    await expect(other).resolves.toBe("other");
    failing.reject(new Error("boom"));
    await expect(first).rejects.toThrow("boom");
    await expect(queued).resolves.toBe("fresh");
    await expect(run("a", async () => "again")).resolves.toBe("again");
  });
});
